const db = require("./dbconnection/db");
const PronunciationActivity = require("./models/pronunciationTasks/PronunciationActivity");
const PronunciationTask = require("./models/pronunciationTasks/PronunciationTask");
const models = require("./models/index"); // Make sure relationships are registered

async function updateDb() {
  try {
    await db.authenticate();
    console.log("Connected to DB.");
    
    // sync alter will add PronunciationActivities and update PronunciationTasks
    await db.sync({ alter: true });
    
    console.log("Database updated successfully for Activities.");
    process.exit(0);
  } catch (err) {
    console.error("Error updating DB:", err);
    process.exit(1);
  }
}

updateDb();
