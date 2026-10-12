import { useState, type FormEvent } from 'react'
import {
  createPoll,
  MAX_AUTHOR_LENGTH,
  MAX_BOOKS,
  MAX_TITLE_LENGTH,
  MIN_BOOKS,
  type Book,
} from './polls'

const emptyBook = { title: '', author: '' }

export function CreatePoll() {
  const [books, setBooks] = useState([emptyBook, emptyBook])
  const [votesPerVoter, setVotesPerVoter] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filledBooks: Book[] = books
    .map((book) => ({ title: book.title.trim(), author: book.author.trim() || null }))
    .filter((book) => book.title !== '')
  const bookKeys = filledBooks.map((book) => `${book.title}\n${book.author ?? ''}`.toLowerCase())
  const hasDuplicates = new Set(bookKeys).size !== bookKeys.length
  // Voting for every book would say nothing, so voters must leave at least one out.
  const maxVotesPerVoter = Math.max(1, filledBooks.length - 1)
  const votesPerVoterValid = Number.isInteger(votesPerVoter) && votesPerVoter >= 1 && votesPerVoter <= maxVotesPerVoter
  const canSubmit = filledBooks.length >= MIN_BOOKS && !hasDuplicates && votesPerVoterValid && !submitting

  function setBook(index: number, field: keyof typeof emptyBook, value: string) {
    setBooks(books.map((book, i) => (i === index ? { ...book, [field]: value } : book)))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const pollId = await createPoll(filledBooks, votesPerVoter)
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

      <label className="field">
        <span>Votes per person</span>
        <input
          type="number"
          className="narrow"
          value={Number.isNaN(votesPerVoter) ? '' : votesPerVoter}
          onChange={(event) => setVotesPerVoter(event.target.valueAsNumber)}
          min={1}
          max={maxVotesPerVoter}
          step={1}
        />
      </label>

      {hasDuplicates && <p className="error">Each book can only be listed once.</p>}
      {!votesPerVoterValid && (
        <p className="error">
          Votes per person must be a whole number from 1 to {maxVotesPerVoter}, so that it is fewer than the number of
          books.
        </p>
      )}
      {error && <p className="error">Could not create the poll: {error}</p>}

      <button type="submit" disabled={!canSubmit}>
        {submitting ? 'Creating…' : 'Create poll'}
      </button>
    </form>
  )
}
