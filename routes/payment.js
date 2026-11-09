const express = require('express');
const router = express.Router();
const paymentController = require('../controller/payment.controller');

router.post('/create', paymentController.createPayment);
router.post('/webhook', express.json({ type: 'application/json' }), paymentController.handleWebhook);

module.exports = router;
