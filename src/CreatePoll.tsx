import { useId, useState, type FormEvent } from 'react'
import {
  createPoll,
  DEFAULT_DURATION_MINUTES,
  MAX_AUTHOR_LENGTH,
  MAX_BOOKS,
  MAX_DURATION_MINUTES,
  MAX_TITLE_LENGTH,
  MIN_BOOKS,
  MIN_DURATION_MINUTES,
  type Book,
} from './polls'

const emptyBook = { title: '', author: '' }

interface StepperProps {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  format?: (value: number) => string
}

function Stepper({ label, value, min, max, onChange, format = String }: StepperProps) {
  const labelId = useId()
  return (
    <div className="field" role="group" aria-labelledby={labelId}>
      <span id={labelId}>{label}</span>
      <div className="stepper">
        <button
          type="button"
          className="ghost"
          onClick={() => onChange(value - 1)}
          disabled={value <= min}
          aria-label={`Decrease ${label.toLowerCase()}`}
        >
          −
        </button>
        <output aria-live="polite">{format(value)}</output>
        <button
          type="button"
          className="ghost"
          onClick={() => onChange(value + 1)}
          disabled={value >= max}
          aria-label={`Increase ${label.toLowerCase()}`}
        >
          +
        </button>
      </div>
    </div>
  )
}

export function CreatePoll() {
  const [books, setBooks] = useState([emptyBook, emptyBook])
  const [requestedVotes, setRequestedVotes] = useState(1)
  const [durationMinutes, setDurationMinutes] = useState(DEFAULT_DURATION_MINUTES)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filledBooks: Book[] = books
    .map((book) => ({ title: book.title.trim(), author: book.author.trim() || null }))
    .filter((book) => book.title !== '')
  const bookKeys = filledBooks.map((book) => `${book.title}\n${book.author ?? ''}`.toLowerCase())
  const hasDuplicates = new Set(bookKeys).size !== bookKeys.length
  // Voting for every book would say nothing, so voters must leave at least one out.
  const maxVotesPerVoter = Math.max(1, filledBooks.length - 1)
  // Removing books can lower the maximum below what was chosen, so clamp rather than invalidate.
  const votesPerVoter = Math.min(requestedVotes, maxVotesPerVoter)
  const canSubmit = filledBooks.length >= MIN_BOOKS && !hasDuplicates && !submitting

  function setBook(index: number, field: keyof typeof emptyBook, value: string) {
    setBooks(books.map((book, i) => (i === index ? { ...book, [field]: value } : book)))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const pollId = await createPoll(filledBooks, votesPerVoter, durationMinutes)
      location.hash = `#/p/${pollId}`
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setSubmitting(false)
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h1>Pick the next book</h1>

      <fieldset className="field">
        <legend>Books</legend>
        {books.map((book, index) => (
          <div className="option-row" key={index}>
            <input
              value={book.title}
              onChange={(event) => setBook(index, 'title', event.target.value)}
              maxLength={MAX_TITLE_LENGTH}
              placeholder={`Title ${index + 1}`}
              aria-label={`Title of book ${index + 1}`}
              autoFocus={index === 0}
            />
            <input
              value={book.author}
              onChange={(event) => setBook(index, 'author', event.target.value)}
              maxLength={MAX_AUTHOR_LENGTH}
              placeholder="Author (optional)"
              aria-label={`Author of book ${index + 1}`}
            />
            {books.length > MIN_BOOKS && (
              <button
                type="button"
                className="ghost"
                onClick={() => setBooks(books.filter((_, i) => i !== index))}
                aria-label={`Remove book ${index + 1}`}
              >
                ✕
              </button>
            )}
          </div>
        ))}
        {books.length < MAX_BOOKS && (
          <button type="button" className="ghost" onClick={() => setBooks([...books, emptyBook])}>
            + Add book
          </button>
        )}
      </fieldset>

      <Stepper
        label="Votes per person"
        value={votesPerVoter}
        min={1}
        max={maxVotesPerVoter}
        onChange={setRequestedVotes}
      />

      <Stepper
        label="Voting time"
        value={durationMinutes}
        min={MIN_DURATION_MINUTES}
        max={MAX_DURATION_MINUTES}
        onChange={setDurationMinutes}
        format={(minutes) => `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`}
      />

      {hasDuplicates && <p className="error">Each book can only be listed once.</p>}
      {error && <p className="error">Could not create the poll: {error}</p>}

      <button type="submit" disabled={!canSubmit}>
        {submitting ? 'Creating…' : 'Create poll'}
      </button>
    </form>
  )
}
