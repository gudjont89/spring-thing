import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously, type User } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Firebase web config is not secret; access is controlled by Security Rules.
// Values come from .env.local in development and repository variables in CI.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

let signingIn: Promise<User> | undefined

// Visitors never see a login: each browser gets a silent anonymous account,
// which lets Security Rules allow one vote per browser and keep a poll's creator from voting in it.
export function ensureSignedIn(): Promise<User> {
  signingIn ??= auth.authStateReady().then(async () => {
    if (auth.currentUser) return auth.currentUser
    const { user } = await signInAnonymously(auth)
    return user
  })
  return signingIn
}
