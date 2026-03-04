const router = require('express').Router();
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');
const {
  createAddress,
  getAddresses,
  updateAddress,
  deleteAddress,
} = require('../controllers/addressController');

router.get('/', authMiddleware, requireRole('user'), getAddresses);
router.post('/', authMiddleware, requireRole('user'), createAddress);
router.put('/:address_id', authMiddleware, requireRole('user'), updateAddress);
router.delete('/:address_id', authMiddleware, requireRole('user'), deleteAddress);

module.exports = router;