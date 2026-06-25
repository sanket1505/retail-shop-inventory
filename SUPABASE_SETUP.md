# Supabase Setup

1. Create a Supabase project.
2. Open the SQL editor in Supabase and run [`supabase/schema.sql`](./supabase/schema.sql).
3. Copy [`.env.example`](./.env.example) to `.env` and paste your project URL and anon or publishable key.
4. Restart the Vite dev server.

## Netlify Environment Variables

Add these variables in Netlify under **Site configuration > Environment variables**:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

You can use `VITE_SUPABASE_PUBLISHABLE_KEY` instead of `VITE_SUPABASE_ANON_KEY` if your Supabase dashboard labels it that way.

Notes:

- This app stores settings, inventory, and transactions in separate Supabase tables linked to the `main-store` store id.
- On first launch with Supabase configured, the app will seed cloud state from existing browser data if the tables are empty.
- If Supabase is unavailable, the UI keeps working from local browser cache until cloud sync succeeds again.
