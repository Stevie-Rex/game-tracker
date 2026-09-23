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
