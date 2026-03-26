import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
    'https://ljuzdxbgxcjyjvrdldfh.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqdXpkeGJneGNqeWp2cmRsZGZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0ODY2MDQsImV4cCI6MjA5MDA2MjYwNH0.N--2wwrwh4uM-ot1ALll1SA2FwQHMkNNajjfNbw10eE'
);

// Test ortamında (VITE_USE_SUPABASE=false) Supabase devre dışı
export const USE_SUPABASE = import.meta.env.VITE_USE_SUPABASE !== 'false';
