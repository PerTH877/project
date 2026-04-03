const userService = require("../services/user.service");

const registerUser = async (req, res, next) => {
  try {
    const user = await userService.registerUser(req.body);
    return res.status(201).json({ message: "User registered securely", user });
  } catch (err) {
    return next(err);
  }
};

const loginUser = async (req, res, next) => {
  try {
    const result = await userService.loginUser(req.body);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
};

const getCurrentUser = async (req, res, next) => {
  const userId = req.user?.user_id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const user = await userService.getCurrentUser(userId);
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
};

const updateProfile = async (req, res, next) => {
  const userId = req.user?.user_id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const user = await userService.updateProfile(userId, req.body);
    return res.json({ message: "Profile updated", user });
  } catch (err) {
    return next(err);
  }
};

const getUserHistory = async (req, res, next) => {
  const userId = req.user?.user_id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const history = await userService.getUserHistory(userId);
    return res.json({ history });
  } catch (err) {
    return next(err);
  }
};

module.exports = { registerUser, loginUser, getCurrentUser, updateProfile, getUserHistory };
