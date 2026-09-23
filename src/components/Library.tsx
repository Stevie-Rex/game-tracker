import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { STATUS_LABELS, listGames } from '../lib/games'
import type { Game } from '../lib/games'
import { AddGame } from './AddGame'
import './Library.css'

export function Library() {
  const [games, setGames] = useState<Game[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [addingGame, setAddingGame] = useState(false)

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
        <ul className="library-grid">
          {games.map((game) => (
            <li key={game.id}>
              <GameTile game={game} />
            </li>
          ))}
        </ul>
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

function GameTile({ game }: { game: Game }) {
  return (
    <article className="game-tile" title={`${game.title} · ${game.platform}`}>
      {game.cover_url ? (
        <img src={game.cover_url} alt="" loading="lazy" />
      ) : (
        <div className="game-tile-placeholder" aria-hidden="true">
          {game.title}
        </div>
      )}
      <div className="game-tile-overlay">
        <h2>{game.title}</h2>
        <span className={`game-tile-status status-${game.status}`}>{STATUS_LABELS[game.status]}</span>
      </div>
    </article>
  )
}
