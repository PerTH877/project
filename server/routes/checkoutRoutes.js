const router = require('express').Router();
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');
const {
  setCheckoutAddress,
  setCheckoutPayment,
  reviewCheckoutSummary,
} = require('../controllers/checkoutController');
const { checkout } = require('../controllers/cartController'); // Final step

// Multi-step Checkout State API
router.post('/address', authMiddleware, requireRole('user'), setCheckoutAddress);
router.post('/payment', authMiddleware, requireRole('user'), setCheckoutPayment);
router.get('/review', authMiddleware, requireRole('user'), reviewCheckoutSummary);

// Final Execute Checkout
router.post('/execute', authMiddleware, requireRole('user'), checkout);

module.exports = router;
