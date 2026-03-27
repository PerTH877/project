import api from "@/lib/api";
import type { Seller, SellerAnalyticsData, SellerDashboardData } from "@/types";

export const sellerService = {
  getProfile: async (): Promise<{ seller: Seller }> => {
    const res = await api.get("/sellers/me");
    return res.data;
  },

  getDashboard: async (): Promise<SellerDashboardData> => {
    const res = await api.get("/sellers/dashboard");
    return res.data;
  },

  getAnalytics: async (): Promise<SellerAnalyticsData> => {
    const res = await api.get("/sellers/analytics");
    return res.data;
  },

  restockInventory: async (payload: { variant_id: number; warehouse_id: number; quantity: number }) => {
    const res = await api.post("/warehouses/restock", payload);
    return res.data;
  },
};
