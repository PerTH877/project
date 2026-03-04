const router = require('express').Router();
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');
const {
  createWishlist,
  getWishlists,
  addWishlistItem,
  removeWishlistItem,
} = require('../controllers/wishlistController');

router.get('/', authMiddleware, requireRole('user'), getWishlists);
router.post('/', authMiddleware, requireRole('user'), createWishlist);
router.post('/:wishlist_id/items', authMiddleware, requireRole('user'), addWishlistItem);
router.delete('/:wishlist_id/items/:variant_id', authMiddleware, requireRole('user'), removeWishlistItem);

module.exports = router;