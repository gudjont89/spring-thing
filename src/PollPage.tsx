import { useEffect, useState, type FormEvent } from 'react'
import { ensureSignedIn } from './firebase'
import { castVote, closePoll, pollUrl, tally, watchPoll, watchVotes, type Book, type Poll, type Votes } from './polls'
import { SharePanel } from './SharePanel'

export function PollPage({ pollId }: { pollId: string }) {
  // undefined while loading, null if the poll does not exist
  const [poll, setPoll] = useState<Poll | null | undefined>(undefined)
  const [votes, setVotes] = useState<Votes>(new Map())
  const [uid, setUid] = useState<string | null>(null)
  // null until the voter changes their picks; their saved vote applies until then
  const [selected, setSelected] = useState<number[] | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ensureSignedIn().then(
      (user) => setUid(user.uid),
      (err: Error) => setError(err.message),
    )
  }, [])

  useEffect(() => {
    const onError = (err: Error) => setError(err.message)
    const stopPoll = watchPoll(pollId, setPoll, onError)
    const stopVotes = watchVotes(pollId, setVotes, onError)
    return () => {
      stopPoll()
      stopVotes()
    }
  }, [pollId])

  if (poll === undefined) {
    return <p className="card">{error ? `Could not load the poll: ${error}` : 'Loading…'}</p>
  }
  if (poll === null) {
    return (
      <div className="card">
        <h1>Poll not found</h1>
        <p>
          Check the link, or <a href="#/">create a new poll</a>.
        </p>
      </div>
    )
  }

  const myVote = uid ? votes.get(uid) : undefined
  const isOwner = uid === poll.ownerId
  const choice = selected ?? myVote ?? []
  const choiceUnchanged = myVote !== undefined && sameBooks(choice, myVote)
  const showResults = myVote !== undefined || poll.closed || isOwner

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
      <section className="card">
        <h1>Which book should we read next?</h1>
        {poll.closed && <p className="badge">This poll is closed.</p>}

        {!poll.closed && (
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
                  <label className="choice" key={index}>
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
            <button type="submit" disabled={choice.length === 0 || choiceUnchanged || submitting || !uid}>
              {submitting ? 'Voting…' : myVote === undefined ? 'Vote' : 'Change vote'}
            </button>
          </form>
        )}

        {error && <p className="error">{error}</p>}

        {showResults && <Results poll={poll} votes={votes} myVote={myVote} />}

        {isOwner && !poll.closed && (
          <button type="button" className="ghost" onClick={() => closePoll(pollId).catch((err: Error) => setError(err.message))}>
            Close poll
          </button>
        )}
      </section>

      {!poll.closed && <SharePanel url={pollUrl(pollId)} />}

      <p>
        <a href="#/">Create your own poll</a>
      </p>
    </>
  )
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

function Results({ poll, votes, myVote }: { poll: Poll; votes: Votes; myVote: number[] | undefined }) {
  const counts = tally(votes, poll.books.length)
  const voterCount = votes.size
  const total = counts.reduce((sum, count) => sum + count, 0)

  return (
    <div className="results">
      <h2>
        Results{' '}
        <span className="muted">
          ({voterCount} {voterCount === 1 ? 'voter' : 'voters'}, {total} {total === 1 ? 'vote' : 'votes'})
        </span>
      </h2>
      {poll.books.map((book, index) => {
        // Share of voters who picked this book; with several votes each, these add up to more than 100%.
        const percent = voterCount ? Math.round((counts[index] / voterCount) * 100) : 0
        return (
          <div className="result" key={index}>
            <div className="result-label">
              <span>
                <BookLabel book={book} />
                {myVote?.includes(index) && <span className="muted"> · your vote</span>}
              </span>
              <span>
                {counts[index]} ({percent}%)
              </span>
            </div>
            <div className="bar">
              <div className="bar-fill" style={{ width: `${percent}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
