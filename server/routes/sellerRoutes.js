const router = require('express').Router();
const { registerSeller } = require('../controllers/sellerController');

// Define what happens when a POST request hits /register
router.post('/register', registerSeller);

module.exports = router;