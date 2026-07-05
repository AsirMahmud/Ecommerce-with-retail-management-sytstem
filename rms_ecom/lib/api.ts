// API configuration and functions for ecommerce frontend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Types
export interface ProductVariant {
  size: string;
  color: string;
  color_hex: string;
  stock: number;
  variant_id: number;
}

export interface EcommerceProduct {
  id: number;
  name: string;
  sku: string;
  description?: string;
  selling_price: number;
  original_price?: number;
  stock_quantity: number;
  discount?: number;
  image?: string;
  image_url?: string;
  online_category_name?: string;
  online_category_id?: number;
  available_colors: Array<{ name: string; hex: string }>;
  available_sizes: string[];
  variants: ProductVariant[];
  primary_image?: string;
  images_ordered: string[];
  created_at: string;
  updated_at: string;
}

export interface EcommerceProductDetail extends EcommerceProduct {
  images: string[];
  images_ordered: string[];
  material_composition: Array<{ name: string; percentage: string }>;
  who_is_this_for: Array<{ title: string; description: string }>;
  features: Array<{ title: string; description: string }>;
  size_chart: Array<{
    size: string;
    chest: string;
    waist: string;
    height: string;
  }>;
}

// Discount info returned from backend for priority-based discounts
export interface DiscountInfo {
  original_price: number;
  discount_value: number;      // percentage, e.g., 15 for 15%
  discount_amount: number;
  final_price: number;
  discount_type: 'PRODUCT' | 'CATEGORY' | 'APP_WIDE' | null;
  discount_name: string | null;
}

// Public per-color listing entry
export interface ProductByColorEntry {
  product_id: number;
  product_name: string;
  product_price: string;
  discount_info?: DiscountInfo | null;  // Priority-based discount from backend
  color_name: string;
  color_slug: string;
  total_stock: number;
  cover_image_url?: string | null;
}

export interface Paginated<T> {
  count: number
  page: number
  page_size: number
  results: T[]
}

// Public per-color detail response
export interface ProductDetailByColorResponse {
  product: {
    id: number;
    name: string;
    price: string;
    category?: string | null;
    online_categories?: Array<{ id: number; name: string; slug: string }>;
  };
  discount_info?: DiscountInfo | null;
  color: {
    name: string;
    slug: string;
    hex?: string | null;
  };
  images: Array<{ type: string; url: string }>;
  sizes: Array<{ size: string; stock_qty: number; in_stock: boolean }>;
  available_colors: Array<{ color_name: string; color_slug: string; total_stock: number; color_hex?: string | null }>;
  total_stock_for_color: number;
}

export interface ShowcaseSection {
  name: string;
  products: EcommerceProduct[];
  count: number;
}

export interface ShowcaseResponse {
  [key: string]: ShowcaseSection;
}

export interface Discount {
  id: number;
  name: string;
  discount_type: string;
  value: number;
  description?: string;
  start_date: string;
  end_date: string;
  status: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PromotionalModalData {
  id: number;
  title: string;
  description: string;
  discount_code: string;
  cta_text: string;
  cta_url: string;
  image: string | null;
  image_url: string | null;
  layout: "centered" | "split-left" | "split-right" | "full-cover" | "image-only";
  color_theme: "light" | "dark" | "brand";
  display_rules: {
    trigger?: "timer" | "exit_intent" | "first_visit";
    delay_seconds?: number;
    frequency?: "once_per_session" | "once_ever" | "always";
  };
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// API Functions
export const ecommerceApi = {
  // Get all showcase data
  getShowcase: async (params?: {
    limit?: number;
    online_category?: number;
    [key: string]: number | undefined; // Allow dynamic section limits like 'summer-sale_limit'
  }): Promise<ShowcaseResponse> => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.set(key, value.toString());
        }
      });
    }

    const response = await fetch(`${API_BASE_URL}/inventory/products/showcase/?${searchParams}`);
    if (!response.ok) throw new Error('Failed to fetch showcase data');
    return response.json();
  },

  // Get all online products (optionally by online_category)
  getAllProducts: async (params?: { online_category?: number }): Promise<{ products: EcommerceProduct[]; count: number }> => {
    const searchParams = new URLSearchParams()
    if (params?.online_category) searchParams.set('online_category', params.online_category.toString())
    const response = await fetch(`${API_BASE_URL}/inventory/products/all_online/?${searchParams}`)
    if (!response.ok) throw new Error('Failed to fetch all products')
    return response.json()
  },

  // Public: Get flat products by color
  getProductsByColor: async (params?: {
    search?: string;
    category?: string; // category slug
    online_category?: string; // online category slug
    only_in_stock?: boolean;
    product_id?: number;
    product_ids?: number[];
    status?: string;
  }): Promise<ProductByColorEntry[]> => {
    const searchParams = new URLSearchParams()
    if (params?.search) searchParams.set('search', params.search)
    if (params?.category) searchParams.set('category', params.category)
    if (params?.online_category) searchParams.set('online_category', params.online_category)
    if (typeof params?.only_in_stock !== 'undefined') searchParams.set('only_in_stock', String(params.only_in_stock))
    if (params?.product_id) searchParams.set('product_id', String(params.product_id))
    if (params?.product_ids && params.product_ids.length > 0) searchParams.set('product_ids', params.product_ids.join(','))
    if (params?.status) searchParams.set('status', params.status)
    const response = await fetch(`${API_BASE_URL}/ecommerce/public/products-by-color/?${searchParams}`)
    if (!response.ok) throw new Error('Failed to fetch products by color')
    const data = await response.json()
    // Backend may return an array or a paginated object; normalize to array
    if (Array.isArray(data)) return data
    return data?.results || []
  },

  // Public: Get flat products by color (paginated)
  getProductsByColorPaginated: async (params?: {
    search?: string;
    category?: string;
    online_category?: string;
    product_types?: string[]; // alias for multiple online_category slugs
    gender?: 'MALE' | 'FEMALE' | 'UNISEX' | 'men' | 'women'; // filter by gender
    only_in_stock?: boolean;
    product_id?: number;
    product_ids?: number[];
    status?: string;
    page?: number;
    page_size?: number;
    price_min?: number;
    price_max?: number;
    sort?: 'name' | 'price_asc' | 'price_desc';
    colors?: string[]; // color names
    sizes?: string[]; // size values
  }): Promise<Paginated<ProductByColorEntry>> => {
    const searchParams = new URLSearchParams()
    if (params?.search) searchParams.set('search', params.search)
    if (params?.category) searchParams.set('category', params.category)
    if (params?.online_category) searchParams.set('online_category', params.online_category)
    if (params?.product_types && params.product_types.length > 0) searchParams.set('product_types', params.product_types.join(','))
    if (params?.gender) searchParams.set('gender', params.gender)
    if (typeof params?.only_in_stock !== 'undefined') searchParams.set('only_in_stock', String(params.only_in_stock))
    if (params?.product_id) searchParams.set('product_id', String(params.product_id))
    if (params?.product_ids && params.product_ids.length > 0) searchParams.set('product_ids', params.product_ids.join(','))
    if (params?.status) searchParams.set('status', params.status)
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.page_size) searchParams.set('page_size', String(params.page_size))
    if (typeof params?.price_min !== 'undefined') searchParams.set('price_min', String(params.price_min))
    if (typeof params?.price_max !== 'undefined') searchParams.set('price_max', String(params.price_max))
    if (params?.sort) searchParams.set('sort', params.sort)
    if (params?.colors && params.colors.length > 0) searchParams.set('colors', params.colors.join(','))
    if (params?.sizes && params.sizes.length > 0) searchParams.set('sizes', params.sizes.join(','))
    const response = await fetch(`${API_BASE_URL}/ecommerce/public/products-by-color/?${searchParams}`)
    if (!response.ok) throw new Error('Failed to fetch products by color')
    return response.json()
  },

  // Get new arrivals
  getNewArrivals: async (params?: {
    limit?: number;
    online_category?: number;
  }): Promise<{ products: EcommerceProduct[]; count: number; online_category?: number }> => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.online_category) searchParams.set('online_category', params.online_category.toString());

    const response = await fetch(`${API_BASE_URL}/inventory/products/new_arrivals/?${searchParams}`);
    if (!response.ok) throw new Error('Failed to fetch new arrivals');
    return response.json();
  },

  // Get top selling products
  getTopSelling: async (params?: {
    limit?: number;
    online_category?: number;
    days?: number;
  }): Promise<{ products: EcommerceProduct[]; count: number; online_category?: number; period_days: number }> => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.online_category) searchParams.set('online_category', params.online_category.toString());
    if (params?.days) searchParams.set('days', params.days.toString());

    const response = await fetch(`${API_BASE_URL}/inventory/products/top_selling/?${searchParams}`);
    if (!response.ok) throw new Error('Failed to fetch top selling products');
    return response.json();
  },

  // Get featured products
  getFeatured: async (params?: {
    limit?: number;
    online_category?: number;
  }): Promise<{ products: EcommerceProduct[]; count: number; online_category?: number }> => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.online_category) searchParams.set('online_category', params.online_category.toString());

    const response = await fetch(`${API_BASE_URL}/inventory/products/featured/?${searchParams}`);
    if (!response.ok) throw new Error('Failed to fetch featured products');
    return response.json();
  },

  // Get product details
  getProductDetail: async (id: number): Promise<{
    product: EcommerceProductDetail;
    related_products: EcommerceProduct[];
    related_count: number;
  }> => {
    const response = await fetch(`${API_BASE_URL}/inventory/products/${id}/showcase_detail/`);
    if (!response.ok) throw new Error('Failed to fetch product details');
    return response.json();
  },

  // Public: Get product detail by color (color-scoped images and stock)
  getProductDetailByColor: async (productId: number, colorSlug: string): Promise<ProductDetailByColorResponse> => {
    const response = await fetch(`${API_BASE_URL}/ecommerce/public/product-details/${productId}/${colorSlug}/`)
    if (!response.ok) throw new Error('Failed to fetch product detail by color')
    return response.json()
  },

  // Get online categories
  getOnlineCategories: async (params?: { gender?: string }): Promise<Array<{ id: number; name: string; slug: string; parent: number | null; parent_name?: string; children_count?: number }>> => {
    const searchParams = new URLSearchParams();
    if (params?.gender) searchParams.set('gender', params.gender.toUpperCase());

    const response = await fetch(`${API_BASE_URL}/inventory/online-categories/?${searchParams}`);
    if (!response.ok) throw new Error('Failed to fetch online categories');
    return response.json();
  },

  // Get home page settings
  getHomePageSettings: async (): Promise<{
    logo_image_url?: string;
    logo_text?: string;
    footer_tagline?: string;
    footer_address?: string;
    footer_phone?: string;
    footer_email?: string;
    footer_facebook_url?: string;
    footer_instagram_url?: string;
    footer_twitter_url?: string;
    footer_github_url?: string;
    footer_map_embed_url?: string;
    hero_badge_text?: string;
    hero_heading_line1?: string;
    hero_heading_line2?: string;
    hero_heading_line3?: string;
    hero_heading_line4?: string;
    hero_heading_line5?: string;
    hero_description?: string;
    hero_primary_image_url?: string;
    hero_secondary_image_url?: string;
    stat_brands?: string;
    stat_products?: string;
    stat_customers?: string;
  }> => {
    const response = await fetch(`${API_BASE_URL}/ecommerce/public/home-page-settings/`, {
      // Always fetch fresh settings so footer reflects latest admin changes
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('Failed to fetch home page settings');
    return response.json();
  },

  // Get brands
  getBrands: async (): Promise<Array<{
    id: number;
    name: string;
    logo_image?: string;
    logo_image_url?: string;
    logo_text?: string;
    website_url?: string;
  }>> => {
    const response = await fetch(`${API_BASE_URL}/ecommerce/public/brands/`);
    if (!response.ok) throw new Error('Failed to fetch brands');
    return response.json();
  },

  // Get hero slides
  getHeroSlides: async (): Promise<Array<{
    id: number;
    title: string;
    subtitle?: string;
    button_text: string;
    image?: string;
    image_url?: string;
    bg_color: string;
    layout: string;
    title_class: string;
    subtitle_class: string;
    stats: Array<{ value: string; label: string }>;
    display_order: number;
    is_active: boolean;
  }>> => {
    const response = await fetch(`${API_BASE_URL}/ecommerce/public/hero-slides/`, {
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('Failed to fetch hero slides');
    return response.json();
  },

  // Get active app-wide discounts
  getActiveAppWideDiscount: async (): Promise<Discount[]> => {
    const response = await fetch(`${API_BASE_URL}/ecommerce/discounts/active/?discount_type=APP_WIDE`);
    if (!response.ok) throw new Error('Failed to fetch active app-wide discounts');
    return response.json();
  },

  // Public: Get delivery settings
  getDeliverySettings: async (): Promise<{ inside_dhaka_charge: number; inside_gazipur_charge: number; outside_dhaka_charge: number; updated_at: string }> => {
    const response = await fetch(`${API_BASE_URL}/ecommerce/public/delivery-settings/`)
    if (!response.ok) throw new Error('Failed to fetch delivery settings')
    return response.json()
  },

  // Public: Price cart items on the server
  priceCart: async (items: Array<{ productId: string | number; quantity: number; variations?: Record<string, string> }>, couponCode?: string): Promise<{
    items: Array<{ productId: number; name: string; image_url?: string | null; unit_price: number; quantity: number; line_total: number; max_stock?: number; variant?: { color?: string | null; size?: string | null } }>
    products: Array<{
      id: number
      name: string
      sku: string
      description?: string
      selling_price: string
      original_price?: string | null
      discount?: number | null
      stock_quantity: number
      image?: string
      image_url?: string
      online_category_name?: string
      online_category_id?: number
      available_colors: Array<{ name: string; hex: string }>
      available_sizes: string[]
      variants: Array<any>
      primary_image?: string
      images_ordered: string[]
      created_at: string
      updated_at: string
    }>
    subtotal: number
    original_subtotal: number
    automatic_discount_amount: number
    coupon_discount_amount: number
    coupon: { valid: boolean; code: string; name: string; interaction_mode: 'STACK' | 'BEST' | 'REPLACE'; discount_amount: number } | null
    delivery: { inside_dhaka_charge: number; inside_gazipur_charge: number; outside_dhaka_charge: number; updated_at: string }
  }> => {
    const response = await fetch(`${API_BASE_URL}/ecommerce/public/cart/price/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, coupon_code: couponCode || undefined }),
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || 'Failed to price cart')
    }
    return response.json()
  },

  // Create Online Preorder (COD-only). Backend enforces COD and online type.
  // This endpoint creates customer and preorder in one request.
  createOnlinePreorder: async (payload: {
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    shipping_address?: Record<string, unknown>;
    notes?: string;
    items: Array<{
      product_id: number;
      size: string;
      color: string;
      quantity: number;
      unit_price: number;
      discount?: number;
    }>;
    coupon_code?: string;
    delivery_charge?: number;
    delivery_method?: string;
    expected_delivery_date?: string; // ISO date
  }): Promise<{ id: number } & Record<string, unknown>> => {
    const response = await fetch(`${API_BASE_URL}/ecommerce/orders/create/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.error || errorData?.detail || `Failed to create online preorder (${response.status})`)
    }
    return response.json()
  },

  // Get Online Preorder by ID
  getOnlinePreorder: async (id: number): Promise<{
    id: number;
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    items: Array<{
      product_id: number;
      size: string;
      color: string;
      quantity: number;
      unit_price: number;
      discount?: number;
    }>;
    shipping_address?: Record<string, unknown>;
    delivery_charge: number;
    delivery_method?: string;
    total_amount: number;
    status: string;
    notes?: string;
    expected_delivery_date?: string;
    created_at: string;
    updated_at: string;
  }> => {
    const response = await fetch(`${API_BASE_URL}/online-preorder/orders/${id}/`)
    if (!response.ok) {
      try {
        const errorData = await response.json()
        throw new Error(errorData.error || errorData.detail || 'Failed to fetch online preorder')
      } catch {
        throw new Error(`Failed to fetch online preorder (${response.status})`)
      }
    }
    return response.json()
  },

  // Public: Get active promotional modals
  getPromotionalModals: async (): Promise<PromotionalModalData[]> => {
    const response = await fetch(`${API_BASE_URL}/ecommerce/public/promotional-modals/`)
    if (!response.ok) throw new Error('Failed to fetch promotional modals')
    return response.json()
  },
};
