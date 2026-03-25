import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vxbhqldmtebyomfpzlav.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4YmhxbGRtdGVieW9tZnB6bGF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NTIxMjcsImV4cCI6MjA5MDAyODEyN30.g8u94gEdY--PU7fgNcgSIByQ92Ilqc_e3Sy3N9HRKwU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
