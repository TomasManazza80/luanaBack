const { DataTypes } = require("sequelize");
const db = require("../../dbconnection/db");

const Payment = db.define("payment", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  vexorPaymentId: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true,
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: "ARS",
  },
  status: {
    type: DataTypes.ENUM("PENDING", "PAID", "FAILED", "REFUNDED"),
    defaultValue: "PENDING",
  },
  type: {
    type: DataTypes.ENUM("APPOINTMENT", "COURSE", "PRODUCT"),
    allowNull: false,
  },
  referenceId: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: "ID del turno, curso u orden dependiendo del type",
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  }
});

module.exports = Payment;
