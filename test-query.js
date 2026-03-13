// test-query.js
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: 'frontend/.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
    const { data, error } = await supabase.from('purchases').select('id, items').limit(5);
    console.log("Purchases:", JSON.stringify(data, null, 2));

    if (data && data.length > 0) {
        const ids = [];
        data.forEach(p => p.items?.forEach(i => ids.push(i.id)));
        console.log("Found ids:", ids);

        const { data: invData, error: invError } = await supabase
            .from('inventory')
            .select('id, card_id, cards!inner(image_url)')
            .in('id', ids.slice(0, 5));

        console.log("Inv query:", invError ? invError : JSON.stringify(invData, null, 2));
    }
}
run();
