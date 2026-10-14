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
    { title: 'Middlemarch', author: 'George Eliot' },
    { title: 'The Remains of the Day', author: 'Kazuo Ishiguro' },
    { title: 'The Brief Wondrous Life of Oscar Wao', author: 'Junot Díaz' },
    { title: 'Stoner', author: 'John Williams' },
  ],
  votesPerVoter: 2,
  durationMinutes: 3,
  ownerId: 'preview',
  closesAt: new Date('2026-10-13T20:03:00'),
}

// Ballots cast over a few minutes, in the order they came in.
const votes: Votes = new Map([
  ['alice', { name: 'Alice', books: [1, 3], votedAt: new Date('2026-10-13T20:00:12') }],
  ['bob', { name: 'Bob', books: [1, 2], votedAt: new Date('2026-10-13T20:00:47') }],
  ['carol', { name: 'Carol', books: [0, 1], votedAt: new Date('2026-10-13T20:01:30') }],
  ['dave', { name: 'Dave', books: [3], votedAt: new Date('2026-10-13T20:02:05') }],
  ['erin', { name: 'Erin', books: [1, 3], votedAt: new Date('2026-10-13T20:02:51') }],
  ['frank', { name: 'Frank', books: [0, 2], votedAt: new Date('2026-10-13T20:01:40') }],
  ['grace', { name: 'Grace', books: [2, 3], votedAt: new Date('2026-10-13T20:00:25') }],
  ['heidi', { name: 'Heidi', books: [2], votedAt: new Date('2026-10-13T20:01:33') }],
  ['ivan', { name: 'Ivan', books: [0, 1], votedAt: new Date('2026-10-13T20:02:20') }],
  ['judy', { name: 'Judy', books: [1, 2], votedAt: new Date('2026-10-13T20:02:40') }],
  ['kate', { name: 'Kate', books: [4, 5], votedAt: new Date('2026-10-13T20:01:31') }],
  ['leo', { name: 'Leo', books: [5, 6], votedAt: new Date('2026-10-13T20:01:35') }],
  ['mallory', { name: 'Mallory', books: [4, 7], votedAt: new Date('2026-10-13T20:01:37') }],
  ['nina', { name: 'Nina', books: [5], votedAt: new Date('2026-10-13T20:01:38') }],
])

export function ResultsPreview() {
  return (
    <section className="card sketched">
      <Sketch />
      <Results poll={poll} votes={votes} myVote={[1, 3]} />
    </section>
  )
}
