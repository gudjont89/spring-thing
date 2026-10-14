import { Results } from './PollPage'
import type { Poll, Votes } from './polls'
import { Sketch } from './Sketch'

// Made-up results for trying out the results view without a live poll.
const poll: Poll = {
  id: 'preview',
  books: [
    { title: 'The Talented Mr. Ripley', author: 'Patricia Highsmith' },
    { title: 'Beloved', author: 'Toni Morrison' },
    { title: 'East of Eden', author: 'John Steinbeck' },
    { title: 'Piranesi', author: 'Susanna Clarke' },
  ],
  votesPerVoter: 2,
  durationMinutes: 3,
  ownerId: 'preview',
  closesAt: new Date('2026-10-13T20:03:00'),
}

// Ballots cast over a few minutes, in the order they came in.
const votes: Votes = new Map([
  ['alice', { books: [1, 3], votedAt: new Date('2026-10-13T20:00:12') }],
  ['bob', { books: [1, 2], votedAt: new Date('2026-10-13T20:00:47') }],
  ['carol', { books: [0, 1], votedAt: new Date('2026-10-13T20:01:30') }],
  ['dave', { books: [3], votedAt: new Date('2026-10-13T20:02:05') }],
  ['erin', { books: [1, 3], votedAt: new Date('2026-10-13T20:02:51') }],
  ['frank', { books: [0, 2], votedAt: new Date('2026-10-13T20:01:40') }]
])

export function ResultsPreview() {
  return (
    <section className="card sketched">
      <Sketch />
      <h1>Results</h1>
      <Results poll={poll} votes={votes} myVote={[1, 3]} />
    </section>
  )
}
