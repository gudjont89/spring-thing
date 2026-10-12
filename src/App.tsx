import { app } from './firebase'
import './App.css'

function App() {
  const projectId = app.options.projectId

  return (
    <main>
      <h1>spring-thing</h1>
      <p>
        {projectId
          ? `Connected to Firebase project "${projectId}".`
          : 'Firebase is not configured yet. Copy .env.example to .env.local and fill it in.'}
      </p>
    </main>
  )
}

export default App
