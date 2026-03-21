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
  gst_number?: string | null;
  rating?: number;
  is_verified: boolean;
  balance?: number;
}

export interface AuthState {
  token: string | null;
  role: "user" | "seller" | "admin" | null;
  user_id?: number;
  seller_id?: number;
  email?: string;
}

export interface Category {
  category_id: number;
  parent_id?: number | null;
  name: string;
  description?: string | null;
  commission_percentage?: number | null;
  product_count?: number;
}

export interface Warehouse {
  warehouse_id: number;
  name: string;
  street_address: string;
  city: string;
  zip_code?: string | null;
  capacity?: number | null;
  is_active: boolean;
  stock_units?: number;
}

export interface ProductCard {
  product_id: number;
  seller_id: number;
  seller_name: string;
  seller_verified: boolean;
  category_id?: number | null;
  category_name?: string | null;
  title: string;
  brand?: string | null;
  description?: string | null;
  base_price: number;
  lowest_price: number;
  highest_price: number;
  created_at: string;
  is_active: boolean;
  primary_image?: string | null;
  avg_rating: number;
  review_count: number;
  total_stock: number;
}

export interface ProductMedia {
  media_id: number;
  media_url: string;
  media_type: string;
  is_primary: boolean;
  display_order: number;
}

export interface ProductSpecification {
  spec_id: number;
  spec_key: string;
  spec_value: string;
}

export interface InventoryRow {
  inventory_id?: number;
  warehouse_id: number;
  warehouse_name?: string;
  city?: string;
  stock_quantity: number;
  aisle_location?: string | null;
}

export interface ProductVariant {
  variant_id: number;
  product_id: number;
  sku: string;
  attributes: Record<string, string>;
  price_adjustment: number;
  is_active: boolean;
  total_stock?: number;
  inventory?: InventoryRow[];
}

export interface ProductReview {
  review_id: number;
  rating: number;
  comment?: string | null;
  images?: string[];
  created_at: string;
  user: {
    user_id: number;
    full_name: string;
  } | null;
}

export interface ProductAnswer {
  answer_id: number;
  answer_text: string;
  created_at: string;
  seller?: {
    seller_id: number;
    company_name: string;
  } | null;
  user?: {
    user_id: number;
    full_name: string;
  } | null;
}

export interface ProductQuestion {
  question_id: number;
  question_text: string;
  created_at: string;
  user: {
    user_id: number;
    full_name: string;
  } | null;
  answers: ProductAnswer[];
}

export interface ProductDetailResponse {
  product: ProductCard & {
    seller_email?: string;
    seller_rating?: number;
    question_count?: number;
    unanswered_count?: number;
  };
  media: ProductMedia[];
  specifications: ProductSpecification[];
  variants: ProductVariant[];
  reviews: ProductReview[];
  questions: ProductQuestion[];
  related_products: ProductCard[];
}

export interface ProductListResponse {
  products: ProductCard[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
  filters: {
    search: string;
    category_id?: number | null;
    seller_id?: number | null;
    min_price?: number | null;
    max_price?: number | null;
    sort: string;
  };
}

export interface HomeFeed {
  hero: {
    title: string;
    subtitle: string;
    metrics: Array<{
      label: string;
      value: number;
    }>;
  };
  featured_products: ProductCard[];
  trending_products: ProductCard[];
  new_arrivals: ProductCard[];
  deal_products: ProductCard[];
  fast_dispatch_products: ProductCard[];
  top_rated_products: ProductCard[];
  recently_viewed_products: ProductCard[];
  categories: Array<Category & { sample_image?: string | null }>;
  spotlight_sellers: Array<{
    seller_id: number;
    company_name: string;
    rating: number;
    active_products: number;
    gross_sales: number;
  }>;
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

export interface AddressInput {
  address_type: string;
  street_address: string;
  city: string;
  zip_code: string;
  country: string;
  is_default: boolean;
}

export interface CartItem {
  cart_id: number;
  quantity: number;
  added_at: string;
  is_saved: boolean;
  unit_price: number;
  line_total: number;
  availability: {
    in_stock: boolean;
    available_stock: number;
  };
  variant: {
    variant_id: number;
    sku: string;
    attributes: Record<string, string>;
    price_adjustment: number;
    is_active: boolean;
  };
  product: {
    product_id: number;
    seller_id: number;
    seller_name: string;
    title: string;
    brand?: string | null;
    base_price: number;
    primary_image?: string | null;
  };
}

export interface CartResponse {
  items: CartItem[];
  summary: {
    item_count: number;
    quantity_total: number;
    subtotal: number;
  };
}

export interface CheckoutReviewSummary {
  subtotal: number;
  shipping_cost: number;
  tax: number;
  total: number;
  is_prime: boolean;
}

export interface WishlistItem {
  item_id: number;
  variant_id: number;
  added_at: string;
  sku: string;
  attributes: Record<string, string>;
  price: number;
  product: {
    product_id: number;
    title: string;
    brand?: string | null;
    base_price: number;
    primary_image?: string | null;
  };
}

export interface Wishlist {
  wishlist_id: number;
  user_id: number;
  name: string;
  is_public: boolean;
  created_at?: string;
  items: WishlistItem[];
}

export interface PendingSeller {
  seller_id: number;
  company_name: string;
  contact_email: string;
  gst_number?: string | null;
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

export interface AdminOverview {
  summary: {
    customer_count: number;
    verified_seller_count: number;
    pending_seller_count: number;
    active_product_count: number;
    order_count: number;
    gross_merchandise_value: number;
  };
  warehouses: Warehouse[];
}

export interface AdminSellerPerformance {
  seller_id: number;
  company_name: string;
  total_gmv: number;
  total_orders: number;
  avg_order_value: number;
  units_sold: number;
  return_rate: number;
  payout_total: number;
  rating: number;
  active_products: number;
  growth_rate: number;
}

export interface AdminCategoryPerformance {
  category_id: number;
  category_name: string;
  gmv: number;
  units_sold: number;
  order_count: number;
  avg_rating: number;
  browse_count: number;
  cart_adds: number;
  wishlist_adds: number;
  active_products: number;
  stock_units: number;
  opportunity_score: number;
}

export interface AdminDemandOpportunity {
  product_id: number;
  title: string;
  seller_name: string;
  category_name: string;
  browse_count: number;
  cart_adds: number;
  wishlist_adds: number;
  order_count: number;
  units_sold: number;
  stock_units: number;
  opportunity_score: number;
}

export interface AdminWarehousePressure {
  warehouse_id: number;
  name: string;
  city: string;
  stock_units: number;
  low_stock_variants: number;
  fulfilled_orders: number;
  pending_orders: number;
  return_volume: number;
  pressure_score: number;
}

export interface AdminGeographicDemand {
  city: string;
  order_count: number;
  gmv: number;
  active_customers: number;
  delivered_orders: number;
  top_category: string;
  growth_rate: number;
}

export interface AdminReturnsRiskRow {
  seller_id?: number;
  product_id?: number;
  category_id?: number;
  company_name?: string;
  title?: string;
  category_name?: string;
  return_count: number;
  refund_total: number;
  units_sold: number;
  return_rate: number;
}

export interface AdminReturnsRisk {
  sellers: AdminReturnsRiskRow[];
  products: AdminReturnsRiskRow[];
  categories: AdminReturnsRiskRow[];
}

export interface AdminInventoryRisk {
  product_id: number;
  title: string;
  seller_name: string;
  category_name: string;
  stock_units: number;
  recent_units_sold: number;
  browse_count: number;
  cart_adds: number;
  stock_gap: number;
  risk_score: number;
}

export interface AdminConversionSignal {
  product_id: number;
  title: string;
  seller_name: string;
  browse_count: number;
  cart_adds: number;
  wishlist_adds: number;
  order_count: number;
  units_sold: number;
  browse_to_cart_rate: number;
  cart_to_order_rate: number;
  conversion_gap_score: number;
}

export interface OrderSummary {
  order_id: number;
  status: string;
  total_amount: number;
  order_date: string;
  item_count: number;
  shipment_status?: string | null;
  tracking_number?: string | null;
  payment_method?: string | null;
  payment_status?: string | null;
  address_city?: string | null;
  address_line?: string | null;
  gross_sales?: number;
  customer_name?: string;
  destination_city?: string | null;
}

export interface OrderDetailResponse {
  order: OrderSummary & {
    carrier?: string | null;
    estimated_arrival?: string | null;
    payment_amount?: number;
    address?: {
      street_address: string;
      city: string;
      zip_code: string;
      country: string;
    };
  };
  items: Array<{
    item_id: number;
    quantity: number;
    unit_price: number;
    line_total: number;
    platform_fee_percent?: number;
    seller_earning?: number;
    variant: {
      variant_id: number;
      sku: string;
      attributes: Record<string, string>;
    };
    product: {
      product_id: number;
      title: string;
      brand?: string | null;
      primary_image?: string | null;
    };
    seller?: {
      seller_id: number;
      company_name: string;
    };
  }>;
}

export interface SellerDashboardData {
  summary: {
    product_count: number;
    variant_count: number;
    gross_sales: number;
    seller_earnings: number;
    order_count: number;
  };
  low_stock: Array<{
    product_id: number;
    title: string;
    variant_id: number;
    sku: string;
    available_stock: number;
  }>;
  recent_orders: Array<{
    order_id: number;
    status: string;
    order_date: string;
    item_count: number;
    gross_sales: number;
    customer_name: string;
    shipment_status?: string | null;
  }>;
  inventory_by_warehouse: Array<{
    warehouse_id: number;
    name: string;
    city: string;
    active_variants: number;
    stock_units: number;
  }>;
}

export interface SellerAnalyticsData {
  sales_trend: Array<{
    month_label: string;
    gross_sales: number;
    seller_earnings: number;
    order_count: number;
  }>;
  top_products: Array<{
    product_id: number;
    title: string;
    order_items: number;
    units_sold: number;
    gross_sales: number;
    avg_rating: number;
    review_count: number;
  }>;
  category_breakdown: Array<{
    category_name: string;
    product_count: number;
    gross_sales: number;
  }>;
  stock_alerts: Array<{
    title: string;
    sku: string;
    available_stock: number;
  }>;
}

export interface InventoryEntry {
  warehouse_id: number;
  stock_quantity: number;
  aisle_location?: string;
}

export interface CreateProductVariant {
  variant_id?: number;
  sku: string;
  attributes: Record<string, string>;
  price_adjustment?: number;
  is_active?: boolean;
  inventory?: InventoryEntry[];
}

export interface ProductMediaInput {
  media_url: string;
  media_type?: string;
  is_primary?: boolean;
  display_order?: number;
}

export interface ProductSpecificationInput {
  spec_key: string;
  spec_value: string;
}

export interface CreateProductPayload {
  category_id?: number | null;
  title: string;
  brand?: string;
  description?: string;
  base_price: number;
  media?: ProductMediaInput[];
  specifications?: ProductSpecificationInput[];
  variants: CreateProductVariant[];
}

export interface ApiError {
  error: string;
  detail?: string;
}
