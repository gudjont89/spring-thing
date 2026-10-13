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
  durationMinutes: 10,
  ownerId: 'preview',
  closesAt: new Date(0),
}

const votes: Votes = new Map([
  ['alice', [1, 3]],
  ['bob', [1, 2]],
  ['carol', [0, 1]],
  ['dave', [3]],
  ['erin', [1, 3]],
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
