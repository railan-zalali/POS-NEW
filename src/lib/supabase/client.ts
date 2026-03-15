import { createClient } from '@supabase/supabase-js';

// These should be in environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || supabaseUrl.includes('your-project')) {
  console.warn('Supabase URL is missing or using placeholder. Cloud sync will be disabled.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co',
  supabaseKey || 'placeholder-key',
);
