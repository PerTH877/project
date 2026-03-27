const router = require('express').Router();
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');
const {
  setCheckoutAddress,
  setCheckoutPayment,
  reviewCheckoutSummary,
  executeCheckout,
} = require('../controllers/checkoutController');

// Multi-step Checkout State API
router.post('/address', authMiddleware, requireRole('user'), setCheckoutAddress);
router.post('/payment', authMiddleware, requireRole('user'), setCheckoutPayment);
router.get('/review', authMiddleware, requireRole('user'), reviewCheckoutSummary);

// Final Execute Checkout (order execution, inventory deduction, payment + shipment)
router.post('/execute', authMiddleware, requireRole('user'), executeCheckout);

module.exports = router;
