const db = require('./dbconnection/db');
const models = require('./models/index');
const { Op } = require('sequelize');

async function run() {
  try {
    const sequelize = models.StudentAttempt.sequelize;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const leaderboard = await models.StudentAttempt.findAll({
      attributes: [
        'student_id',
        [sequelize.fn('SUM', sequelize.col('score')), 'total_score']
      ],
      where: {
        createdAt: {
          [Op.gte]: startOfMonth
        },
        student_id: {
          [Op.ne]: null
        }
      },
      group: ['student_id', 'user.id'],
      include: [{
        model: models.user,
        attributes: ['name', 'email']
      }],
      order: [[sequelize.literal('total_score'), 'DESC']],
      limit: 10
    });
    console.log("Success:", leaderboard);
    process.exit(0);
  } catch(e) {
    console.error("DB Error:", e);
    process.exit(1);
  }
}
run();
