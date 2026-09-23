import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { listGames } from '../lib/games'
import type { Game } from '../lib/games'
import { AddGame } from './AddGame'
import { GameTile } from './GameTile'
import { StatusColumns } from './StatusColumns'
import './Library.css'

type LibraryView = 'grid' | 'columns'

const VIEW_STORAGE_KEY = 'game-tracker:library-view'

// localStorage can throw (private mode, blocked storage); the view choice is
// just a convenience, so fall back to the grid and ignore write failures.
function loadStoredView(): LibraryView {
  try {
    return localStorage.getItem(VIEW_STORAGE_KEY) === 'columns' ? 'columns' : 'grid'
  } catch {
    return 'grid'
  }
}

function storeView(view: LibraryView) {
  try {
    localStorage.setItem(VIEW_STORAGE_KEY, view)
  } catch {
    // Not critical; the choice just won't persist.
  }
}

export function Library() {
  const [games, setGames] = useState<Game[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [addingGame, setAddingGame] = useState(false)
  const [view, setView] = useState<LibraryView>(loadStoredView)

  function changeView(next: LibraryView) {
    setView(next)
    storeView(next)
  }

  // Bumped after adding a game so the effect below refetches the list.
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    listGames().then(
      (loaded) => {
        if (cancelled) return
        setGames(loaded)
        setError(null)
      },
      (err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load your games')
      },
    )
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  return (
    <div className="library">
      <header className="library-header">
        <h1>Game Tracker</h1>
        <div className="library-actions">
          <button type="button" className="library-add" onClick={() => setAddingGame(true)}>
            + Add game
          </button>
          <button type="button" className="library-signout" onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        </div>
      </header>

      {error && <p className="library-error">{error}</p>}

      {games && games.length === 0 && (
        <div className="library-empty">
          <p>Your library is empty.</p>
          <button type="button" className="library-add" onClick={() => setAddingGame(true)}>
            Add your first game
          </button>
        </div>
      )}

      {games && games.length > 0 && (
        <>
          <div className="library-view-toggle" role="group" aria-label="Library view">
            <button
              type="button"
              aria-pressed={view === 'grid'}
              onClick={() => changeView('grid')}
            >
              Grid
            </button>
            <button
              type="button"
              aria-pressed={view === 'columns'}
              onClick={() => changeView('columns')}
            >
              Columns
            </button>
          </div>

          {view === 'grid' ? (
            <ul className="library-grid">
              {games.map((game) => (
                <li key={game.id}>
                  <GameTile game={game} />
                </li>
              ))}
            </ul>
          ) : (
            <StatusColumns games={games} />
          )}
        </>
      )}

      {addingGame && (
        <AddGame
          onClose={() => setAddingGame(false)}
          onAdded={() => {
            setAddingGame(false)
            setReloadKey((key) => key + 1)
          }}
        />
      )}
    </div>
  )
}
