import { useState, type FormEvent } from 'react'
import {
  createPoll,
  MAX_OPTION_LENGTH,
  MAX_OPTIONS,
  MAX_QUESTION_LENGTH,
  MIN_OPTIONS,
} from './polls'

export function CreatePoll() {
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filledOptions = options.map((option) => option.trim()).filter(Boolean)
  const hasDuplicates = new Set(filledOptions).size !== filledOptions.length
  const canSubmit =
    question.trim() !== '' && filledOptions.length >= MIN_OPTIONS && !hasDuplicates && !submitting

  function setOption(index: number, value: string) {
    setOptions(options.map((option, i) => (i === index ? value : option)))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const pollId = await createPoll(question.trim(), filledOptions)
      location.hash = `#/p/${pollId}`
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setSubmitting(false)
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h1>Create a poll</h1>

      <label className="field">
        <span>Question</span>
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={MAX_QUESTION_LENGTH}
          placeholder="Where should we go for lunch?"
          autoFocus
        />
      </label>

      <fieldset className="field">
        <legend>Options</legend>
        {options.map((option, index) => (
          <div className="option-row" key={index}>
            <input
              value={option}
              onChange={(event) => setOption(index, event.target.value)}
              maxLength={MAX_OPTION_LENGTH}
              placeholder={`Option ${index + 1}`}
              aria-label={`Option ${index + 1}`}
            />
            {options.length > MIN_OPTIONS && (
              <button
                type="button"
                className="ghost"
                onClick={() => setOptions(options.filter((_, i) => i !== index))}
                aria-label={`Remove option ${index + 1}`}
              >
                ✕
              </button>
            )}
          </div>
        ))}
        {options.length < MAX_OPTIONS && (
          <button type="button" className="ghost" onClick={() => setOptions([...options, ''])}>
            + Add option
          </button>
        )}
      </fieldset>

      {hasDuplicates && <p className="error">Options must be different from each other.</p>}
      {error && <p className="error">Could not create the poll: {error}</p>}

      <button type="submit" disabled={!canSubmit}>
        {submitting ? 'Creating…' : 'Create poll'}
      </button>
    </form>
  )
}
