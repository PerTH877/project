// All TypeScript types aligned to the real backend API shapes

export interface User {
    user_id: number;
    full_name: string;
    email: string;
    phone_number?: string;
    nearby_warehouse_id?: number;
}

export interface Seller {
    seller_id: number;
    company_name: string;
    contact_email: string;
    gst_number?: string;
    rating?: number;
    is_verified: boolean;
    balance?: number;
}

export interface AuthState {
    token: string | null;
    role: 'user' | 'seller' | 'admin' | null;
    user_id?: number;
    seller_id?: number;
    email?: string;
}

export interface Product {
    product_id: number;
    title: string;
    brand?: string;
    base_price: number;
    description?: string;
    created_at: string;
    category_id?: number;
    seller_id?: number;
}

export interface ProductVariant {
    variant_id: number;
    product_id: number;
    sku: string;
    attributes: Record<string, string>;
    price_adjustment: number;
}

export interface Category {
    category_id: number;
    name: string;
    parent_id?: number;
}

export interface Warehouse {
    warehouse_id: number;
    name: string;
    location?: string;
    city?: string;
}

export interface Address {
    address_id: number;
    user_id: number;
    address_type: string;
    street_address: string;
    city: string;
    zip_code: string;
    country: string;
    is_default: boolean;
    is_active: boolean;
}

export interface CartItem {
    cart_id: number;
    variant_id: number;
    quantity: number;
    added_at: string;
    // Enriched on frontend after product lookup
    product?: Product;
    variant?: ProductVariant;
}

export interface Wishlist {
    wishlist_id: number;
    user_id: number;
    name: string;
    is_public: boolean;
    created_at?: string;
    items: number[]; // array of variant_ids
}

export interface PendingSeller {
    seller_id: number;
    company_name: string;
    contact_email: string;
    gst_number?: string;
    is_verified: boolean;
}

export interface TopCategory {
    category_id: number;
    name: string;
    product_count: number;
}

export interface TopSeller {
    seller_id: number;
    company_name: string;
    total_sales: number;
}

export interface TopProduct {
    product_id: number;
    title: string;
    popularity: number;
}

export interface InventoryEntry {
    warehouse_id: number;
    stock_quantity: number;
    aisle_location?: string;
}

export interface CreateProductVariant {
    sku: string;
    attributes: Record<string, string>;
    price_adjustment?: number;
    inventory?: InventoryEntry[];
}

export interface CreateProductPayload {
    category_id?: number;
    title: string;
    brand?: string;
    description?: string;
    base_price: number;
    variants: CreateProductVariant[];
}

export interface ApiError {
    error: string;
    detail?: string;
}
