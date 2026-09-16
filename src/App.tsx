import { useSession } from './hooks/useSession'
import { Login } from './components/Login'
import { supabase } from './lib/supabaseClient'

function App() {
  const { session, loading } = useSession()

  if (loading) {
    return null
  }

  if (!session) {
    return <Login />
  }

  return (
    <div style={{ padding: 24 }}>
      <p>Signed in as {session.user.email}</p>
      <button type="button" onClick={() => supabase.auth.signOut()}>
        Sign out
      </button>
    </div>
  )
}

export default App
