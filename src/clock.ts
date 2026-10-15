import {
  doc,
  getDocFromCache,
  getDocFromServer,
  serverTimestamp,
  setDoc,
  type DocumentReference,
  type Timestamp,
} from 'firebase/firestore'
import { db, ensureSignedIn } from './firebase'

// How many times to ask the server for its time. The answer with the shortest round trip is kept, since the first
// requests also set up the connection, which makes their round trips long and lopsided.
const SAMPLES = 3

// How far the server's clock is ahead of this browser's, in milliseconds. 0 until syncClock has measured it.
let offset = 0
let syncing: Promise<void> | undefined

/** The server's current time in milliseconds, as best this browser knows it. Use it in place of Date.now(). */
export function serverNow(): number {
  return Date.now() + offset
}

/**
 * Measures how far this browser's clock is from the server's, which Security Rules use to end voting. Each sample
 * writes the server's time to this browser's clocks document; the server stamped it somewhere between sending the
 * write and its acknowledgement, so the midpoint is the best guess. Only measures once per page load.
 */
export function syncClock(): Promise<void> {
  syncing ??= (async () => {
    const user = await ensureSignedIn()
    const ref = doc(db, 'clocks', user.uid)
    let best: { roundTrip: number; offset: number } | undefined
    for (let i = 0; i < SAMPLES; i++) {
      const sent = Date.now()
      await setDoc(ref, { at: serverTimestamp() })
      const acknowledged = Date.now()
      const at = await readStamp(ref)
      const roundTrip = acknowledged - sent
      if (!best || roundTrip < best.roundTrip) best = { roundTrip, offset: at - (sent + acknowledged) / 2 }
    }
    offset = best!.offset
  })()
  return syncing
}

// The acknowledgement carries the server's timestamp, so the cache usually has it. Otherwise ask the server.
async function readStamp(ref: DocumentReference): Promise<number> {
  const cached = await getDocFromCache(ref).catch(() => undefined)
  const at: Timestamp | null | undefined = cached?.get('at') ?? (await getDocFromServer(ref)).get('at')
  return at!.toMillis()
}
