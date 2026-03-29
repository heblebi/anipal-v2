import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://btfmgxbrxellkfbsnwzs.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0Zm1neGJyeGVsbGtmYnNud3pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MDc5OTksImV4cCI6MjA5MDM4Mzk5OX0.sjqATp-bE7tEN9Slm1nBRDFfeJuvtWhW11ItRNKv5RA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test ortamında (VITE_USE_SUPABASE=false) Supabase devre dışı
export const USE_SUPABASE = import.meta.env.VITE_USE_SUPABASE !== 'false';
