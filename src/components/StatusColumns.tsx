import { GAME_STATUSES, STATUS_LABELS } from '../lib/games'
import type { Game } from '../lib/games'
import { GameTile } from './GameTile'
import './StatusColumns.css'

export function StatusColumns({ games }: { games: Game[] }) {
  return (
    <div className="status-columns">
      {GAME_STATUSES.map((status) => {
        const columnGames = games.filter((game) => game.status === status)
        return (
          <section key={status} className={`status-column status-${status}`}>
            <h2 className="status-column-heading">
              {STATUS_LABELS[status]}
              <span className="status-column-count">{columnGames.length}</span>
            </h2>
            {columnGames.length === 0 ? (
              <p className="status-column-empty">No games</p>
            ) : (
              <ul className="status-column-games">
                {columnGames.map((game) => (
                  <li key={game.id}>
                    <GameTile game={game} showStatus={false} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
