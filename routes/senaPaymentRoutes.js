const express = require('express');
const router = express.Router();
const senaController = require('../controller/senaPaymentController');

router.post('/generate-link', senaController.generateSenaLink);
router.post('/webhook', senaController.handleSenaWebhook);

module.exports = router;
