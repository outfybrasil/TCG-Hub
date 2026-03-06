const { MercadoPagoConfig, Payment } = require('mercadopago');

const accessToken = 'TEST-4611933323067647-011320-ec54d4efb63032b460fa3cc933a63af8-498738192';
const client = new MercadoPagoConfig({ accessToken });
const payment = new Payment(client);

async function testEmail(email) {
    try {
        console.log(`Testing email: ${email}`);
        const result = await payment.create({
            body: {
                transaction_amount: 10,
                description: 'Test Deposit',
                payment_method_id: 'pix',
                payer: {
                    email,
                    identification: { type: 'CPF', number: '12345678909' }
                }
            }
        });
        console.log(`SUCCESS for ${email}:`, result.id);
        return true;
    } catch (error) {
        console.log(`FAILED for ${email}:`, error.message, error.response?.data?.message || '');
        return false;
    }
}

async function run() {
    const variations = [
        'test_user_1476974797@testuser.com', // Based on first part of username
        'test_user_3243062343@testuser.com', // Based on User ID
        'TESTUSER1476974797582104069@testuser.com' // Based on full username
    ];

    for (const v of variations) {
        if (await testEmail(v)) break;
    }
}

run();
