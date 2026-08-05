import 'server-only';

import { createClient } from '@supabase/supabase-js';

const isProductionBuild = process.env.NEXT_PHASE === 'phase-production-build';
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    || (isProductionBuild ? 'http://127.0.0.1:54321' : undefined);
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    || (isProductionBuild ? 'build-only-placeholder' : undefined);

if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorios no servidor.');
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
});
