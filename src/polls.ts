import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { db, ensureSignedIn } from './firebase'

// Limits are mirrored in firestore.rules.
export const MAX_TITLE_LENGTH = 150
export const MAX_AUTHOR_LENGTH = 100
export const MIN_BOOKS = 2
export const MAX_BOOKS = 15
export const MIN_DURATION_MINUTES = 1
export const MAX_DURATION_MINUTES = 5
export const DEFAULT_DURATION_MINUTES = 3

export interface Book {
  title: string
  author: string | null
}

export interface Poll {
  id: string
  books: Book[]
  /** How many different books each voter may pick. Always less than the number of books. */
  votesPerVoter: number
  durationMinutes: number
  ownerId: string
  /** When voting ends: createdAt plus durationMinutes. Results are hidden until then. */
  closesAt: Date
}

export interface Ballot {
  /** Indexes of the books the voter picked. */
  books: number[]
  /** When the voter last cast or changed their vote. */
  votedAt: Date
  /** The voter's name. Votes don't record one yet, so only made-up ballots have it. */
  name?: string
}

/** Maps voter uid to their ballot. */
export type Votes = Map<string, Ballot>

export function pollUrl(pollId: string): string {
  // Hash routing, since GitHub Pages cannot rewrite unknown paths to index.html.
  return `${location.origin}${location.pathname}#/p/${pollId}`
}

export async function createPoll(books: Book[], votesPerVoter: number, durationMinutes: number): Promise<string> {
  const user = await ensureSignedIn()
  const ref = await addDoc(collection(db, 'polls'), {
    books,
    votesPerVoter,
    durationMinutes,
    ownerId: user.uid,
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
      // Estimate createdAt while the creator's own write is still pending on the server.
      const data = snapshot.data({ serverTimestamps: 'estimate' })
      onChange(
        data
          ? {
              id: snapshot.id,
              books: data.books,
              votesPerVoter: data.votesPerVoter,
              durationMinutes: data.durationMinutes,
              ownerId: data.ownerId,
              closesAt: new Date(data.createdAt.toMillis() + data.durationMinutes * 60_000),
            }
          : null,
      )
    },
    onError,
  )
}

/** Watches one voter's ballot, which they may read before the poll closes. Reports undefined if they have not voted. */
export function watchVote(
  pollId: string,
  voterId: string,
  onChange: (books: number[] | undefined) => void,
  onError: (error: Error) => void,
): () => void {
  return onSnapshot(
    doc(db, 'polls', pollId, 'votes', voterId),
    (snapshot) => onChange(snapshot.data()?.books),
    onError,
  )
}

/**
 * Reads every ballot once. Security Rules only allow this after the poll closes,
 * and ballots cannot change after that, so there is nothing to watch.
 */
export async function fetchVotes(pollId: string): Promise<Votes> {
  const snapshot = await getDocs(collection(db, 'polls', pollId, 'votes'))
  return new Map(
    snapshot.docs.map((vote) => {
      const data = vote.data()
      return [vote.id, { books: data.books, votedAt: data.votedAt.toDate() }]
    }),
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

export function tally(ballots: Iterable<Ballot>, bookCount: number): number[] {
  const counts = new Array<number>(bookCount).fill(0)
  for (const { books } of ballots) {
    for (const book of books) {
      if (book >= 0 && book < bookCount) counts[book]++
    }
  }
  return counts
}
