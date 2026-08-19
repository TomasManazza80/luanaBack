const express = require('express');
const pronunciationController = require('../controller/pronunciationController.js');

const router = express.Router();

// Admin routes for managing tasks
router.post("/activities", pronunciationController.createActivity);
router.get("/activities", pronunciationController.getActivities);
router.post("/activities/:id/clone", pronunciationController.cloneActivity);
router.post("/tasks", pronunciationController.createTask);
router.get("/tasks", pronunciationController.getTasks);
router.put("/tasks/:id", pronunciationController.updateTask);
router.delete("/tasks/:id", pronunciationController.deleteTask);

// Student route for evaluating pronunciation
router.post("/evaluate", pronunciationController.evaluateAttempt);
router.post("/activity-complete", pronunciationController.completeActivity);
router.post('/companion-context', pronunciationController.getCompanionContext);
router.post("/generate-tasks", pronunciationController.generateTasks);

// Leaderboard route
router.get("/leaderboard", pronunciationController.getLeaderboard);

module.exports = router;
