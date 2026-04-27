const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://kdwzyvfqcspuqvfpnvml.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtkd3p5dmZxY3NwdXF2ZnBudm1sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU1OTAxNCwiZXhwIjoyMDg4MTM1MDE0fQ.kQ9Ik7ZIXSCHx9-Kxo8QpNBOlDhZpcj6fppFfqInPXw'
);

async function run() {
    console.log('Fetching active live_auctions...');
    const { data, error } = await supabase.from('live_auctions').select('*').eq('status', 'LIVE').order('created_at', { ascending: false });
    if (error) console.error('Error:', error);
    else {
        console.log('Active Lives:', data.map(d => ({
            id: d.id, 
            title: d.title, 
            current_item_name: d.current_item_name,
            current_bid: d.current_bid,
            winning_user_name: d.winning_user_name
        })));
    }
}
run();
