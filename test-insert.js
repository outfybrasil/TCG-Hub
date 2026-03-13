const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'frontend/.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
    const { data: purchaseData, error: purchaseError } = await supabase.from('purchases').insert({
        user_id: 'a0044fa9-b883-4a17-ba61-8ff8a17621be', // random uuid structure just to test foreign key or row error
        items: [],
        total_amount: 10,
        discount_amount: 0,
        cashback_earned: 0,
        payment_method: 'mercadopago_checkout',
        mp_payment_id: null,
        shipping_address: null,
        status: 'pending'
    }).select('id').single();

    console.log("DB ERROR IS:", purchaseError);
}
run();
