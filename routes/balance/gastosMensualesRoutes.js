const express = require('express');
const router = express.Router();
const monthlyExpenseController = require('../../controller/balance/gastosMensualesController.js');

router.post('/crearGastoMensual', monthlyExpenseController.createExpense);
router.get('/obtenerGastosMensuales', monthlyExpenseController.getAllExpenses);
router.put('/confirmarPago/:id', monthlyExpenseController.confirmPayment);
router.put('/actualizarGasto/:id', monthlyExpenseController.updateExpense);
router.post('/notificar/:id', monthlyExpenseController.notifyExpense);
router.delete('/eliminarGastoMensual/:id', monthlyExpenseController.deleteExpense);
router.put('/resetGastos', monthlyExpenseController.resetExpenses);

module.exports = router;
