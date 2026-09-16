# Manual setup steps

These are one-time steps only you can do (they need your own accounts/credentials).
Run all commands yourself rather than pasting secrets into chat with Claude.

## Google sign-in (issue #2)

1. Go to https://console.cloud.google.com/ and create (or pick) a project.
2. **APIs & Services → OAuth consent screen** — set it up as "External," add an
   app name + your support email. Keep publishing status as "Testing" and add
   your family members' Google emails as test users (avoids Google's full
   verification review, which is fine for a personal-use app).
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID** —
   Application type: "Web application".
4. Add this as an **Authorized redirect URI**:
   ```
   https://kjtkpmtnsdktxrbrdkcm.supabase.co/auth/v1/callback
   ```
5. Copy the generated **Client ID** and **Client Secret**.
6. In the Supabase dashboard: **Authentication → Providers → Google** — enable
   it and paste the Client ID/Secret in directly.

Once done, the "Continue with Google" button on the login screen will work
with no code changes needed.

## Twitch dev app for IGDB access (issue #3)

The IGDB proxy (`supabase/functions/igdb-proxy`) needs a Twitch application's
Client ID and Secret to authenticate with IGDB.

1. Go to https://dev.twitch.tv/console/apps and click **Register Your
   Application**.
2. Name: anything, e.g. `game-tracker-igdb`.
3. OAuth Redirect URLs: Twitch requires a value even though this app only
   uses the client-credentials flow (no user redirect happens). Enter
   `https://localhost` as a placeholder.
4. Category: "Application Integration" (or similar).
5. After creating it, copy the **Client ID**, then click **New Secret** to
   generate and copy the **Client Secret**.
6. Set both as Supabase Edge Function secrets (run this yourself, in your own
   terminal, so the secret doesn't pass through chat):
   ```
   npx supabase secrets set \
     TWITCH_CLIENT_ID=<your client id> \
     TWITCH_CLIENT_SECRET=<your client secret> \
     --project-ref kjtkpmtnsdktxrbrdkcm
   ```
7. Deploy the function:
   ```
   npx supabase functions deploy igdb-proxy --project-ref kjtkpmtnsdktxrbrdkcm
   ```

Once deployed, `src/lib/igdb.ts` (`searchIgdbGames`, `getIgdbGameDetails`) can
call it from the frontend via `supabase.functions.invoke('igdb-proxy', ...)`.
