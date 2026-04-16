# Event Review App

## Netlify deployment

This app uses Supabase from browser-side Vite environment variables. A new Netlify site will not read your local `.env` file, so add these in Netlify before deploying:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Netlify path:

`Site configuration` -> `Environment variables` -> `Add a variable`

After adding or changing the variables, trigger a fresh deploy. Vite embeds `VITE_` variables during the build, so a deploy that was built before the variables were added will still run in demo mode.

Also make sure `supabase-setup.sql` has been run in the Supabase SQL editor for the same Supabase project used by those variables. It creates the `events` and `media_items` tables, row-level security policies, and the `event-media` storage bucket.

Build settings are defined in `netlify.toml`:

- Build command: `npm run build`
- Publish directory: `dist`
- Node version: `20`
