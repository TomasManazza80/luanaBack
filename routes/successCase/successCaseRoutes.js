const express = require('express');
const successCaseController = require('../../controller/successCase/successCaseController.js');

const router = express.Router();

router.get('/get', successCaseController.getAll);
router.post('/post', successCaseController.create);
router.delete('/delete/:id', successCaseController.delete);

module.exports = router;