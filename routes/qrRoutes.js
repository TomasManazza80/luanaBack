const express = require('express');
const router = express.Router();
const whatsappController = require('../controller/qrController');

router.get('/status', whatsappController.getWhatsappStatus);
router.post('/start', whatsappController.startWhatsapp);
router.post('/restart', whatsappController.restartWhatsapp);
router.post('/disconnect', whatsappController.disconnectWhatsapp);
router.post('/template', whatsappController.saveTemplate);
router.post('/send-message', whatsappController.sendWhatsappMessage);

module.exports = router;