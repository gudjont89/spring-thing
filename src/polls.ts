import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db, ensureSignedIn } from './firebase'

// Limits are mirrored in firestore.rules.
export const MAX_TITLE_LENGTH = 150
export const MAX_AUTHOR_LENGTH = 100
export const MIN_BOOKS = 2
export const MAX_BOOKS = 15

export interface Book {
  title: string
  author: string | null
}

export interface Poll {
  id: string
  books: Book[]
  /** How many different books each voter may pick. Always less than the number of books. */
  votesPerVoter: number
  ownerId: string
  closed: boolean
}

/** Maps voter uid to the indexes of the books they picked. */
export type Votes = Map<string, number[]>

export function pollUrl(pollId: string): string {
  // Hash routing, since GitHub Pages cannot rewrite unknown paths to index.html.
  return `${location.origin}${location.pathname}#/p/${pollId}`
}

export async function createPoll(books: Book[], votesPerVoter: number): Promise<string> {
  const user = await ensureSignedIn()
  const ref = await addDoc(collection(db, 'polls'), {
    books,
    votesPerVoter,
    ownerId: user.uid,
    closed: false,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export function watchPoll(
  pollId: string,
  onChange: (poll: Poll | null) => void,
  onError: (error: Error) => void,
): () => void {
  return onSnapshot(
    doc(db, 'polls', pollId),
    (snapshot) => {
      const data = snapshot.data()
      onChange(
        data
          ? {
              id: snapshot.id,
              books: data.books,
              votesPerVoter: data.votesPerVoter,
              ownerId: data.ownerId,
              closed: data.closed,
            }
          : null,
      )
    },
    onError,
  )
}

export function watchVotes(
  pollId: string,
  onChange: (votes: Votes) => void,
  onError: (error: Error) => void,
): () => void {
  return onSnapshot(
    collection(db, 'polls', pollId, 'votes'),
    (snapshot) => {
      onChange(new Map(snapshot.docs.map((vote) => [vote.id, vote.data().books])))
    },
    onError,
  )
}

/**
 * Casts or replaces the current browser's vote; the vote document is keyed by uid.
 * `books` holds distinct book indexes, at most the poll's votesPerVoter of them.
 */
export async function castVote(pollId: string, books: number[]): Promise<void> {
  const user = await ensureSignedIn()
  await setDoc(doc(db, 'polls', pollId, 'votes', user.uid), {
    books,
    votedAt: serverTimestamp(),
  })
}

export async function closePoll(pollId: string): Promise<void> {
  await updateDoc(doc(db, 'polls', pollId), { closed: true })
}

export function tally(votes: Votes, bookCount: number): number[] {
  const counts = new Array<number>(bookCount).fill(0)
  for (const books of votes.values()) {
    for (const book of books) {
      if (book >= 0 && book < bookCount) counts[book]++
    }
  }
  return counts
}
