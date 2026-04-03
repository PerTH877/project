import api from "@/lib/api";
import type {
  Category,
  CreateProductPayload,
  HomeFeed,
  ProductDetailResponse,
  ProductListResponse,
  Warehouse,
} from "@/types";

export interface ProductFilters {
  page?: number;
  page_size?: number;
  search?: string;
  category_id?: number | null;
  seller_id?: number | null;
  min_price?: number | null;
  max_price?: number | null;
  min_rating?: number | null;
  in_stock?: boolean;
  sort?: string;
  attributes?: string;
}

export const productsService = {
  getFeaturedProducts: async (): Promise<any> => {
    const res = await api.get("/products/featured");
    return res.data;
  },

  getDeals: () => api.get('/products/deals').then(res => res.data.data || res.data),

  list: async (filters: ProductFilters = {}): Promise<ProductListResponse> => {
    const res = await api.get("/products", { params: filters });
    return res.data;
  },

  home: async (): Promise<HomeFeed> => {
    const res = await api.get("/products/home");
    return res.data;
  },

  get: async (productId: number): Promise<ProductDetailResponse> => {
    const res = await api.get(`/products/${productId}`);
    return res.data;
  },

  create: async (payload: CreateProductPayload) => {
    const res = await api.post("/products", payload);
    return res.data;
  },

  update: async (productId: number, payload: Partial<CreateProductPayload>) => {
    const res = await api.put(`/products/${productId}`, payload);
    return res.data;
  },

  deactivate: async (productId: number) => {
    const res = await api.patch(`/products/${productId}/deactivate`);
    return res.data;
  },

  listMine: async (filters: ProductFilters = {}): Promise<ProductListResponse> => {
    const res = await api.get("/products/seller/mine", { params: filters });
    return res.data;
  },

  getMine: async (productId: number): Promise<ProductDetailResponse> => {
    const res = await api.get(`/products/seller/mine/${productId}`);
    return res.data;
  },

  updateVariant: async (
    variantId: number,
    payload: {
      sku?: string;
      attributes?: Record<string, string>;
      price_adjustment?: number;
      is_active?: boolean;
    }
  ) => {
    const res = await api.put(`/products/variants/${variantId}`, payload);
    return res.data;
  },

  updateInventory: async (
    variantId: number,
    inventory: Array<{
      warehouse_id: number;
      stock_quantity: number;
      aisle_location?: string;
    }>
  ) => {
    const res = await api.put(`/products/variants/${variantId}/inventory`, {
      inventory,
    });
    return res.data;
  },

  submitReview: async (
    productId: number,
    payload: { rating: number; comment?: string; images?: File[] }
  ) => {
    const form = new FormData();
    form.append("rating", String(payload.rating));
    if (payload.comment) form.append("comment", payload.comment);
    if (payload.images && payload.images.length > 0) {
      payload.images.forEach((file) => form.append("images", file));
    }
    const res = await api.post(`/products/${productId}/reviews`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  askQuestion: async (productId: number, question_text: string) => {
    const res = await api.post(`/products/${productId}/questions`, { question_text });
    return res.data;
  },

  answerQuestion: async (questionId: number, answer_text: string) => {
    const res = await api.post(`/products/questions/${questionId}/answer`, { answer_text });
    return res.data;
  },
};

export const categoriesService = {
  list: async (): Promise<Category[]> => {
    const res = await api.get("/categories");
    return res.data.categories;
  },

  create: async (payload: {
    name: string;
    description?: string;
    parent_id?: number | null;
    commission_percentage?: number | null;
  }) => {
    const res = await api.post("/categories", payload);
    return res.data.category;
  },
};

export const warehousesService = {
  list: async (): Promise<Warehouse[]> => {
    const res = await api.get("/warehouses");
    return res.data.warehouses;
  },

  create: async (payload: {
    name: string;
    street_address: string;
    city: string;
    zip_code?: string;
    capacity?: number | null;
  }) => {
    const res = await api.post("/warehouses", payload);
    return res.data.warehouse;
  },
};

export const getDeals = () => api.get('/products/deals').then(res => res.data.data || res.data);
