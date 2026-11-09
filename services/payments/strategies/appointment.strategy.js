const db = require('../../../dbconnection/db');
const Payment = require('../../../models/payments/payment');
// Nota: Deberías importar tu modelo real de Appointment aquí si lo tienes.
// const Appointment = require('../../../models/appointments/appointment');

class AppointmentStrategy {
  async processPayment(context) {
    const t = await db.transaction();
    try {
      // 1. Actualizar Pago
      await Payment.update(
        { status: 'PAID', vexorPaymentId: context.vexorPaymentId },
        { where: { referenceId: context.referenceId, type: 'APPOINTMENT' }, transaction: t }
      );

      // 2. Confirmar Turno (Descomentar e importar modelo real)
      /*
      await Appointment.update(
        { status: 'CONFIRMED' },
        { where: { id: context.referenceId }, transaction: t }
      );
      */
      
      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}

module.exports = new AppointmentStrategy();
