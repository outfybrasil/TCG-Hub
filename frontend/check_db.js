const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf-8');
const extractEnv = (key) => {
    const match = envFile.match(new RegExp(`${key}=(.*)`));
    return match ? match[1].trim() : null;
};

const supabase = createClient(
    extractEnv('NEXT_PUBLIC_SUPABASE_URL'),
    extractEnv('SUPABASE_SERVICE_ROLE_KEY')
);

async function check() {
    const { data: listings, error } = await supabase.from('seller_listings').select('*');
    if (error) console.error('Error fetching listings:', error);
    else console.log('Listings in DB:', listings);
}

check();
