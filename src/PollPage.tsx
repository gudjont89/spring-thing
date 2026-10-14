import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import type { FirestoreError } from 'firebase/firestore'
import { ensureSignedIn } from './firebase'
import { castVote, fetchVotes, pollUrl, tally, watchPoll, watchVote, type Book, type Poll, type Votes } from './polls'
import { QrCode, SharePanel } from './SharePanel'
import { Avatars } from './Avatars'
import { BarChart, GROWTH_MS } from './BarChart'
import { Button, Sketch } from './Sketch'

// How often, and how many times, to ask for results that the server says are not available yet.
const RESULTS_RETRY_MS = 2000
const RESULTS_MAX_RETRIES = 10

// The results replay the ballots in the order they were cast, keeping their relative spacing: the first is counted at
// REPLAY_START_MS, and the last REPLAY_SPACING_MS per ballot after it, i.e. 2(n - 1) seconds for n ballots.
const REPLAY_START_MS = 1000
const REPLAY_SPACING_MS = 2000

export function PollPage({ pollId }: { pollId: string }) {
  // undefined while loading, null if the poll does not exist
  const [poll, setPoll] = useState<Poll | null | undefined>(undefined)
  const [uid, setUid] = useState<string | null>(null)
  // undefined until this browser has voted
  const [myVote, setMyVote] = useState<number[] | undefined>(undefined)
  // null until the poll closes and the ballots have been read
  const [results, setResults] = useState<Votes | null>(null)
  const [now, setNow] = useState(() => Date.now())
  // null until the voter changes their picks; their saved vote applies until then
  const [selected, setSelected] = useState<number[] | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const closed = poll ? now >= poll.closesAt.getTime() : false

  useEffect(() => {
    ensureSignedIn().then(
      (user) => setUid(user.uid),
      (err: Error) => setError(err.message),
    )
  }, [])

  useEffect(() => watchPoll(pollId, setPoll, (err) => setError(err.message)), [pollId])

  useEffect(() => {
    if (!uid) return
    return watchVote(pollId, uid, setMyVote, (err) => setError(err.message))
  }, [pollId, uid])

  // Tick once a second for the countdown, until voting ends.
  useEffect(() => {
    if (!poll || closed) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [poll, closed])

  // Read the ballots once when voting ends; they cannot change after that.
  useEffect(() => {
    if (!closed) return
    let cancelled = false
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    let retries = 0
    const load = () => {
      fetchVotes(pollId).then(
        (votes) => {
          if (!cancelled) setResults(votes)
        },
        (err: FirestoreError) => {
          if (cancelled) return
          // This browser's clock may run ahead of the server's, so the server can refuse
          // for a few seconds after the countdown ends.
          if (err.code === 'permission-denied' && retries < RESULTS_MAX_RETRIES) {
            retries++
            retryTimer = setTimeout(load, RESULTS_RETRY_MS)
          } else {
            setError(err.message)
          }
        },
      )
    }
    load()
    return () => {
      cancelled = true
      clearTimeout(retryTimer)
    }
  }, [pollId, closed])

  if (poll === undefined) {
    return (
      <p className="card sketched">
        <Sketch />
        {error ? `Could not load the poll: ${error}` : 'Loading…'}
      </p>
    )
  }
  if (poll === null) {
    return (
      <div className="card sketched">
        <Sketch />
        <h1>Poll not found</h1>
        <p>
          Check the link, or <a href="#/">create a new poll</a>.
        </p>
      </div>
    )
  }

  const isCreator = uid === poll.ownerId
  const choice = selected ?? myVote ?? []
  const choiceUnchanged = myVote !== undefined && sameBooks(choice, myVote)

  function toggle(index: number) {
    setSelected(choice.includes(index) ? choice.filter((book) => book !== index) : [...choice, index])
  }

  async function handleVote(event: FormEvent) {
    event.preventDefault()
    if (choice.length === 0) return
    setSubmitting(true)
    setError(null)
    try {
      await castVote(pollId, choice)
      setSelected(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <section className="card sketched">
        <Sketch />
        {closed ? (
          <Results poll={poll} votes={results} myVote={myVote}>
            <p className="badge">{results || error ? 'Voting has ended.' : 'Counting votes…'}</p>
          </Results>
        ) : (
          <>
            <h1>Which book should we read next?</h1>
            <p className="badge">Voting ends in {formatRemaining(poll.closesAt.getTime() - now)}.</p>
          </>
        )}

        {!closed && isCreator && <QrCode url={pollUrl(pollId)} />}

        {!closed && !isCreator && (
          <form onSubmit={handleVote}>
            <fieldset className="field">
              <legend>
                {poll.votesPerVoter === 1 ? 'Pick one book.' : `Pick up to ${poll.votesPerVoter} books.`}{' '}
                <span className="muted">
                  ({choice.length} of {poll.votesPerVoter} chosen)
                </span>
              </legend>
              {poll.books.map((book, index) => {
                const checked = choice.includes(index)
                return (
                  <label className="choice sketched" key={index}>
                    <Sketch fill="hachure" />
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!checked && choice.length >= poll.votesPerVoter}
                      onChange={() => toggle(index)}
                    />
                    <BookLabel book={book} />
                  </label>
                )
              })}
            </fieldset>
            <Button type="submit" disabled={choice.length === 0 || choiceUnchanged || submitting || !uid}>
              {submitting ? 'Voting…' : myVote === undefined ? 'Vote' : 'Change vote'}
            </Button>
          </form>
        )}

        {!closed && !isCreator && myVote !== undefined && (
          <p className="muted">Thanks for voting. Results will be shown when voting ends.</p>
        )}

        {error && <p className="error">{error}</p>}
      </section>

      {!closed && !isCreator && <SharePanel url={pollUrl(pollId)} />}

      <p>
        <a href="#/">Create your own poll</a>
      </p>
    </>
  )
}

function formatRemaining(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function sameBooks(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((book) => b.includes(book))
}

function BookLabel({ book }: { book: Book }) {
  return (
    <span className="book">
      {book.title}
      {book.author && <span className="muted"> by {book.author}</span>}
    </span>
  )
}

// The results heading, with avatars of the voters whose ballots are being drawn, then `children`, then the bars.
// While `votes` is null the bars are empty, so the layout keeps its size when the ballots arrive.
export function Results({
  poll,
  votes,
  myVote,
  children,
}: {
  poll: Poll
  votes: Votes | null
  myVote: number[] | undefined
  children?: ReactNode
}) {
  const ballots = useMemo(
    () => [...(votes ?? [])].sort(([, a], [, b]) => a.votedAt.getTime() - b.votedAt.getTime()),
    [votes],
  )
  // How many ballots the replay has started counting, and how many of those have finished drawing. Every ballot
  // takes GROWTH_MS to draw, so they finish in the order they started. Skip the replay for people who prefer less
  // motion.
  const startReplay = () => {
    const skip = matchMedia('(prefers-reduced-motion: reduce)').matches ? ballots.length : 0
    return { started: skip, finished: skip }
  }
  const [replay, setReplay] = useState(startReplay)
  // Start over when the ballots arrive.
  const [replayedBallots, setReplayedBallots] = useState(ballots)
  if (replayedBallots !== ballots) {
    setReplayedBallots(ballots)
    setReplay(startReplay())
  }

  useEffect(() => {
    if (ballots.length === 0) return
    const first = ballots[0][1].votedAt.getTime()
    const span = ballots[ballots.length - 1][1].votedAt.getTime() - first
    const replaySpan = (ballots.length - 1) * REPLAY_SPACING_MS
    const timers = ballots.flatMap(([, ballot], index) => {
      const at =
        REPLAY_START_MS + (span ? ((ballot.votedAt.getTime() - first) / span) * replaySpan : 0)
      return [
        setTimeout(() => setReplay((replay) => ({ ...replay, started: Math.max(replay.started, index + 1) })), at),
        setTimeout(
          () => setReplay((replay) => ({ ...replay, finished: Math.max(replay.finished, index + 1) })),
          at + GROWTH_MS,
        ),
      ]
    })
    return () => timers.forEach(clearTimeout)
  }, [ballots])

  const counts = tally(
    ballots.slice(0, replay.started).map(([, ballot]) => ballot),
    poll.books.length,
  )
  // Bars are scaled so the winner's final bar spans the full width; the others grow towards their share of it.
  const maxCount = Math.max(...tally(ballots.map(([, ballot]) => ballot), poll.books.length))
  const drawing = ballots.slice(replay.finished, replay.started)

  return (
    <>
      <div className="results-heading">
        <h1>Results</h1>
        <Avatars
          voters={drawing.map(([uid, ballot]) => ({ id: uid, name: ballot.name }))}
        />
      </div>
      {children}
      <BarChart
        max={maxCount}
        // The counts only show once every ballot has been drawn.
        showValues={votes !== null && replay.finished === ballots.length}
        bars={poll.books.map((book, index) => ({
          label: (
            <>
              {book.title}
              {myVote?.includes(index) && <span className="muted"> · your vote</span>}
            </>
          ),
          value: counts[index],
        }))}
      />
    </>
  )
}
