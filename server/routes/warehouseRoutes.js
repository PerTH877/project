const router = require('express').Router();
const { getAllWarehouses, createWarehouse } = require('../controllers/warehouseController');

// Define what happens when a specific HTTP method hits '/'
router.get('/', getAllWarehouses);
router.post('/', createWarehouse);

module.exports = router;