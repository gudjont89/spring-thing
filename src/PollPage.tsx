import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { FirestoreError } from 'firebase/firestore'
import { ensureSignedIn } from './firebase'
import { castVote, fetchVotes, pollUrl, tally, watchPoll, watchVote, type Book, type Poll, type Votes } from './polls'
import { SharePanel } from './SharePanel'
import { BarChart } from './BarChart'
import { Button, Sketch } from './Sketch'

// How often, and how many times, to ask for results that the server says are not available yet.
const RESULTS_RETRY_MS = 2000
const RESULTS_MAX_RETRIES = 10

// The results replay the ballots in the order they were cast, the first counted at REPLAY_START_MS and the last at
// REPLAY_END_MS, with the ones in between keeping their relative spacing.
const REPLAY_START_MS = 1000
const REPLAY_END_MS = 13_000

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
        <h1>{closed ? 'Results' : 'Which book should we read next?'}</h1>
        {closed ? (
          <p className="badge">Voting has ended.</p>
        ) : (
          <p className="badge">Voting ends in {formatRemaining(poll.closesAt.getTime() - now)}.</p>
        )}

        {!closed && (
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

        {!closed && myVote !== undefined && (
          <p className="muted">Thanks for voting. Results will be shown when voting ends.</p>
        )}

        {error && <p className="error">{error}</p>}

        {closed && (results ? <Results poll={poll} votes={results} myVote={myVote} /> : !error && <p>Counting votes…</p>)}
      </section>

      {!closed && <SharePanel url={pollUrl(pollId)} />}

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

export function Results({ poll, votes, myVote }: { poll: Poll; votes: Votes; myVote: number[] | undefined }) {
  const ballots = useMemo(
    () => [...votes.values()].sort((a, b) => a.votedAt.getTime() - b.votedAt.getTime()),
    [votes],
  )
  // How many ballots the replay has counted so far. Skip the replay for people who prefer less motion.
  const [replayed, setReplayed] = useState(() =>
    matchMedia('(prefers-reduced-motion: reduce)').matches ? ballots.length : 0,
  )

  useEffect(() => {
    if (ballots.length === 0) return
    const first = ballots[0].votedAt.getTime()
    const span = ballots[ballots.length - 1].votedAt.getTime() - first
    const timers = ballots.map((ballot, index) =>
      setTimeout(
        () => setReplayed((count) => Math.max(count, index + 1)),
        REPLAY_START_MS + (span ? ((ballot.votedAt.getTime() - first) / span) * (REPLAY_END_MS - REPLAY_START_MS) : 0),
      ),
    )
    return () => timers.forEach(clearTimeout)
  }, [ballots])

  const counts = tally(ballots.slice(0, replayed), poll.books.length)
  // Bars are scaled so the winner's final bar spans the full width; the others grow towards their share of it.
  const maxCount = Math.max(...tally(ballots, poll.books.length))

  return (
    <BarChart
      max={maxCount}
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
  )
}
