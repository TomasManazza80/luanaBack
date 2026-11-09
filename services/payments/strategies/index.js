const appointmentStrategy = require('./appointment.strategy');
const courseStrategy = require('./course.strategy');
const productStrategy = require('./product.strategy');

module.exports = {
  APPOINTMENT: appointmentStrategy,
  COURSE: courseStrategy,
  PRODUCT: productStrategy,
};
