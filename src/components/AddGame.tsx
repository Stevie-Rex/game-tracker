import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { getIgdbGameDetails, searchIgdbGames } from '../lib/igdb'
import type { IgdbGameDetails, IgdbSearchResult } from '../lib/igdb'
import { GAME_STATUSES, STATUS_LABELS, addGameFromIgdb } from '../lib/games'
import type { GameStatus } from '../lib/games'
import './AddGame.css'

const SEARCH_DEBOUNCE_MS = 350
const OTHER_PLATFORM = '__other__'

interface AddGameProps {
  onClose: () => void
  onAdded: (title: string) => void
}

export function AddGame({ onClose, onAdded }: AddGameProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<IgdbSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [details, setDetails] = useState<IgdbGameDetails | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    dialogRef.current?.showModal()
    // showModal() moves focus to the first focusable element (the close
    // button), overriding autoFocus, so a typed space would close the dialog.
    searchRef.current?.focus()
  }, [])

  const trimmedQuery = query.trim()
  const visibleResults = trimmedQuery ? results : []

  function handleQueryChange(value: string) {
    const nextTrimmed = value.trim()
    setQuery(value)
    // Only a change to the trimmed text triggers a new search below.
    if (nextTrimmed !== trimmedQuery) setSearching(Boolean(nextTrimmed))
  }

  useEffect(() => {
    if (!trimmedQuery) return

    // Ignore responses from searches superseded by further typing.
    let stale = false
    const timer = setTimeout(async () => {
      try {
        const found = await searchIgdbGames(trimmedQuery)
        if (!stale) {
          setResults(found)
          setError(null)
        }
      } catch (err) {
        if (!stale) setError(err instanceof Error ? err.message : 'Search failed')
      } finally {
        if (!stale) setSearching(false)
      }
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      stale = true
      clearTimeout(timer)
    }
  }, [trimmedQuery])

  async function handlePick(result: IgdbSearchResult) {
    setError(null)
    setLoadingDetails(true)
    try {
      setDetails(await getIgdbGameDetails(result.igdbId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load game details')
    } finally {
      setLoadingDetails(false)
    }
  }

  return (
    <dialog ref={dialogRef} className="add-game" onClose={onClose}>
      <header className="add-game-header">
        <h2>{details ? 'Add to your library' : 'Add a game'}</h2>
        <button type="button" className="add-game-close" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </header>

      {details ? (
        <ConfirmStep
          details={details}
          onBack={() => setDetails(null)}
          onSaved={() => onAdded(details.name)}
        />
      ) : (
        <>
          <input
            ref={searchRef}
            type="search"
            className="add-game-search"
            placeholder="Search by title…"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
          />

          {error && <p className="add-game-error">{error}</p>}
          {loadingDetails && <p className="add-game-hint">Loading game details…</p>}

          <ul className="add-game-results" aria-busy={searching}>
            {visibleResults.map((result) => (
              <li key={result.igdbId}>
                <button type="button" disabled={loadingDetails} onClick={() => handlePick(result)}>
                  <Cover url={result.coverUrl} />
                  <span className="add-game-result-name">{result.name}</span>
                  {result.releaseYear && (
                    <span className="add-game-result-year">{result.releaseYear}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>

          {searching && <p className="add-game-hint">Searching…</p>}
          {!searching && trimmedQuery && results.length === 0 && !error && (
            <p className="add-game-hint">No games found.</p>
          )}
        </>
      )}
    </dialog>
  )
}

interface ConfirmStepProps {
  details: IgdbGameDetails
  onBack: () => void
  onSaved: () => void
}

function ConfirmStep({ details, onBack, onSaved }: ConfirmStepProps) {
  const [platformChoice, setPlatformChoice] = useState(details.platforms[0] ?? OTHER_PLATFORM)
  const [customPlatform, setCustomPlatform] = useState('')
  const [status, setStatus] = useState<GameStatus>('backlog')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const platform = platformChoice === OTHER_PLATFORM ? customPlatform.trim() : platformChoice
  const { mainStory, mainPlusExtra, completionist } = details.timeToBeat

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await addGameFromIgdb(details, platform, status)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save game')
      setSaving(false)
    }
  }

  return (
    <form className="add-game-confirm" onSubmit={handleSubmit}>
      <div className="add-game-summary">
        <Cover url={details.coverUrl} large />
        <div>
          <h3>{details.name}</h3>
          {details.genres.length > 0 && <p>{details.genres.join(', ')}</p>}
          <dl className="add-game-ttb">
            <dt>Main</dt>
            <dd>{formatHours(mainStory)}</dd>
            <dt>Main + extra</dt>
            <dd>{formatHours(mainPlusExtra)}</dd>
            <dt>Completionist</dt>
            <dd>{formatHours(completionist)}</dd>
          </dl>
        </div>
      </div>

      <label>
        Platform
        <select value={platformChoice} onChange={(e) => setPlatformChoice(e.target.value)}>
          {details.platforms.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
          <option value={OTHER_PLATFORM}>Other…</option>
        </select>
      </label>

      {platformChoice === OTHER_PLATFORM && (
        <label>
          Platform name
          <input
            required
            autoFocus
            value={customPlatform}
            onChange={(e) => setCustomPlatform(e.target.value)}
          />
        </label>
      )}

      <label>
        Status
        <select value={status} onChange={(e) => setStatus(e.target.value as GameStatus)}>
          {GAME_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="add-game-error">{error}</p>}

      <div className="add-game-actions">
        <button type="button" className="add-game-secondary" onClick={onBack}>
          Back
        </button>
        <button type="submit" className="add-game-primary" disabled={saving || !platform}>
          {saving ? 'Saving…' : 'Add game'}
        </button>
      </div>
    </form>
  )
}

function Cover({ url, large = false }: { url: string | null; large?: boolean }) {
  const className = large ? 'add-game-cover add-game-cover-large' : 'add-game-cover'
  return url ? (
    <img className={className} src={url} alt="" loading="lazy" />
  ) : (
    <span className={`${className} add-game-cover-missing`} />
  )
}

function formatHours(hours: number | null): string {
  return hours === null ? '—' : `${hours}h`
}
