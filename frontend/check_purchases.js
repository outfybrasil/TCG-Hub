const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://kdwzyvfqcspuqvfpnvml.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtkd3p5dmZxY3NwdXF2ZnBudm1sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU1OTAxNCwiZXhwIjoyMDg4MTM1MDE0fQ.kQ9Ik7ZIXSCHx9-Kxo8QpNBOlDhZpcj6fppFfqInPXw'
);

async function run() {
    console.log('Fetching purchases for live aaa948ea-bc79-4f94-822d-9d419d095a83...');
    // purchases have is_live = true, live_id = '...'
    const { data, error } = await supabase.from('purchases').select('*').order('created_at', { ascending: false }).limit(2);
    if (error) console.error('Error:', error);
    else console.log('Recent Purchases:', JSON.stringify(data, null, 2));
}
run();
