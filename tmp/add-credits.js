const SUPABASE_URL = 'https://kdwzyvfqcspuqvfpnvml.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtkd3p5dmZxY3NwdXF2ZnBudm1sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU1OTAxNCwiZXhwIjoyMDg4MTM1MDE0fQ.kQ9Ik7ZIXSCHx9-Kxo8QpNBOlDhZpcj6fppFfqInPXw';
const EMAIL = 'elvertoni@gmail.com';

async function main() {
    console.log(`Buscando usuario ${EMAIL}...`);
    
    const headers = {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
    };

    // 1. Pegar user da API de admin do auth
    let userId = null;
    const resUsers = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, { headers });
    const dataUsers = await resUsers.json();
    
    if (!resUsers.ok) {
        console.error('Erro buscando usuarios:', dataUsers);
        return;
    }

    const user = dataUsers.users.find(u => u.email === EMAIL);
    if (!user) {
        console.error('Usuario nao encontrado:', EMAIL);
        return;
    }
    
    userId = user.id;
    console.log(`Usuario encontrado! ID: ${userId}`);

    // 2. Buscar wallet atual
    const resWallet = await fetch(`${SUPABASE_URL}/rest/v1/auction_credits?user_id=eq.${userId}&select=*`, { headers });
    const dataWallet = await resWallet.json();
    
    if (dataWallet.length > 0) {
        const wallet = dataWallet[0];
        const newBalance = (wallet.balance || 0) + 200;
        
        // Update
        const resUpdate = await fetch(`${SUPABASE_URL}/rest/v1/auction_credits?user_id=eq.${userId}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ balance: newBalance })
        });
        
        if (!resUpdate.ok) {
            console.error('Erro ao atualizar saldo:', await resUpdate.text());
        } else {
            console.log(`Saldo atualizado com sucesso! Antigo: ${wallet.balance}, Novo: ${newBalance}`);
        }
    } else {
        // Insert
        const resInsert = await fetch(`${SUPABASE_URL}/rest/v1/auction_credits`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ user_id: userId, balance: 200, locked: 0 })
        });
        
        if (!resInsert.ok) {
            console.error('Erro ao inserir saldo:', await resInsert.text());
        } else {
            console.log(`Saldo inserido com sucesso (200 creditos).`);
        }
    }
}

main();
