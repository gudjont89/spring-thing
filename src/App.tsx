import { useSyncExternalStore } from 'react'
import { CreatePoll } from './CreatePoll'
import { app } from './firebase'
import { PollPage } from './PollPage'
import './App.css'

function subscribeToHash(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

function App() {
  const hash = useSyncExternalStore(subscribeToHash, () => location.hash)
  const pollId = /^#\/p\/([\w-]+)$/.exec(hash)?.[1]

  if (!app.options.projectId) {
    return (
      <main>
        <p>Firebase is not configured yet. Copy .env.example to .env.local and fill it in.</p>
      </main>
    )
  }

  return <main>{pollId ? <PollPage key={pollId} pollId={pollId} /> : <CreatePoll />}</main>
}

export default App
