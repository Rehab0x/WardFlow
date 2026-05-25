# Supabase Type Generation

WardFlow should treat `src/types/supabase.ts` as generated schema output once the Supabase CLI is authenticated and linked to the intended project.

## Generate Types

The Supabase CLI is installed as a project dev dependency. Authenticate it, link the local folder to the project, then run:

```bash
npm run types:supabase
```

The script runs:

```bash
supabase gen types typescript --linked --schema public > src/types/supabase.ts
```

After generation, run:

```bash
npm run type-check
npm run build
```

## Current Local Caveat

The current machine has Supabase CLI `2.101.0` available through `npx supabase`, but the CLI cannot link or generate remote project types until `supabase login` is completed or `SUPABASE_ACCESS_TOKEN` is set. The attempted project link for the local Supabase project ref stopped with `Access token not provided`.

Until the CLI is authenticated, keep schema changes mirrored manually in `src/types/supabase.ts` and verify repository column selects against `supabase/migrations/202605220001_wardflow_v2_foundation.sql`.

## When Schema Changes

1. Update the migration.
2. Apply it to the Supabase project.
3. Regenerate `src/types/supabase.ts`.
4. Run focused repository/store tests plus `npm run type-check`.
