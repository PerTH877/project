import api from "@/lib/api";
import type { OrderDetailResponse, OrderSummary } from "@/types";

export const ordersService = {
  listMine: async (): Promise<OrderSummary[]> => {
    const res = await api.get("/orders");
    return res.data.orders;
  },

  getMine: async (orderId: number): Promise<OrderDetailResponse> => {
    const res = await api.get(`/orders/${orderId}`);
    return res.data;
  },

  listSeller: async (): Promise<OrderSummary[]> => {
    const res = await api.get("/orders/seller/list");
    return res.data.orders;
  },

  getSeller: async (orderId: number): Promise<OrderDetailResponse> => {
    const res = await api.get(`/orders/seller/${orderId}`);
    return res.data;
  },

  updateOrderStatus: async (orderId: number, status: string) => {
    const res = await api.patch(`/orders/${orderId}/status`, { status });
    return res.data;
  },
};
