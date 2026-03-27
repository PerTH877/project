const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const adminRepository = require("../repositories/admin.repository");

/**
 * Service Layer - Business logic, data formatting, and transaction management.
 * No Express req/res objects. Calls repository methods.
 */

const asNumber = (value) => Number(value ?? 0);

// JWT signing and credential verification
const generateAdminToken = (email) => {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    throw new Error("Admin credentials are not configured on the server");
  }

  const token = jwt.sign(
    { role: "admin", email },
    process.env.JWT_SECRET,
    { expiresIn: "2h" }
  );

  return token;
};

const verifyAdminCredentials = (email, password) => {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    throw new Error("Admin credentials are not configured on the server");
  }

  if (email !== process.env.ADMIN_EMAIL || password !== process.env.ADMIN_PASSWORD) {
    throw new Error("Invalid admin credentials");
  }
};

// Transaction-based seller verification
const processSellerVerification = async (sellerId) => {
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const updated = await adminRepository.verifySellerId(client, sellerId);

    if (updated.length === 0) {
      await client.query("ROLLBACK");
      throw new Error("Seller not found");
    }

    await client.query("COMMIT");
    return updated[0];
  } catch (err) {
    if (client) await client.query("ROLLBACK");
    throw err;
  } finally {
    if (client) client.release();
  }
};

// Analytics data formatting and mapping
const formatAdminOverview = async () => {
  const data = await adminRepository.getAdminOverviewData();
  const { summary, warehouses } = data;

  return {
    summary: {
      customer_count: asNumber(summary.customer_count),
      verified_seller_count: asNumber(summary.verified_seller_count),
      pending_seller_count: asNumber(summary.pending_seller_count),
      active_product_count: asNumber(summary.active_product_count),
      order_count: asNumber(summary.order_count),
      gross_merchandise_value: asNumber(summary.gross_merchandise_value),
    },
    warehouses: warehouses.map((row) => ({
      ...row,
      tracked_variants: asNumber(row.tracked_variants),
      stock_units: asNumber(row.stock_units),
    })),
  };
};

const formatSellerPerformance = async () => {
  const rows = await adminRepository.getSellerPerformanceData();

  return {
    sellers: rows.map((row) => ({
      seller_id: row.seller_id,
      company_name: row.company_name,
      rating: asNumber(row.rating),
      active_products: asNumber(row.active_products),
      total_gmv: asNumber(row.total_gmv),
      total_orders: asNumber(row.total_orders),
      avg_order_value: asNumber(row.avg_order_value),
      units_sold: asNumber(row.units_sold),
      return_rate: asNumber(row.return_rate),
      payout_total: asNumber(row.payout_total),
      growth_rate: asNumber(row.growth_rate),
    })),
  };
};

const formatCategoryPerformance = async () => {
  const rows = await adminRepository.getCategoryPerformanceData();

  return {
    categories: rows.map((row) => ({
      category_id: row.category_id,
      category_name: row.category_name,
      gmv: asNumber(row.gmv),
      units_sold: asNumber(row.units_sold),
      order_count: asNumber(row.order_count),
      avg_rating: asNumber(row.avg_rating),
      browse_count: asNumber(row.browse_count),
      cart_adds: asNumber(row.cart_adds),
      wishlist_adds: asNumber(row.wishlist_adds),
      active_products: asNumber(row.active_products),
      stock_units: asNumber(row.stock_units),
      opportunity_score: asNumber(row.opportunity_score),
    })),
  };
};

const formatDemandOpportunities = async () => {
  const rows = await adminRepository.getDemandOpportunitiesData();

  return {
    opportunities: rows.map((row) => ({
      product_id: row.product_id,
      title: row.title,
      seller_name: row.seller_name,
      category_name: row.category_name,
      browse_count: asNumber(row.browse_count),
      cart_adds: asNumber(row.cart_adds),
      wishlist_adds: asNumber(row.wishlist_adds),
      order_count: asNumber(row.order_count),
      units_sold: asNumber(row.units_sold),
      stock_units: asNumber(row.stock_units),
      opportunity_score: asNumber(row.opportunity_score),
    })),
  };
};

const formatWarehousePressure = async () => {
  const rows = await adminRepository.getWarehousePressureData();

  return {
    warehouses: rows.map((row) => ({
      warehouse_id: row.warehouse_id,
      name: row.name,
      city: row.city,
      stock_units: asNumber(row.stock_units),
      low_stock_variants: asNumber(row.low_stock_variants),
      fulfilled_orders: asNumber(row.fulfilled_orders),
      pending_orders: asNumber(row.pending_orders),
      return_volume: asNumber(row.return_volume),
      pressure_score: asNumber(row.pressure_score),
    })),
  };
};

const formatGeographicDemand = async () => {
  const rows = await adminRepository.getGeographicDemandData();

  return {
    cities: rows.map((row) => ({
      city: row.city,
      order_count: asNumber(row.order_count),
      gmv: asNumber(row.gmv),
      active_customers: asNumber(row.active_customers),
      delivered_orders: asNumber(row.delivered_orders),
      top_category: row.top_category,
      growth_rate: asNumber(row.growth_rate),
    })),
  };
};

const formatReturnsRisk = async () => {
  const data = await adminRepository.getReturnsRiskData();
  const { sellers, products, categories } = data;

  return {
    sellers: sellers.map((row) => ({
      seller_id: row.seller_id,
      company_name: row.company_name,
      return_count: asNumber(row.return_count),
      refund_total: asNumber(row.refund_total),
      units_sold: asNumber(row.units_sold),
      return_rate: asNumber(row.return_rate),
    })),
    products: products.map((row) => ({
      product_id: row.product_id,
      title: row.title,
      return_count: asNumber(row.return_count),
      refund_total: asNumber(row.refund_total),
      units_sold: asNumber(row.units_sold),
      return_rate: asNumber(row.return_rate),
    })),
    categories: categories.map((row) => ({
      category_id: row.category_id,
      category_name: row.category_name,
      return_count: asNumber(row.return_count),
      refund_total: asNumber(row.refund_total),
      units_sold: asNumber(row.units_sold),
      return_rate: asNumber(row.return_rate),
    })),
  };
};

const formatInventoryRisk = async () => {
  const rows = await adminRepository.getInventoryRiskData();

  return {
    products: rows.map((row) => ({
      product_id: row.product_id,
      title: row.title,
      seller_name: row.seller_name,
      category_name: row.category_name,
      stock_units: asNumber(row.stock_units),
      recent_units_sold: asNumber(row.recent_units_sold),
      browse_count: asNumber(row.browse_count),
      cart_adds: asNumber(row.cart_adds),
      stock_gap: asNumber(row.stock_gap),
      risk_score: asNumber(row.risk_score),
    })),
  };
};

const formatConversionSignals = async () => {
  const rows = await adminRepository.getConversionSignalsData();

  return {
    products: rows.map((row) => ({
      product_id: row.product_id,
      title: row.title,
      seller_name: row.seller_name,
      browse_count: asNumber(row.browse_count),
      cart_adds: asNumber(row.cart_adds),
      wishlist_adds: asNumber(row.wishlist_adds),
      order_count: asNumber(row.order_count),
      units_sold: asNumber(row.units_sold),
      browse_to_cart_rate: asNumber(row.browse_to_cart_rate),
      cart_to_order_rate: asNumber(row.cart_to_order_rate),
      conversion_gap_score: asNumber(row.conversion_gap_score),
    })),
  };
};

const formatTopCategories = async () => {
  const rows = await adminRepository.getTopCategoriesData();
  return { categories: rows };
};

const formatTopSellers = async () => {
  const rows = await adminRepository.getTopSellersData();
  return { sellers: rows };
};

const formatTopProducts = async () => {
  const rows = await adminRepository.getTopProductsData();
  return { products: rows };
};

const getPendingSellers = async () => {
  const rows = await adminRepository.listPendingSellers();
  return { sellers: rows };
};

module.exports = {
  generateAdminToken,
  verifyAdminCredentials,
  processSellerVerification,
  formatAdminOverview,
  formatSellerPerformance,
  formatCategoryPerformance,
  formatDemandOpportunities,
  formatWarehousePressure,
  formatGeographicDemand,
  formatReturnsRisk,
  formatInventoryRisk,
  formatConversionSignals,
  formatTopCategories,
  formatTopSellers,
  formatTopProducts,
  getPendingSellers,
};
