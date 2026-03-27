const adminService = require("../services/admin.service");

const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || typeof email !== "string") {
      return res
        .status(400)
        .json({ error: "email is required and must be a string" });
    }
    if (!password || typeof password !== "string") {
      return res
        .status(400)
        .json({ error: "password is required and must be a string" });
    }

    adminService.verifyAdminCredentials(email, password);
    const token = adminService.generateAdminToken(email);

    return res.json({ token });
  } catch (err) {
    console.error("adminLogin:", err.message);
    if (err.message === "Invalid admin credentials") {
      return res.status(401).json({ error: "Invalid admin credentials" });
    }
    if (err.message.includes("not configured")) {
      return res
        .status(500)
        .json({ error: "Admin credentials are not configured on the server" });
    }
    return res.status(500).json({ error: "Server error" });
  }
};

const getCurrentAdmin = async (req, res) => {
  if (!req.user?.email || req.user.role !== "admin") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  return res.json({
    admin: {
      email: req.user.email,
      role: req.user.role,
    },
  });
};

const listPendingSellers = async (req, res) => {
  try {
    const data = await adminService.getPendingSellers();
    return res.json(data);
  } catch (err) {
    console.error("listPendingSellers:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

const verifySeller = async (req, res) => {
  try {
    const sellerId = Number(req.params.seller_id);
    if (!Number.isInteger(sellerId) || sellerId <= 0) {
      return res
        .status(400)
        .json({ error: "seller_id must be a positive integer" });
    }

    const seller = await adminService.processSellerVerification(sellerId);

    return res.json({ message: "Seller verified", seller });
  } catch (err) {
    console.error("verifySeller:", err.message);
    if (err.message === "Seller not found") {
      return res.status(404).json({ error: "Seller not found" });
    }
    return res.status(500).json({ error: "Server error" });
  }
};

const getAdminOverview = async (req, res) => {
  try {
    const data = await adminService.formatAdminOverview();
    return res.json(data);
  } catch (err) {
    console.error("getAdminOverview:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

const getSellerPerformance = async (req, res) => {
  try {
    const data = await adminService.formatSellerPerformance();
    return res.json(data);
  } catch (err) {
    console.error("getSellerPerformance:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

const getCategoryPerformance = async (req, res) => {
  try {
    const data = await adminService.formatCategoryPerformance();
    return res.json(data);
  } catch (err) {
    console.error("getCategoryPerformance:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

const getDemandOpportunities = async (req, res) => {
  try {
    const data = await adminService.formatDemandOpportunities();
    return res.json(data);
  } catch (err) {
    console.error("getDemandOpportunities:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

const getWarehousePressure = async (req, res) => {
  try {
    const data = await adminService.formatWarehousePressure();
    return res.json(data);
  } catch (err) {
    console.error("getWarehousePressure:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

const getGeographicDemand = async (req, res) => {
  try {
    const data = await adminService.formatGeographicDemand();
    return res.json(data);
  } catch (err) {
    console.error("getGeographicDemand:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

const getReturnsRisk = async (req, res) => {
  try {
    const data = await adminService.formatReturnsRisk();
    return res.json(data);
  } catch (err) {
    console.error("getReturnsRisk:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

const getInventoryRisk = async (req, res) => {
  try {
    const data = await adminService.formatInventoryRisk();
    return res.json(data);
  } catch (err) {
    console.error("getInventoryRisk:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

const getConversionSignals = async (req, res) => {
  try {
    const data = await adminService.formatConversionSignals();
    return res.json(data);
  } catch (err) {
    console.error("getConversionSignals:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

const getTopCategories = async (req, res) => {
  try {
    const data = await adminService.formatTopCategories();
    return res.json(data);
  } catch (err) {
    console.error("getTopCategories:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

const getTopSellers = async (req, res) => {
  try {
    const data = await adminService.formatTopSellers();
    return res.json(data);
  } catch (err) {
    console.error("getTopSellers:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

const getTopProducts = async (req, res) => {
  try {
    const data = await adminService.formatTopProducts();
    return res.json(data);
  } catch (err) {
    console.error("getTopProducts:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  adminLogin,
  getCurrentAdmin,
  getAdminOverview,
  getSellerPerformance,
  getCategoryPerformance,
  getDemandOpportunities,
  getWarehousePressure,
  getGeographicDemand,
  getReturnsRisk,
  getInventoryRisk,
  getConversionSignals,
  listPendingSellers,
  verifySeller,
  getTopCategories,
  getTopSellers,
  getTopProducts,
};
