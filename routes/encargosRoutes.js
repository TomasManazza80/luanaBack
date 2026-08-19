const express = require('express');
const router = express.Router();
const controller = require('../controller/encargosController.js');

router.get('/', controller.getAll);
router.post('/', controller.create);
router.patch('/:id', controller.update);
router.patch('/:id/status', controller.updateStatus);
router.post('/:id/notify', controller.notifyClient);
router.delete('/:id', controller.delete);

module.exports = router;