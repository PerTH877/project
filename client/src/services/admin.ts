import api from "@/lib/api";
import type {
  AdminCategoryPerformance,
  AdminConversionSignal,
  AdminDemandOpportunity,
  AdminFulfillmentHealth,
  AdminGeographicDemand,
  AdminInventoryRisk,
  AdminOverview,
  AdminReturnsRisk,
  AdminSellerPerformance,
  AdminWarehousePressure,
  PendingSeller,
  TopCategory,
  TopProduct,
  TopSeller,
} from "@/types";

export const adminService = {
  getOverview: async (): Promise<AdminOverview> => {
    const res = await api.get("/admin/overview");
    return res.data;
  },

  getSellerPerformance: async (): Promise<AdminSellerPerformance[]> => {
    const res = await api.get("/admin/analytics/seller-performance");
    return res.data.sellers;
  },

  getCategoryPerformance: async (): Promise<AdminCategoryPerformance[]> => {
    const res = await api.get("/admin/analytics/category-performance");
    return res.data.categories;
  },

  getDemandOpportunities: async (): Promise<AdminDemandOpportunity[]> => {
    const res = await api.get("/admin/analytics/demand-opportunities");
    return res.data.opportunities;
  },

  getWarehousePressure: async (): Promise<AdminWarehousePressure[]> => {
    const res = await api.get("/admin/analytics/warehouse-pressure");
    return res.data.warehouses;
  },

  getGeographicDemand: async (): Promise<AdminGeographicDemand[]> => {
    const res = await api.get("/admin/analytics/geographic-demand");
    return res.data.cities;
  },

  getReturnsRisk: async (): Promise<AdminReturnsRisk> => {
    const res = await api.get("/admin/analytics/returns-risk");
    return res.data;
  },

  getInventoryRisk: async (): Promise<AdminInventoryRisk[]> => {
    const res = await api.get("/admin/analytics/inventory-risk");
    return res.data.products;
  },

  getConversionSignals: async (): Promise<AdminConversionSignal[]> => {
    const res = await api.get("/admin/analytics/conversion-signals");
    return res.data.products;
  },

  getPendingSellers: async (): Promise<PendingSeller[]> => {
    const res = await api.get("/admin/sellers/pending");
    return res.data.sellers;
  },

  verifySeller: async (seller_id: number) => {
    const res = await api.patch(`/admin/sellers/${seller_id}/verify`);
    return res.data;
  },

  getTopCategories: async (): Promise<TopCategory[]> => {
    const res = await api.get("/admin/analytics/top-categories");
    return res.data.categories;
  },

  getTopSellers: async (): Promise<TopSeller[]> => {
    const res = await api.get("/admin/analytics/top-sellers");
    return res.data.sellers;
  },

  getTopProducts: async (): Promise<TopProduct[]> => {
    const res = await api.get("/admin/analytics/top-products");
    return res.data.products;
  },
  getOrderFulfillment: async (): Promise<AdminFulfillmentHealth[]> => {
    const res = await api.get("/admin/analytics/order-fulfillment");
    return res.data.fulfillment;
  },
};
