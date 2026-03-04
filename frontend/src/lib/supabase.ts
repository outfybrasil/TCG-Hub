import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    'http://127.0.0.1:54321';
const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    'supabase-anon-key-placeholder';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn(
        '[supabase] NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY ausentes. ' +
        'Usando valores de fallback para permitir build.'
    );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
