const Sequelize = require("sequelize");
const db = require("../../dbconnection/db");

const PronunciationTask = db.define("PronunciationTask", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  title: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  instruction: {
    type: Sequelize.TEXT,
  },
  expected_text: {
    type: Sequelize.JSON,
    allowNull: false,
  },
  activity_id: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
}, {
  timestamps: true,
});

module.exports = PronunciationTask;
