# Supabase Setup (Cloud Sync Scaffold)

This repo now includes a cloud-sync scaffold that is **disabled by default**.

## 1) Create Supabase Project

1. Create a Supabase project.
2. Enable email auth (magic link) or your preferred auth provider.

## 2) Apply SQL Migration

Run `/Users/tarique/Documents/banking-diagram-mvp/supabase/migrations/20260216_001_init_workspaces.sql` in the Supabase SQL editor (or via CLI).

This creates:
- `public.workspaces`
- `public.workspace_versions`
- RLS policies scoped to `auth.uid() = owner_id`

## 3) Set Vite Env Vars

Set these in Vercel Preview + Production:

- `VITE_ENABLE_CLOUD_SYNC=true`
- `VITE_SUPABASE_URL=<your-project-url>`
- `VITE_SUPABASE_ANON_KEY=<your-anon-key>`
- `VITE_ENABLE_AI=false`
- `VITE_FEEDBACK_URL=mailto:feedback@finflow.app`

For local development, set equivalent values in a local `.env` file.

## 4) Current Behavior

- Local workspace persistence remains the primary/default behavior.
- Supabase client + workspace adapters are scaffolded in:
  - `/Users/tarique/Documents/banking-diagram-mvp/lib/supabase/client.ts`
  - `/Users/tarique/Documents/banking-diagram-mvp/lib/supabase/workspaces.ts`
- Wiring this into runtime save/load flows is a follow-up step.
