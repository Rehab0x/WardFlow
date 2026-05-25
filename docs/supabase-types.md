# Supabase Type Generation

WardFlow should treat `src/types/supabase.ts` as generated schema output once the Supabase CLI is available.

## Generate Types

Install or authenticate the Supabase CLI, link the local folder to the project, then run:

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

The current machine does not have the Supabase CLI installed, so this session cannot replace the file with true generated output yet. Until the CLI is available, keep schema changes mirrored manually in `src/types/supabase.ts` and verify repository column selects against `supabase/migrations/202605220001_wardflow_v2_foundation.sql`.

## When Schema Changes

1. Update the migration.
2. Apply it to the Supabase project.
3. Regenerate `src/types/supabase.ts`.
4. Run focused repository/store tests plus `npm run type-check`.
