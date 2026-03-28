const router = require('express').Router();
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');
const {
  setCheckoutAddress,
  setCheckoutPayment,
  reviewCheckoutSummary,
  executeCheckout,
} = require('../controllers/checkoutController');


router.post('/address', authMiddleware, requireRole('user'), setCheckoutAddress);
router.post('/payment', authMiddleware, requireRole('user'), setCheckoutPayment);
router.get('/review', authMiddleware, requireRole('user'), reviewCheckoutSummary);


router.post('/execute', authMiddleware, requireRole('user'), executeCheckout);

module.exports = router;
