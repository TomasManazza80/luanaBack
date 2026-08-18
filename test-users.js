const db = require('./dbconnection/db');
const models = require('./models/index');

async function run() {
  try {
    const user = await models.user.findOne({ where: { email: 'tomas.manazza8@gmail.com' }});
    console.log("User:", user ? user.toJSON() : 'Not found');
    process.exit(0);
  } catch(e) {
    console.error("DB Error:", e);
    process.exit(1);
  }
}
run();
