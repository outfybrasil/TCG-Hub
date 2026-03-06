const { MercadoPagoConfig, Payment } = require('mercadopago');

const accessToken = 'TEST-4611933323067647-011320-ec54d4efb63032b460fa3cc933a63af8-498738192';
const client = new MercadoPagoConfig({ accessToken });
const payment = new Payment(client);

async function testFinal() {
    const email = 'TESTUSER1476974797582104069@testuser.com';
    try {
        console.log(`Testing exact email: ${email}`);
        const result = await payment.create({
            body: {
                transaction_amount: 10,
                description: 'Test Deposit',
                payment_method_id: 'pix',
                payer: {
                    email: email,
                    identification: { type: 'CPF', number: '11804338907' }
                }
            }
        });
        console.log(`SUCCESS! ID: ${result.id}`);
    } catch (error) {
        console.log(`FAILED:`, error.message);
        if (error.response) {
            console.log(`Detailed Error:`, JSON.stringify(error.response.data, null, 2));
        }
    }
}

testFinal();
