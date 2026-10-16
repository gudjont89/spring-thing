import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import {
  createPoll,
  DEFAULT_DURATION_MINUTES,
  MAX_DURATION_MINUTES,
  MAX_OPTION_LENGTH,
  MAX_OPTIONS,
  MAX_QUESTION_LENGTH,
  MIN_DURATION_MINUTES,
  MIN_OPTIONS,
} from './polls'
import { Button, Sketch, TextInput } from './Sketch'

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
    <div className="field stepper-field" role="group" aria-labelledby={labelId}>
      <span id={labelId}>{label}</span>
      <div className="stepper">
        <Button
          type="button"
          ghost
          icon="minus"
          onClick={() => onChange(value - 1)}
          disabled={value <= min}
          aria-label={`Decrease ${label.toLowerCase()}`}
        />
        <output aria-live="polite">{format(value)}</output>
        <Button
          type="button"
          ghost
          icon="plus"
          onClick={() => onChange(value + 1)}
          disabled={value >= max}
          aria-label={`Increase ${label.toLowerCase()}`}
        />
      </div>
    </div>
  )
}

export function CreatePoll() {
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState([''])
  const [requestedVotes, setRequestedVotes] = useState(1)
  const [durationMinutes, setDurationMinutes] = useState(DEFAULT_DURATION_MINUTES)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const optionInputs = useRef<(HTMLInputElement | null)[]>([])
  const focusLastOption = useRef(false)

  useEffect(() => {
    if (focusLastOption.current) {
      optionInputs.current[options.length - 1]?.focus()
      focusLastOption.current = false
    }
  }, [options])

  const filledOptions = options.map((option) => option.trim()).filter((option) => option !== '')
  const lowercaseOptions = filledOptions.map((option) => option.toLowerCase())
  const hasDuplicates = new Set(lowercaseOptions).size !== lowercaseOptions.length
  // Voting for every option would say nothing, so voters must leave at least one out.
  const maxVotesPerVoter = Math.max(1, filledOptions.length - 1)
  // Removing options can lower the maximum below what was chosen, so clamp rather than invalidate.
  const votesPerVoter = Math.min(requestedVotes, maxVotesPerVoter)
  const canSubmit = filledOptions.length >= MIN_OPTIONS && !hasDuplicates && !submitting

  function setOption(index: number, value: string) {
    setOptions(options.map((option, i) => (i === index ? value : option)))
  }

  function addOption() {
    if (options.length >= MAX_OPTIONS) return
    focusLastOption.current = true
    setOptions([...options, ''])
  }

  // The list never goes empty: removing the last option leaves a blank one in its place.
  function removeOption(index: number) {
    const remaining = options.filter((_, i) => i !== index)
    setOptions(remaining.length > 0 ? remaining : [''])
    focusLastOption.current = remaining.length === 0
  }

  // Enter adds another option instead of submitting the form.
  function handleOptionKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    addOption()
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const pollId = await createPoll(question.trim() || null, filledOptions, votesPerVoter, durationMinutes)
      location.hash = `#/p/${pollId}`
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setSubmitting(false)
    }
  }

  return (
    <form className="card sketched" onSubmit={handleSubmit}>
      <Sketch />
      <h1>Create a poll</h1>

      <TextInput
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        maxLength={MAX_QUESTION_LENGTH}
        placeholder="Question (optional)"
        aria-label="Question"
        autoFocus
      />

      <fieldset className="field">
        {options.map((option, index) => (
          <div className="option-entry" key={index}>
            <TextInput
              ref={(element) => {
                optionInputs.current[index] = element
              }}
              value={option}
              onChange={(event) => setOption(index, event.target.value)}
              onKeyDown={handleOptionKeyDown}
              maxLength={MAX_OPTION_LENGTH}
              placeholder={`Option ${index + 1}`}
              aria-label={`Option ${index + 1}`}
            />
            <Button
              type="button"
              ghost
              icon="cross"
              onClick={() => removeOption(index)}
              aria-label={`Remove option ${index + 1}`}
            />
          </div>
        ))}
        {options.length < MAX_OPTIONS && (
          <Button type="button" ghost round icon="plus" onClick={addOption} aria-label="Add option" />
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

      {hasDuplicates && <p className="error">Each option can only be listed once.</p>}
      {error && <p className="error">Could not create the poll: {error}</p>}

      <Button type="submit" disabled={!canSubmit}>
        {submitting ? 'Creating…' : 'Create poll'}
      </Button>
    </form>
  )
}
