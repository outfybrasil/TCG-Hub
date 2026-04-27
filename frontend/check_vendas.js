const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://kdwzyvfqcspuqvfpnvml.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtkd3p5dmZxY3NwdXF2ZnBudm1sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU1OTAxNCwiZXhwIjoyMDg4MTM1MDE0fQ.kQ9Ik7ZIXSCHx9-Kxo8QpNBOlDhZpcj6fppFfqInPXw'
);

// Test the exact query used in /api/user/vendas
const userId = '242236f4-ce84-41fa-bcc2-1bf31909feb9';

async function run() {
    console.log('Testing .contains() query...');
    const { data, error } = await supabase
        .from('purchases')
        .select('id, items, status, payment_method')
        .contains('items', JSON.stringify([{ seller_id: userId }]));
    
    if (error) console.error('Error with contains:', error);
    else console.log('Results (contains):', data?.length, data?.map(d => d.id));

    console.log('\nTesting manual filter...');
    const { data: data2, error: err2 } = await supabase
        .from('purchases')
        .select('id, items, status, payment_method');
    
    if (err2) console.error('Error fetching all:', err2);
    else {
        const filtered = data2.filter(p => p.items?.some(i => i.seller_id === userId));
        console.log('Results (manual filter):', filtered.length, filtered.map(d => ({ id: d.id, method: d.payment_method })));
    }
}
run();
