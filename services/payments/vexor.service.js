const axios = require('axios');

class VexorService {
  constructor() {
    this.apiKey = process.env.VEXOR_API_KEY;
    this.apiUrl = 'https://api.vexor.com/v1';
  }

  async createPaymentLink(payload) {
    try {
      // Vexor requiere un payload con monto, descripción, etc.
      // Aquí estamos simulando la estructura esperada por la pasarela.
      const backendUrl = (process.env.BACKEND_URL || process.env.API_URL || 'https://luanaback.onrender.com').replace(/\/$/, '');
      const frontendUrl = (process.env.FRONTEND_URL || process.env.VITE_PUBLIC_URL || 'https://luanstudiosf.com').replace(/\/$/, '');
      const response = await axios.post(
        `${this.apiUrl}/payments`,
        {
          amount: payload.amount,
          description: payload.description,
          metadata: payload.metadata,
          webhook_url: `${backendUrl}/api/mercadopago/webhook`,
          return_url: `${frontendUrl}/checkout/success`,
        },
        {
          headers: { Authorization: `Bearer ${this.apiKey}` },
        }
      );
      
      return response.data.checkout_url;
    } catch (error) {
      console.error('Error creando pago en Vexor:', error?.response?.data || error.message);
      // Fallback para entorno local o desarrollo si no hay token real
      if (process.env.NODE_ENV === 'development') {
        console.log("Mocking Vexor response for development");
        return "https://sandbox.vexor.com/checkout/mock_id";
      }
      throw new Error('Error al conectar con la pasarela de pagos Vexor.');
    }
  }
}

module.exports = new VexorService();
