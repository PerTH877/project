import api from "@/lib/api";
import type { CartResponse, CheckoutReviewSummary } from "@/types";

export const cartService = {
  getItems: async (): Promise<CartResponse> => {
    const res = await api.get("/cart");
    return res.data;
  },

  addItem: async (variant_id: number, quantity: number) => {
    const res = await api.post("/cart", { variant_id, quantity });
    return res.data;
  },

  updateItem: async (cart_id: number, quantity: number) => {
    const res = await api.put(`/cart/${cart_id}`, { quantity });
    return res.data;
  },

  removeItem: async (cart_id: number) => {
    const res = await api.delete(`/cart/${cart_id}`);
    return res.data;
  },


  toggleSaveForLater: async (cart_id: number, is_saved: boolean) => {
    const res = await api.patch(`/cart/${cart_id}/save`, { is_saved });
    return res.data;
  },
};

export const checkoutService = {
  setAddress: async (address_id: number) => {
    const res = await api.post("/checkout/address", { address_id });
    return res.data;
  },
  setPayment: async (payment_method: string) => {
    const res = await api.post("/checkout/payment", { payment_method });
    return res.data;
  },
  review: async (address_id: number, payment_method: string) => {
    const res = await api.get("/checkout/review", { params: { address_id, payment_method } });
    return res.data.summary as CheckoutReviewSummary;
  },
  execute: async (address_id: number, payment_method: string) => {
    const res = await api.post("/checkout/execute", { address_id, payment_method });
    return res.data;
  }
};
