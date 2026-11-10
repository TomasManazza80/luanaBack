import express from 'express';
import * as publicController from '../controllers/publicController.js';

const router = express.Router();

router.get('/professionals', publicController.getPublicProfessionals);
router.get('/available-slots', publicController.getAvailableSlots);
router.post('/appointments', publicController.createPublicAppointment);
router.get('/appointments/:id/status', publicController.getPublicAppointmentStatus);
router.post('/webhook/mercadopago', publicController.handleMercadoPagoWebhook);

export default router;
