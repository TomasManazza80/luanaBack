const crypto = require('crypto');
const mercadopagoService = require('../services/payments/mercadopago.service');
const Payment = require('../models/payments/payment');
const GlobalConfig = require('../models/gastos/GlobalConfig');
const User = require('../models/users/user');
const strategies = require('../services/payments/strategies');
const { Payment: MPPayment } = require('mercadopago');

exports.createPayment = async (req, res) => {
  try {
    let { type, referenceId, amount, description, userId } = req.body;

    // Si es un turno, buscar la tarifa del administrador
    if (type === 'APPOINTMENT') {
      const configFee = await GlobalConfig.findOne({ where: { key: 'RESERVATION_FEE' } });
      if (configFee) {
        amount = parseFloat(configFee.value);
      }
    }

    // Comprobar si el usuario es Admin para bypassear el pago
    if (userId) {
      const userObj = await User.findByPk(userId);
      if (userObj && userObj.role === 'admin') {
        const strategy = strategies[type];
        if (strategy) {
          const mockMpId = 'admin_bypass_' + Date.now();
          
          await Payment.create({
            amount: 0, 
            type,
            referenceId,
            userId,
            status: 'PENDING'
          });

          await strategy.processPayment({
            referenceId,
            vexorPaymentId: mockMpId, // reutilizamos el campo en la BD o lo cambias a mpPaymentId
            userId
          });

          return res.status(200).json({ 
            checkoutUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout/success` 
          });
        }
      }
    }

    // Crear link en Mercado Pago
    const checkoutUrl = await mercadopagoService.createPaymentLink({
      amount,
      description,
      metadata: { type, referenceId, userId }
    });

    // Guardar el Payment inicial como PENDING en nuestra DB
    await Payment.create({
      amount,
      type,
      referenceId,
      userId,
      status: 'PENDING'
    });

    res.status(200).json({ checkoutUrl });
  } catch (error) {
    console.error('Error in createPayment:', error);
    res.status(500).json({ error: 'Failed to create payment link' });
  }
};

exports.handleWebhook = async (req, res) => {
  try {
    // 1. Verificación de firma (Signature) de Mercado Pago
    const signatureHeader = req.headers['x-signature'];
    const requestId = req.headers['x-request-id'];
    const secret = process.env.MP_WEBHOOK_SECRET;

    if (signatureHeader && secret) {
      const parts = signatureHeader.split(',');
      let ts, hash;
      parts.forEach(part => {
        const [key, value] = part.split('=');
        if (key === 'ts') ts = value;
        if (key === 'v1') hash = value;
      });

      const manifest = `id:${req.query["data.id"]};request-id:${requestId};ts:${ts};`;
      const expectedHash = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

      if (hash !== expectedHash) {
        console.error("Firma de Mercado Pago inválida");
        return res.status(401).send("Unauthorized");
      }
    }

    // 2. Extraer ID del evento
    const action = req.body.action || req.query.topic;
    // La nueva API manda type="payment" y data.id
    if (req.body.type === 'payment' || action === 'payment.created' || action === 'payment.updated') {
      const paymentId = req.body?.data?.id || req.query["data.id"] || req.query.id;
      
      if (!paymentId) return res.status(400).send("No payment ID");

      // 3. Consultar a la API de MP la verdad absoluta del pago (Zero Trust)
      const mpPayment = new MPPayment(mercadopagoService.client);
      const paymentData = await mpPayment.get({ id: paymentId });

      if (paymentData.status === 'approved') {
        const { type, referenceId, userId } = paymentData.metadata;

        // Validar idempotencia: comprobar si ya procesamos este pago
        const existingPayment = await Payment.findOne({ where: { vexorPaymentId: paymentId.toString() } });
        if (!existingPayment) {
          const strategy = strategies[type];
          if (strategy) {
            await strategy.processPayment({
              referenceId: referenceId,
              vexorPaymentId: paymentId.toString(),
              userId: userId
            });
          }
        }
      }
    }

    // Retornamos 200 rápido a MP para confirmar recepción
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error in MP Webhook:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
