import api from "@/lib/api";
import type { Address, AddressInput } from "@/types";

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
