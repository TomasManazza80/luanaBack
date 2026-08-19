const express = require('express');
const categoryController = require('../controller/categoryController.js');

const router = express.Router();

router.get('/', categoryController.getAll);
router.post('/', categoryController.create);
router.delete('/:id', categoryController.delete);

module.exports = router;