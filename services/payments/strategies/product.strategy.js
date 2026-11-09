const db = require('../../../dbconnection/db');
const Payment = require('../../../models/payments/payment');
const Order = require('../../../models/orders/order');
// const Product = require('../../../models/products/product');

class ProductStrategy {
  async processPayment(context) {
    const t = await db.transaction();
    try {
      await Payment.update(
        { status: 'PAID', vexorPaymentId: context.vexorPaymentId },
        { where: { referenceId: context.referenceId, type: 'PRODUCT' }, transaction: t }
      );

      await Order.update(
        { state: 'PAID' }, // Asumiendo que el campo estado existe en tu Order
        { where: { id: context.referenceId }, transaction: t }
      );

      // Lógica de descuento de stock si es necesario:
      /*
      const order = await Order.findByPk(context.referenceId, { transaction: t });
      // Iterar por items y descontar stock...
      */

      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}

module.exports = new ProductStrategy();
