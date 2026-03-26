import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || 'https://example.invalid';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || 'public-anon-key-placeholder';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const isSupabaseConfigured =
  supabaseUrl !== 'https://example.invalid' &&
  supabaseKey !== 'public-anon-key-placeholder' &&
  !supabaseUrl.includes('your-project');
