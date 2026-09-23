import { useSession } from './hooks/useSession'
import { Login } from './components/Login'
import { Library } from './components/Library'

function App() {
  const { session, loading } = useSession()

  if (loading) {
    return null
  }

  if (!session) {
    return <Login />
  }

  return <Library />
}

export default App
