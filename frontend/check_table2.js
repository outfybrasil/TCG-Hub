const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://kdwzyvfqcspuqvfpnvml.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtkd3p5dmZxY3NwdXF2ZnBudm1sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU1OTAxNCwiZXhwIjoyMDg4MTM1MDE0fQ.kQ9Ik7ZIXSCHx9-Kxo8QpNBOlDhZpcj6fppFfqInPXw'
);

async function run() {
    console.log('Fetching live_auction_history for live aaa948ea-bc79-4f94-822d-9d419d095a83...');
    const { data, error } = await supabase.from('live_auction_history').select('*').eq('live_id', 'aaa948ea-bc79-4f94-822d-9d419d095a83').order('created_at', { ascending: false });
    if (error) console.error('Error:', error);
    else console.log('Data:', data);
}
run();
