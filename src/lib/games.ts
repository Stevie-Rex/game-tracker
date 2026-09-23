import { supabase } from './supabaseClient'
import type { IgdbGameDetails } from './igdb'

export const GAME_STATUSES = ['backlog', 'playing', 'completed', 'dropped'] as const
export type GameStatus = (typeof GAME_STATUSES)[number]

export const STATUS_LABELS: Record<GameStatus, string> = {
  backlog: 'Backlog',
  playing: 'Playing',
  completed: 'Completed',
  dropped: 'Dropped',
}

export async function addGameFromIgdb(
  details: IgdbGameDetails,
  platform: string,
  status: GameStatus,
): Promise<void> {
  // owner_id defaults to auth.uid() in the schema, so RLS ties the row to the
  // signed-in user without us passing it.
  const { error } = await supabase.from('games').insert({
    title: details.name,
    platform,
    status,
    genres: details.genres,
    cover_url: details.coverUrl,
    igdb_id: details.igdbId,
    time_to_beat_main: details.timeToBeat.mainStory,
    time_to_beat_extra: details.timeToBeat.mainPlusExtra,
    time_to_beat_completionist: details.timeToBeat.completionist,
  })
  if (error) throw error
}

export interface Game {
  id: string
  title: string
  platform: string
  genres: string[]
  cover_url: string | null
  status: GameStatus
  igdb_id: number | null
  time_to_beat_main: number | null
  time_to_beat_extra: number | null
  time_to_beat_completionist: number | null
  rating: number | null
  review: string | null
  backlog_order: number | null
  created_at: string
  updated_at: string
}

export async function listGames(): Promise<Game[]> {
  // RLS already limits rows to the signed-in user's games.
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Game[]
}
