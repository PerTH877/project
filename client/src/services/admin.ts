import api from "@/lib/api";
import type {
  AdminCategoryPerformance,
  AdminFulfillmentHealth,
  AdminGeographicDemand,
  AdminOverview,
  AdminSellerPerformance,
  PendingSeller,
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


  getGeographicDemand: async (): Promise<AdminGeographicDemand[]> => {
    const res = await api.get("/admin/analytics/geographic-demand");
    return res.data.cities;
  },


  getPendingSellers: async (): Promise<PendingSeller[]> => {
    const res = await api.get("/admin/sellers/pending");
    return res.data.sellers;
  },

  verifySeller: async (id: number) => {
    const res = await api.put(`/admin/sellers/${id}/verify`);
    return res.data;
  },


  getOrderFulfillment: async (): Promise<AdminFulfillmentHealth[]> => {
    const res = await api.get("/admin/analytics/order-fulfillment");
    return res.data.fulfillment;
  },
};
