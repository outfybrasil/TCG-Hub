const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://kdwzyvfqcspuqvfpnvml.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtkd3p5dmZxY3NwdXF2ZnBudm1sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU1OTAxNCwiZXhwIjoyMDg4MTM1MDE0fQ.kQ9Ik7ZIXSCHx9-Kxo8QpNBOlDhZpcj6fppFfqInPXw'
);

async function run() {
    console.log('Listing tables...');
    const { data, error } = await supabase.rpc('get_tables'); // if exists
    if (error) {
        console.log('RPC failed, trying raw query or checking public schema');
        const { data: tables, error: err2 } = await supabase.from('pg_catalog.pg_tables').select('tablename').eq('schemaname', 'public');
        if (err2) {
             // Fallback: try common names
             const check = async (name) => {
                 const { error } = await supabase.from(name).select('*').limit(1);
                 return !error;
             };
             console.log('pokemon_cards exists:', await check('pokemon_cards'));
             console.log('tcg_sets exists:', await check('tcg_sets'));
             console.log('pokemon_sets exists:', await check('pokemon_sets'));
        } else {
            console.log('Tables:', tables);
        }
    } else {
        console.log('Data:', data);
    }
}
run();
