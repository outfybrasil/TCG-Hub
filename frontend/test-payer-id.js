const { MercadoPagoConfig, Payment } = require('mercadopago');

const accessToken = 'TEST-4611933323067647-011320-ec54d4efb63032b460fa3cc933a63af8-498738192';
const client = new MercadoPagoConfig({ accessToken });
const payment = new Payment(client);

async function testPayerId(id) {
    try {
        console.log(`Testing Payer ID: ${id}`);
        const result = await payment.create({
            body: {
                transaction_amount: 10,
                description: 'Test Deposit',
                payment_method_id: 'pix',
                payer: {
                    id: id
                }
            }
        });
        console.log(`SUCCESS for Payer ID ${id}:`, result.id);
        return true;
    } catch (error) {
        console.log(`FAILED for Payer ID ${id}:`, error.message, error.response?.data?.message || '');
        return false;
    }
}

testPayerId('3243062343');
