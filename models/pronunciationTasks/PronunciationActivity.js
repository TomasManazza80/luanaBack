const Sequelize = require("sequelize");
const db = require("../../dbconnection/db");

const PronunciationActivity = db.define("PronunciationActivity", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  title: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  description: {
    type: Sequelize.TEXT,
  },
  assigned_date: {
    type: Sequelize.DATEONLY,
    allowNull: false,
  },
}, {
  timestamps: true,
});

module.exports = PronunciationActivity;
