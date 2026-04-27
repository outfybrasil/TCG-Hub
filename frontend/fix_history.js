const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://kdwzyvfqcspuqvfpnvml.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtkd3p5dmZxY3NwdXF2ZnBudm1sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU1OTAxNCwiZXhwIjoyMDg4MTM1MDE0fQ.kQ9Ik7ZIXSCHx9-Kxo8QpNBOlDhZpcj6fppFfqInPXw'
);

async function run() {
    console.log('Fixing live_auction_history...');
    const { data: purchases, error: pError } = await supabase.from('purchases').select('user_id, items, created_at').eq('payment_method', 'live_credits').order('created_at', { ascending: false }).limit(5);
    
    if (pError) return console.error(pError);
    
    for (const p of purchases) {
        if (!p.items || p.items.length === 0) continue;
        const item = p.items[0];
        if (!item.live_id) continue;
        
        // Fetch user name
        const { data: user } = await supabase.auth.admin.getUserById(p.user_id);
        const winnerName = user?.user?.user_metadata?.full_name || user?.user?.user_metadata?.name || 'Comprador';
        
        const { error: hError } = await supabase.from('live_auction_history').insert({
            live_id: item.live_id,
            item_name: item.name,
            item_type: item.item_type || 'Carta',
            item_image: item.image_url,
            winner_id: p.user_id,
            winner_name: winnerName,
            final_bid: item.price,
            created_at: p.created_at
        });
        
        if (hError) console.error('Error inserting:', hError);
        else console.log('Inserted:', item.name);
    }
}
run();
