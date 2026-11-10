const { MercadoPagoConfig, Preference } = require('mercadopago');

class MercadoPagoService {
  constructor() {
    // Inicializar el SDK de Mercado Pago
    // Importante: Asegúrate de tener MERCADOPAGO_ACCESS_TOKEN en tu .env
    this.client = new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || 'APP_USR-12345678-031820-X-12345678',
      options: { timeout: 5000 }
    });

    this.preference = new Preference(this.client);
  }

  async createPaymentLink(payload) {
    try {
      // payload = { amount, description, metadata: { type, referenceId, userId } }
      const body = {
        items: [
          {
            id: payload.metadata.referenceId,
            title: payload.description || 'Compra en Luana Studio',
            quantity: 1,
            unit_price: Number(payload.amount),
            currency_id: 'ARS',
          }
        ],
        metadata: {
          type: payload.metadata.type,
          referenceId: payload.metadata.referenceId,
          userId: payload.metadata.userId
        },
        back_urls: {
          success: `${process.env.VITE_PUBLIC_URL || process.env.FRONTEND_URL || 'https://localhost:5173'}/checkout/success`,
          failure: `${process.env.VITE_PUBLIC_URL || process.env.FRONTEND_URL || 'https://localhost:5173'}/checkout/failure`,
          pending: `${process.env.VITE_PUBLIC_URL || process.env.FRONTEND_URL || 'https://localhost:5173'}/checkout/pending`,
        },
        auto_return: 'approved',
        notification_url: `${process.env.API_URL || 'https://tu-ngrok-url.com'}/api/payment/webhook`,
      };

      console.log("Sending MP body:", JSON.stringify(body, null, 2));
      const response = await this.preference.create({ body });

      // En modo producción se suele usar init_point, en desarrollo sandbox_init_point
      return response.init_point;
    } catch (error) {
      console.error('Error creando preferencia de Mercado Pago:', error);
      throw new Error('Error al conectar con la pasarela de Mercado Pago.');
    }
  }
}

module.exports = new MercadoPagoService();
