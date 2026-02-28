const router = require('express').Router();
const { getAllWarehouses, createWarehouse } = require('../controllers/warehouseController');
const { authMiddleware, requireRole } = require("../middleware/authMiddleware");

router.get('/', getAllWarehouses);
router.post('/', authMiddleware, requireRole("admin"), createWarehouse);

module.exports = router;