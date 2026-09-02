const { DataTypes } = require("sequelize");
const Sequelize = require("../dbconnection/db");

const WhatsappSession = Sequelize.define("WhatsappSession", {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  data: {
    type: DataTypes.TEXT, // Se guarda como JSON text
    allowNull: false,
  },
}, {
  timestamps: true,
});

module.exports = WhatsappSession;
