import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
    'https://ljuzdxbgxcjyjvrdldfh.supabase.co',
    'sb_publishable_phF5WwHlcdQlSAVjFsi7wQ_lg4A6uOP'
);

// Test ortamında (VITE_USE_SUPABASE=false) Supabase devre dışı
export const USE_SUPABASE = import.meta.env.VITE_USE_SUPABASE !== 'false';
