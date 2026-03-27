const router = require('express').Router();
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');
const {
  getCartItems,
  addToCart,
  updateCartItem,
  removeCartItem,
  getCartTotal,
  toggleSaveForLater,
} = require('../controllers/cartController');

// Define the '/total' route before the parameterised route so that it
// doesn't get captured by the :cart_id pattern.  This endpoint returns
// the computed cart total for the authenticated user.
router.get('/total', authMiddleware, requireRole('user'), getCartTotal);


// Standard cart CRUD endpoints
router.get('/', authMiddleware, requireRole('user'), getCartItems);
router.post('/', authMiddleware, requireRole('user'), addToCart);
router.put('/:cart_id', authMiddleware, requireRole('user'), updateCartItem);
router.patch('/:cart_id/save', authMiddleware, requireRole('user'), toggleSaveForLater);
router.delete('/:cart_id', authMiddleware, requireRole('user'), removeCartItem);

module.exports = router;