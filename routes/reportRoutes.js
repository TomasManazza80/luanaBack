const express = require('express');
const reportController = require('../controller/reportController.js');

const router = express.Router();

// GET /reports/ganancias-netas?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get('/ganancias-netas', reportController.getNetProfit);

module.exports = router;