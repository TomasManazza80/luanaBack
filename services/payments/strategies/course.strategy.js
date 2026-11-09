const db = require('../../../dbconnection/db');
const Payment = require('../../../models/payments/payment');
// const CourseAccess = require('../../../models/courses/courseAccess');

class CourseStrategy {
  async processPayment(context) {
    if (!context.userId) throw new Error('UserId es requerido para cursos');

    const t = await db.transaction();
    try {
      await Payment.update(
        { status: 'PAID', vexorPaymentId: context.vexorPaymentId },
        { where: { referenceId: context.referenceId, type: 'COURSE' }, transaction: t }
      );

      // Ejemplo: Dar acceso al curso
      /*
      await CourseAccess.create(
        { userId: context.userId, courseId: context.referenceId },
        { transaction: t }
      );
      */
      
      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}

module.exports = new CourseStrategy();
