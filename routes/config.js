const express = require('express');
const router = express.Router();
const configController = require('../controller/config.controller');

// Rutas públicas (lectura)
router.get('/reservation-fee', configController.getReservationFee);

// Rutas de administrador (escritura)
// IMPORTANTE: En producción, deberías agregar un middleware como verifyAdminToken aquí.
router.put('/reservation-fee', configController.setReservationFee);

module.exports = router;
