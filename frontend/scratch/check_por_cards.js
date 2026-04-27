
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://kdwzyvfqcspuqvfpnvml.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtkd3p5dmZxY3NwdXF2ZnBudm1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NTkwMTQsImV4cCI6MjA4ODEzNTAxNH0.gz0qYTQn_m7tE8OPdpn5B6OgZh2u7Nuj38SgO6YRhWI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCards() {
    const { data, error } = await supabase
        .from('pokemon_cards')
        .select('id, name, local_id')
        .eq('set_id', 'sv09')
        .limit(1);
    console.log('Cards in sv09:', data);
    
    const { data: sv10, error: err10 } = await supabase
        .from('pokemon_cards')
        .select('id, name, local_id')
        .eq('set_id', 'sv10')
        .limit(1);
    console.log('Cards in sv10:', sv10);
}
checkCards();
