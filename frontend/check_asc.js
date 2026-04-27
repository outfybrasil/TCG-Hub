const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://kdwzyvfqcspuqvfpnvml.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtkd3p5dmZxY3NwdXF2ZnBudm1sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU1OTAxNCwiZXhwIjoyMDg4MTM1MDE0fQ.kQ9Ik7ZIXSCHx9-Kxo8QpNBOlDhZpcj6fppFfqInPXw'
);

async function run() {
    const setCode = 'ASC';
    console.log(`Checking cards for set ${setCode}...`);
    const { data, error, count } = await supabase
        .from('pokemon_cards')
        .select('*', { count: 'exact' })
        .eq('set_id', setCode.toLowerCase());
    
    if (error) {
        console.error('Error:', error);
    } else {
        console.log(`Found ${count} cards for ${setCode}.`);
        if (count > 0) {
            console.log('Sample card:', data[0]);
        }
    }
}
run();
