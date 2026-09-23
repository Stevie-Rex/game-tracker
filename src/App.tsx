import { useState } from 'react'
import { useSession } from './hooks/useSession'
import { Login } from './components/Login'
import { AddGame } from './components/AddGame'
import { supabase } from './lib/supabaseClient'

function App() {
  const { session, loading } = useSession()
  const [addingGame, setAddingGame] = useState(false)
  const [lastAdded, setLastAdded] = useState<string | null>(null)

  if (loading) {
    return null
  }

  if (!session) {
    return <Login />
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p>Signed in as {session.user.email}</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={() => setAddingGame(true)}>
          Add game
        </button>
        <button type="button" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </div>
      {lastAdded && <p>Added {lastAdded} to your library.</p>}

      {addingGame && (
        <AddGame
          onClose={() => setAddingGame(false)}
          onAdded={(title) => {
            setLastAdded(title)
            setAddingGame(false)
          }}
        />
      )}
    </div>
  )
}

export default App
