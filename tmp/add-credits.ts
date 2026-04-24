import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kdwzyvfqcspuqvfpnvml.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtkd3p5dmZxY3NwdXF2ZnBudm1sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU1OTAxNCwiZXhwIjoyMDg4MTM1MDE0fQ.kQ9Ik7ZIXSCHx9-Kxo8QpNBOlDhZpcj6fppFfqInPXw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const email = 'elvertoni@gmail.com';
  console.log(`Adding 200 credits to ${email}...`);

  // 1. Find user by email
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error('Auth error:', authError);
    return;
  }

  const user = users.find(u => u.email === email);
  if (!user) {
    console.error(`User ${email} not found.`);
    return;
  }

  console.log(`Found user: ${user.id}`);

  // 2. Fetch current balance
  const { data: wallet, error: walletError } = await supabase
    .from('auction_credits')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (walletError && walletError.code !== 'PGRST116') { // PGRST116 is not found
    console.error('Error fetching wallet:', walletError);
    return;
  }

  if (wallet) {
    // Update
    const newBalance = (wallet.balance || 0) + 200;
    const { error: updateError } = await supabase
      .from('auction_credits')
      .update({ balance: newBalance })
      .eq('user_id', user.id);
    
    if (updateError) {
      console.error('Error updating balance:', updateError);
    } else {
      console.log(`Balance updated! Old: ${wallet.balance}, New: ${newBalance}`);
    }
  } else {
    // Insert
    const { error: insertError } = await supabase
      .from('auction_credits')
      .insert({
        user_id: user.id,
        balance: 200,
        locked: 0
      });
      
    if (insertError) {
      console.error('Error inserting balance:', insertError);
    } else {
      console.log(`Balance initialized with 200 credits.`);
    }
  }
}

main();
