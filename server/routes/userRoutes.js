const router = require('express').Router();
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');
const { registerUser, loginUser, getCurrentUser, updateProfile } = require('../controllers/userController');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', authMiddleware, requireRole('user'), getCurrentUser);
router.patch('/profile', authMiddleware, requireRole('user'), updateProfile);


module.exports = router;
