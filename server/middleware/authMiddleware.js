const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const header = req.header("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; 
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  return next();
};

module.exports = { authMiddleware, requireRole };