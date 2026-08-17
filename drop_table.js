const db = require('./dbconnection/db');

async function run() {
  try {
    await db.query('DROP TABLE IF EXISTS "PronunciationTasks" CASCADE;');
    console.log('Dropped PronunciationTasks');
    await db.sync({ alter: true });
    console.log('Recreated table');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
