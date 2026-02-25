const router = require('express').Router();
const { registerSeller ,loginSeller } = require('../controllers/sellerController');

router.post('/register', registerSeller);
router.post('/login',loginSeller);


module.exports = router;