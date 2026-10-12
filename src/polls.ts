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
export const MAX_QUESTION_LENGTH = 200
export const MAX_OPTION_LENGTH = 100
export const MIN_OPTIONS = 2
export const MAX_OPTIONS = 10

export interface Poll {
  id: string
  question: string
  options: string[]
  ownerId: string
  closed: boolean
}

/** Maps voter uid to the index of the option they chose. */
export type Votes = Map<string, number>

export function pollUrl(pollId: string): string {
  // Hash routing, since GitHub Pages cannot rewrite unknown paths to index.html.
  return `${location.origin}${location.pathname}#/p/${pollId}`
}

export async function createPoll(question: string, options: string[]): Promise<string> {
  const user = await ensureSignedIn()
  const ref = await addDoc(collection(db, 'polls'), {
    question,
    options,
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
              question: data.question,
              options: data.options,
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
      onChange(new Map(snapshot.docs.map((vote) => [vote.id, vote.data().option])))
    },
    onError,
  )
}

/** Casts or changes the current browser's vote; the vote document is keyed by uid. */
export async function castVote(pollId: string, option: number): Promise<void> {
  const user = await ensureSignedIn()
  await setDoc(doc(db, 'polls', pollId, 'votes', user.uid), {
    option,
    votedAt: serverTimestamp(),
  })
}

export async function closePoll(pollId: string): Promise<void> {
  await updateDoc(doc(db, 'polls', pollId), { closed: true })
}

export function tally(votes: Votes, optionCount: number): number[] {
  const counts = new Array<number>(optionCount).fill(0)
  for (const option of votes.values()) {
    if (option >= 0 && option < optionCount) counts[option]++
  }
  return counts
}
