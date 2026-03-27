const router = require('express').Router();
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');
const requireVerifiedSeller = require('../middleware/requireVerifiedSeller');
const { getAllWarehouses, createWarehouse, restockInventory } = require('../controllers/warehouseController');

router.get('/', getAllWarehouses);
router.post('/', authMiddleware, requireRole('admin'), createWarehouse);
router.post(
  '/restock',
  authMiddleware,
  requireRole('seller'),
  requireVerifiedSeller,
  restockInventory
);

module.exports = router;