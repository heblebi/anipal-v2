import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
    'https://btfmgxbrxellkfbsnwzs.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0Zm1neGJyeGVsbGtmYnNud3pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MDc5OTksImV4cCI6MjA5MDM4Mzk5OX0.sjqATp-bE7tEN9Slm1nBRDFfeJuvtWhW11ItRNKv5RA'
);

export const USE_SUPABASE = import.meta.env.VITE_USE_SUPABASE !== 'false';
