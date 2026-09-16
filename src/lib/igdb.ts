import { supabase } from './supabaseClient'

export interface IgdbSearchResult {
  igdbId: number
  name: string
  coverUrl: string | null
  releaseYear: number | null
}

export interface IgdbGameDetails {
  igdbId: number
  name: string
  coverUrl: string | null
  genres: string[]
  platforms: string[]
  timeToBeat: {
    mainStory: number | null
    mainPlusExtra: number | null
    completionist: number | null
  }
}

async function invokeIgdbProxy<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('igdb-proxy', { body })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data as T
}

export function searchIgdbGames(query: string): Promise<IgdbSearchResult[]> {
  return invokeIgdbProxy({ action: 'search', query })
}

export function getIgdbGameDetails(igdbId: number): Promise<IgdbGameDetails> {
  return invokeIgdbProxy({ action: 'details', igdbId })
}
