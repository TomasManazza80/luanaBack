const vexor = require('vexor');
const { encargo } = require('../models/index');
const dotenv = require('dotenv');

dotenv.config();

const { Vexor } = vexor;
const vexorInstance = new Vexor({
  publishableKey: process.env.VEXOR_PUBLISHABLE_KEY,
  projectId: process.env.VEXOR_PROJECT_ID,
  apiKey: process.env.VEXOR_API_KEY,
});

const generateSenaLink = async (req, res) => {
  try {
    const { encargoId, amount } = req.body;

    if (!encargoId || !amount) {
      return res.status(400).json({ error: 'encargoId y amount son requeridos' });
    }

    const currentEncargo = await encargo.findByPk(encargoId);
    if (!currentEncargo) {
      return res.status(404).json({ error: 'Reserva/Encargo no encontrado' });
    }

    const vexorItems = [
      {
        title: `Seña de Reserva - Orden #${currentEncargo.numeroOrden}`,
        unit_price: Number(amount),
        quantity: 1,
        description: `Cliente: ${currentEncargo.nombreCliente || 'Sin nombre'}`
      }
    ];

    // Llamada a Vexor para generar preferencia en MP
    const paymentResponse = await vexorInstance.pay.mercadopago({
      items: vexorItems,
      external_reference: encargoId.toString(),
    });

    if (paymentResponse?.payment_url) {
      return res.status(200).json({ payment_url: paymentResponse.payment_url });
    }

    throw new Error('No se recibió URL de pago desde Vexor');
  } catch (error) {
    console.error('[SenaPaymentController] Error generando link:', error);
    res.status(500).json({ error: 'Error interno al generar el link de seña' });
  }
};

const handleSenaWebhook = async (req, res) => {
  try {
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.get('host');
    req.url = `${protocol}://${host}${req.originalUrl}`;
    
    let webhookData = null;
    try {
      webhookData = await vexorInstance.webhook.mercadopago(req);
    } catch (e) {
      console.warn('Webhook parsing fallback...');
    }

    if (webhookData && (webhookData.status === 'paid' || webhookData.status === 'approved')) {
      // Vexor expone los datos crudos o el external reference (usamos data id si necesitamos consultar)
      // MP envia el external_reference en el webhook
      const encargoId = webhookData.external_reference || req.query.external_reference || req.body?.data?.external_reference || req.body?.external_reference;

      if (encargoId) {
        const currentEncargo = await encargo.findByPk(encargoId);
        if (currentEncargo) {
          const paidAmount = webhookData.transaction_amount || req.body?.data?.transaction_amount || 0;
          
          // Actualizamos la seña sumando lo pagado
          currentEncargo.senado = Number(currentEncargo.senado || 0) + Number(paidAmount);
          
          // Si el total está cubierto, se podría cambiar estado. 
          if (currentEncargo.senado >= currentEncargo.montoTotal) {
            currentEncargo.estado = 'En Proceso';
          }
          
          await currentEncargo.save();
          console.log(`[WEBHOOK SEÑA] Seña de $${paidAmount} acreditada para encargo ${encargoId}`);
        }
      }
    }

    // Siempre responder 200 a MP
    res.status(200).send('OK');
  } catch (error) {
    console.error('[SenaPaymentController] Webhook Error:', error);
    res.status(500).send('Error');
  }
};

module.exports = {
  generateSenaLink,
  handleSenaWebhook
};
