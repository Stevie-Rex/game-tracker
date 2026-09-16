// Supabase Edge Function: proxies IGDB requests so the Twitch client secret
// never reaches the browser. Deployed with `supabase functions deploy igdb-proxy`.
//
// Required secrets (set with `supabase secrets set`):
//   TWITCH_CLIENT_ID
//   TWITCH_CLIENT_SECRET

const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token'
const IGDB_BASE_URL = 'https://api.igdb.com/v4'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

let cachedToken: { accessToken: string; expiresAt: number } | null = null

async function getTwitchAppToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.accessToken
  }

  const clientId = Deno.env.get('TWITCH_CLIENT_ID')
  const clientSecret = Deno.env.get('TWITCH_CLIENT_SECRET')
  if (!clientId || !clientSecret) {
    throw new Error('Missing TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET secret')
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials',
  })

  const response = await fetch(`${TWITCH_TOKEN_URL}?${params}`, { method: 'POST' })
  if (!response.ok) {
    throw new Error(`Twitch token request failed: ${response.status} ${await response.text()}`)
  }

  const data = await response.json()
  // Refresh a minute early so we never fire a request with a token that
  // expires mid-flight.
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  }
  return cachedToken.accessToken
}

async function igdbFetch(endpoint: string, body: string): Promise<unknown> {
  const clientId = Deno.env.get('TWITCH_CLIENT_ID')!
  const accessToken = await getTwitchAppToken()

  const response = await fetch(`${IGDB_BASE_URL}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Client-ID': clientId,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'text/plain',
    },
    body,
  })

  if (!response.ok) {
    throw new Error(`IGDB ${endpoint} request failed: ${response.status} ${await response.text()}`)
  }

  return response.json()
}

// IGDB cover URLs come back protocol-relative and thumbnail-sized
// (e.g. "//images.igdb.com/igdb/image/upload/t_thumb/xyz.jpg").
function toCoverUrl(rawUrl: string | undefined): string | null {
  if (!rawUrl) return null
  const withProtocol = rawUrl.startsWith('//') ? `https:${rawUrl}` : rawUrl
  return withProtocol.replace('/t_thumb/', '/t_cover_big/')
}

// Escapes double quotes for safe interpolation into an Apicalypse query string.
function escapeApicalypseString(value: string): string {
  return value.replace(/"/g, '\\"')
}

const SECONDS_PER_HOUR = 3600

function secondsToHours(seconds: number | undefined): number | null {
  if (typeof seconds !== 'number') return null
  return Math.round((seconds / SECONDS_PER_HOUR) * 10) / 10
}

interface IgdbGame {
  id: number
  name?: string
  cover?: { url?: string }
  genres?: { name?: string }[]
  platforms?: { name?: string }[]
  first_release_date?: number
}

interface IgdbTimeToBeat {
  hastily?: number
  normally?: number
  completely?: number
}

async function handleSearch(query: string) {
  const games = (await igdbFetch(
    'games',
    `search "${escapeApicalypseString(query)}"; fields name,cover.url,first_release_date; limit 20;`,
  )) as IgdbGame[]

  return games.map((game) => ({
    igdbId: game.id,
    name: game.name ?? 'Unknown title',
    coverUrl: toCoverUrl(game.cover?.url),
    releaseYear: game.first_release_date
      ? new Date(game.first_release_date * 1000).getUTCFullYear()
      : null,
  }))
}

async function handleDetails(igdbId: number) {
  const [games, timeToBeats] = await Promise.all([
    igdbFetch(
      'games',
      `fields name,cover.url,genres.name,platforms.name; where id = ${igdbId};`,
    ) as Promise<IgdbGame[]>,
    igdbFetch(
      'game_time_to_beats',
      `fields hastily,normally,completely; where game_id = ${igdbId};`,
    ) as Promise<IgdbTimeToBeat[]>,
  ])

  const game = games[0]
  if (!game) {
    throw new Error(`No IGDB game found for id ${igdbId}`)
  }
  const timeToBeat = timeToBeats[0]

  return {
    igdbId: game.id,
    name: game.name ?? 'Unknown title',
    coverUrl: toCoverUrl(game.cover?.url),
    genres: (game.genres ?? []).map((g) => g.name).filter((name): name is string => Boolean(name)),
    platforms: (game.platforms ?? [])
      .map((p) => p.name)
      .filter((name): name is string => Boolean(name)),
    timeToBeat: {
      mainStory: secondsToHours(timeToBeat?.hastily),
      mainPlusExtra: secondsToHours(timeToBeat?.normally),
      completionist: secondsToHours(timeToBeat?.completely),
    },
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  try {
    const { action, query, igdbId } = await req.json()

    let result: unknown
    if (action === 'search') {
      if (typeof query !== 'string' || !query.trim()) {
        throw new Error('search requires a non-empty "query" string')
      }
      result = await handleSearch(query)
    } else if (action === 'details') {
      if (typeof igdbId !== 'number') {
        throw new Error('details requires a numeric "igdbId"')
      }
      result = await handleDetails(igdbId)
    } else {
      throw new Error(`Unknown action "${action}". Expected "search" or "details".`)
    }

    return new Response(JSON.stringify(result), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})
