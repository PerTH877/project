const router = require('express').Router();
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');
const {
  getCartItems,
  addToCart,
  updateCartItem,
  removeCartItem,
} = require('../controllers/cartController');

router.get('/', authMiddleware, requireRole('user'), getCartItems);
router.post('/', authMiddleware, requireRole('user'), addToCart);
router.put('/:cart_id', authMiddleware, requireRole('user'), updateCartItem);
router.delete('/:cart_id', authMiddleware, requireRole('user'), removeCartItem);

module.exports = router;