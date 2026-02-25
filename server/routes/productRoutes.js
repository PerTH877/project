const router = require('express').Router();
const { addProduct } = require('../controllers/productController');
const {authMiddleware} = require('../middleware/authMiddleware');

router.post('/add', authMiddleware, addProduct);

module.exports = router;