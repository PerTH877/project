import api from "@/lib/api";
import type { Address, AddressInput, CartResponse, CheckoutReviewSummary } from "@/types";

export const cartService = {
  getItems: async (): Promise<CartResponse> => {
    const res = await api.get("/cart");
    return res.data;
  },

  getTotal: async (): Promise<number> => {
    const res = await api.get("/cart/total");
    return res.data.total;
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

  checkout: async (address_id: number, payment_method: string) => {
    const res = await api.post("/cart/checkout", { address_id, payment_method });
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
  review: async () => {
    const res = await api.get("/checkout/review");
    return res.data.summary as CheckoutReviewSummary;
  },
  execute: async (address_id: number, payment_method: string) => {
    const res = await api.post("/checkout/execute", { address_id, payment_method });
    return res.data;
  }
};

export const addressesService = {
  list: async (): Promise<Address[]> => {
    const res = await api.get("/addresses");
    return res.data.addresses;
  },

  create: async (payload: AddressInput) => {
    const res = await api.post("/addresses", payload);
    return res.data.address;
  },

  update: async (address_id: number, payload: Partial<AddressInput>) => {
    const res = await api.put(`/addresses/${address_id}`, payload);
    return res.data.address;
  },

  delete: async (address_id: number) => {
    const res = await api.delete(`/addresses/${address_id}`);
    return res.data;
  },
};
