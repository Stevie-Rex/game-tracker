import { STATUS_LABELS } from '../lib/games'
import type { Game } from '../lib/games'
import './GameTile.css'

interface GameTileProps {
  game: Game
  // Column view already groups by status, so the badge would be redundant there.
  showStatus?: boolean
}

export function GameTile({ game, showStatus = true }: GameTileProps) {
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
        {showStatus && (
          <span className={`game-tile-status status-${game.status}`}>
            {STATUS_LABELS[game.status]}
          </span>
        )}
      </div>
    </article>
  )
}
