import { Results } from './PollPage'
import type { Poll, Votes } from './polls'
import { Sketch } from './Sketch'

// Made-up results for trying out the results view without a live poll.
const poll: Poll = {
  id: 'preview',
  question: 'Which book should we read next?',
  options: [
    'The Talented Mr. Ripley',
    'Beloved',
    'East of Eden',
    'Piranesi',
    'Middlemarch',
    'The Remains of the Day',
    'The Brief Wondrous Life of Oscar Wao',
    'Stoner',
  ],
  votesPerVoter: 2,
  durationMinutes: 3,
  ownerId: 'preview',
  closesAt: new Date('2026-10-13T20:03:00'),
}

// Ballots cast over a few minutes, in the order they came in.
const votes: Votes = new Map([
  ['alice', { name: 'Alice', options: [1, 3], votedAt: new Date('2026-10-13T20:00:12') }],
  ['bob', { name: 'Bob', options: [1, 2], votedAt: new Date('2026-10-13T20:00:47') }],
  ['carol', { name: 'Carol', options: [0, 1], votedAt: new Date('2026-10-13T20:01:30') }],
  ['dave', { name: 'Dave', options: [3], votedAt: new Date('2026-10-13T20:02:05') }],
  ['erin', { name: 'Erin', options: [1, 3], votedAt: new Date('2026-10-13T20:02:51') }],
  ['frank', { name: 'Frank', options: [1, 2], votedAt: new Date('2026-10-13T20:01:40') }],
  ['grace', { name: 'Grace', options: [2, 3], votedAt: new Date('2026-10-13T20:00:25') }],
  ['heidi', { name: 'Heidi', options: [2, 1], votedAt: new Date('2026-10-13T20:01:33') }],
  ['ivan', { name: 'Ivan', options: [0, 1], votedAt: new Date('2026-10-13T20:02:20') }],
  ['judy', { name: 'Judy', options: [1, 2], votedAt: new Date('2026-10-13T20:02:40') }],
  ['kate', { name: 'Kate', options: [4, 5], votedAt: new Date('2026-10-13T20:01:31') }],
  ['leo', { name: 'Leo', options: [1, 6], votedAt: new Date('2026-10-13T20:01:35') }],
  ['mallory', { name: 'Mallory', options: [4, 7], votedAt: new Date('2026-10-13T20:01:37') }],
  ['nina', { name: 'Nina', options: [5, 1], votedAt: new Date('2026-10-13T20:01:38') }],
])

export function ResultsPreview() {
  return (
    <section className="card sketched">
      <Sketch />
      <Results poll={poll} votes={votes} myVote={[1, 3]} />
    </section>
  )
}
