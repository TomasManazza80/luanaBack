require('dotenv').config();
const mpService = require('./services/payments/mercadopago.service');

async function test() {
  try {
    const url = await mpService.createPaymentLink({
      amount: 1000,
      description: 'Test',
      metadata: { type: 'PRODUCT', referenceId: 'test_123', userId: 1 }
    });
    console.log("Success:", url);
  } catch (error) {
    console.error("Error from MP:");
    console.error(error);
  }
}

test();
