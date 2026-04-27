const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://kdwzyvfqcspuqvfpnvml.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtkd3p5dmZxY3NwdXF2ZnBudm1sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU1OTAxNCwiZXhwIjoyMDg4MTM1MDE0fQ.kQ9Ik7ZIXSCHx9-Kxo8QpNBOlDhZpcj6fppFfqInPXw'
);

const userId = '242236f4-ce84-41fa-bcc2-1bf31909feb9';

async function run() {
    const { data: purchases, error } = await supabase
        .from('purchases')
        .select('*')
        .filter('items', 'cs', JSON.stringify([{ seller_id: userId }]))
        .order('created_at', { ascending: false });

    if (error) {
        console.error('ERRO:', error);
        return;
    }

    console.log(`✅ Encontrou ${purchases.length} vendas`);
    purchases.forEach(p => {
        const myItems = p.items?.filter(i => i.seller_id === userId) || [];
        console.log(`  - ${p.id.split('-')[0]} | ${myItems.map(i => i.name).join(', ')} | R$${p.total_amount}`);
    });
}
run();
