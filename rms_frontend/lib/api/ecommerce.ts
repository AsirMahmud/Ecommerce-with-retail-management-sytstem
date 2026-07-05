import axiosInstance from './axios-config';

// Types
export interface Discount {
  id: number;
  name: string;
  discount_type: 'APP_WIDE' | 'CATEGORY' | 'PRODUCT';
  value: number;
  start_date: string;
  end_date: string;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
  description: string;
  is_active: boolean;
  categories?: number[];
  categories_detail?: { id: number, name: string }[];
  online_categories?: number[];
  online_categories_detail?: { id: number, name: string }[];
  products?: number[];
  products_detail?: { id: number; name: string; sku?: string; image?: string }[];
  created_at: string;
  updated_at: string;
}

export interface Coupon {
  id: number;
  name: string;
  code: string;
  discount_type: 'PERCENTAGE' | 'FIXED';
  value: number;
  interaction_mode: 'STACK' | 'BEST' | 'REPLACE';
  start_date: string;
  end_date: string;
  minimum_spend: number;
  maximum_discount?: number | null;
  usage_limit?: number | null;
  used_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type CouponDTO = Omit<Coupon, 'id' | 'used_count' | 'created_at' | 'updated_at'>;

export const couponsApi = {
  getAll: async (): Promise<Coupon[]> => {
    const { data } = await axiosInstance.get('/ecommerce/coupons/');
    return data.results || data;
  },
  create: async (coupon: CouponDTO): Promise<Coupon> => {
    const { data } = await axiosInstance.post('/ecommerce/coupons/', coupon);
    return data;
  },
  update: async ({ id, ...coupon }: Partial<CouponDTO> & { id: number }): Promise<Coupon> => {
    const { data } = await axiosInstance.patch(`/ecommerce/coupons/${id}/`, coupon);
    return data;
  },
  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/ecommerce/coupons/${id}/`);
  },
  setActive: async ({ id, active }: { id: number; active: boolean }): Promise<Coupon> => {
    const { data } = await axiosInstance.post(`/ecommerce/coupons/${id}/${active ? 'activate' : 'deactivate'}/`);
    return data;
  },
};

export interface Brand {
  id: number;
  name: string;
  logo_image?: string;
  logo_image_url?: string;
  logo_text?: string;
  website_url?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductStatus {
  id: number;
  name: string;
  slug: string;
  display_on_home: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HomePageSettings {
  id: number;
  logo_image?: string;
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
  hero_badge_text: string;
  hero_heading_line1: string;
  hero_heading_line2?: string;
  hero_heading_line3?: string;
  hero_heading_line4?: string;
  hero_heading_line5?: string;
  hero_description: string;
  hero_primary_image?: string;
  hero_primary_image_url?: string;
  hero_secondary_image?: string;
  hero_secondary_image_url?: string;
  stat_brands: string;
  stat_products: string;
  stat_customers: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDiscountDTO {
  name: string;
  discount_type: 'APP_WIDE' | 'CATEGORY' | 'PRODUCT';
  value: number;
  start_date: string;
  end_date: string;
  description?: string;
  is_active?: boolean;
  status?: 'ACTIVE' | 'INACTIVE';
  categories?: number[];
  online_categories?: number[];
  products?: number[];
}

export interface UpdateDiscountDTO {
  id: number;
  name?: string;
  discount_type?: 'APP_WIDE' | 'CATEGORY' | 'PRODUCT';
  value?: number;
  start_date?: string;
  end_date?: string;
  description?: string;
  is_active?: boolean;
  status?: 'ACTIVE' | 'INACTIVE';
  categories?: number[];
  online_categories?: number[];
  products?: number[];
}

export interface CreateBrandDTO {
  name: string;
  logo_image?: File;
  logo_text?: string;
  website_url?: string;
  display_order?: number;
  is_active?: boolean;
}

export interface UpdateBrandDTO {
  id: number;
  name?: string;
  logo_image?: File;
  logo_text?: string;
  website_url?: string;
  display_order?: number;
  is_active?: boolean;
}

export interface UpdateHomePageSettingsDTO {
  logo_image?: File;
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
  hero_primary_image?: File;
  hero_secondary_image?: File;
  stat_brands?: string;
  stat_products?: string;
  stat_customers?: string;
}

export interface HeroSlide {
  id: number;
  title: string;
  subtitle?: string;
  button_text: string;
  image?: string;
  image_url?: string;
  bg_color: string;
  layout: 'clean-left' | 'centered-clean' | 'split-clean' | 'image-showcase' | 'bold-left';
  title_class: string;
  subtitle_class: string;
  stats: Array<{ value: string; label: string }>;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateHeroSlideDTO {
  title: string;
  subtitle?: string;
  button_text?: string;
  image?: File;
  bg_color?: string;
  layout?: 'clean-left' | 'centered-clean' | 'split-clean' | 'image-showcase' | 'bold-left';
  title_class?: string;
  subtitle_class?: string;
  stats?: Array<{ value: string; label: string }>;
  display_order?: number;
  is_active?: boolean;
}

export interface UpdateHeroSlideDTO {
  id: number;
  title?: string;
  subtitle?: string;
  button_text?: string;
  image?: File;
  bg_color?: string;
  layout?: 'clean-left' | 'centered-clean' | 'split-clean' | 'image-showcase' | 'bold-left';
  title_class?: string;
  subtitle_class?: string;
  stats?: Array<{ value: string; label: string }>;
  display_order?: number;
  is_active?: boolean;
}

// Discounts API
export const discountsApi = {
  getAll: async (): Promise<Discount[]> => {
    const { data } = await axiosInstance.get('/ecommerce/discounts/');
    return data.results || data;
  },

  getById: async (id: number): Promise<Discount> => {
    const { data } = await axiosInstance.get(`/ecommerce/discounts/${id}/`);
    return data;
  },

  create: async (discount: CreateDiscountDTO): Promise<Discount> => {
    const { data } = await axiosInstance.post('/ecommerce/discounts/', discount);
    return data;
  },

  update: async ({ id, ...discount }: UpdateDiscountDTO): Promise<Discount> => {
    const { data } = await axiosInstance.patch(`/ecommerce/discounts/${id}/`, discount);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/ecommerce/discounts/${id}/`);
  },
};

// Brands API
export const brandsApi = {
  getAll: async (): Promise<Brand[]> => {
    const { data } = await axiosInstance.get('/ecommerce/brands/');
    return data.results || data;
  },

  getById: async (id: number): Promise<Brand> => {
    const { data } = await axiosInstance.get(`/ecommerce/brands/${id}/`);
    return data;
  },

  create: async (brand: CreateBrandDTO): Promise<Brand> => {
    const formData = new FormData();
    formData.append('name', brand.name);
    if (brand.logo_image) formData.append('logo_image', brand.logo_image);
    if (brand.logo_text) formData.append('logo_text', brand.logo_text);
    if (brand.website_url) formData.append('website_url', brand.website_url);
    if (brand.display_order) formData.append('display_order', brand.display_order.toString());
    if (brand.is_active !== undefined) formData.append('is_active', brand.is_active.toString());

    const { data } = await axiosInstance.post('/ecommerce/brands/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  update: async ({ id, ...brand }: UpdateBrandDTO): Promise<Brand> => {
    const formData = new FormData();
    if (brand.name) formData.append('name', brand.name);
    if (brand.logo_image) formData.append('logo_image', brand.logo_image);
    if (brand.logo_text) formData.append('logo_text', brand.logo_text);
    if (brand.website_url) formData.append('website_url', brand.website_url);
    if (brand.display_order !== undefined) formData.append('display_order', brand.display_order.toString());
    if (brand.is_active !== undefined) formData.append('is_active', brand.is_active.toString());

    const { data } = await axiosInstance.patch(`/ecommerce/brands/${id}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/ecommerce/brands/${id}/`);
  },
};

// Home Page Settings API
export const homePageSettingsApi = {
  get: async (): Promise<HomePageSettings> => {
    const { data } = await axiosInstance.get('/ecommerce/home-page-settings/');
    return data;
  },

  update: async (settings: FormData): Promise<HomePageSettings> => {
    const { data } = await axiosInstance.patch('/ecommerce/home-page-settings/1/', settings, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};

// Product Ecommerce Status API
export const productEcommerceApi = {
  updateStatus: async (productId: number, status: {
    is_new_arrival?: boolean;
    is_trending?: boolean;
    is_featured?: boolean;
    ecommerce_statuses?: number[]; // List of ProductStatus IDs
  }): Promise<any> => {
    const { data } = await axiosInstance.patch(`/inventory/products/${productId}/update_ecommerce_status/`, status);
    return data;
  },
};

// Product Statuses API (Sections)
export const productStatusesApi = {
  getAll: async (): Promise<ProductStatus[]> => {
    const { data } = await axiosInstance.get('/ecommerce/product-statuses/');
    return data.results || data;
  },

  getById: async (id: number): Promise<ProductStatus> => {
    const { data } = await axiosInstance.get(`/ecommerce/product-statuses/${id}/`);
    return data;
  },

  create: async (status: Partial<ProductStatus>): Promise<ProductStatus> => {
    const { data } = await axiosInstance.post('/ecommerce/product-statuses/', status);
    return data;
  },

  update: async (id: number, status: Partial<ProductStatus>): Promise<ProductStatus> => {
    const { data } = await axiosInstance.patch(`/ecommerce/product-statuses/${id}/`, status);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/ecommerce/product-statuses/${id}/`);
  },
};

// Hero Slides API
export const heroSlidesApi = {
  getAll: async (): Promise<HeroSlide[]> => {
    const { data } = await axiosInstance.get('/ecommerce/hero-slides/');
    return data.results || data;
  },

  getById: async (id: number): Promise<HeroSlide> => {
    const { data } = await axiosInstance.get(`/ecommerce/hero-slides/${id}/`);
    return data;
  },

  create: async (slide: CreateHeroSlideDTO): Promise<HeroSlide> => {
    const formData = new FormData();
    formData.append('title', slide.title);
    if (slide.subtitle) formData.append('subtitle', slide.subtitle);
    if (slide.button_text) formData.append('button_text', slide.button_text);
    if (slide.image) formData.append('image', slide.image);
    if (slide.bg_color) formData.append('bg_color', slide.bg_color);
    if (slide.layout) formData.append('layout', slide.layout);
    if (slide.title_class) formData.append('title_class', slide.title_class);
    if (slide.subtitle_class) formData.append('subtitle_class', slide.subtitle_class);
    if (slide.stats) formData.append('stats', JSON.stringify(slide.stats));
    if (slide.display_order !== undefined) formData.append('display_order', slide.display_order.toString());
    if (slide.is_active !== undefined) formData.append('is_active', slide.is_active.toString());

    const { data } = await axiosInstance.post('/ecommerce/hero-slides/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  update: async ({ id, ...slide }: UpdateHeroSlideDTO): Promise<HeroSlide> => {
    const formData = new FormData();
    if (slide.title) formData.append('title', slide.title);
    if (slide.subtitle !== undefined) formData.append('subtitle', slide.subtitle);
    if (slide.button_text) formData.append('button_text', slide.button_text);
    if (slide.image) formData.append('image', slide.image);
    if (slide.bg_color) formData.append('bg_color', slide.bg_color);
    if (slide.layout) formData.append('layout', slide.layout);
    if (slide.title_class) formData.append('title_class', slide.title_class);
    if (slide.subtitle_class) formData.append('subtitle_class', slide.subtitle_class);
    if (slide.stats) formData.append('stats', JSON.stringify(slide.stats));
    if (slide.display_order !== undefined) formData.append('display_order', slide.display_order.toString());
    if (slide.is_active !== undefined) formData.append('is_active', slide.is_active.toString());

    const { data } = await axiosInstance.patch(`/ecommerce/hero-slides/${id}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/ecommerce/hero-slides/${id}/`);
  },
};

// Promotional Modals API
export interface PromotionalModal {
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
}

export interface CreatePromotionalModalDTO {
  title: string;
  description: string;
  discount_code?: string;
  cta_text: string;
  cta_url?: string;
  image?: File;
  layout: string;
  color_theme: string;
  display_rules: any;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export interface UpdatePromotionalModalDTO {
  id: number;
  title?: string;
  description?: string;
  discount_code?: string;
  cta_text?: string;
  cta_url?: string;
  image?: File;
  layout?: string;
  color_theme?: string;
  display_rules?: any;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
}

export const promotionalModalsApi = {
  getAll: async (): Promise<PromotionalModal[]> => {
    const { data } = await axiosInstance.get('/ecommerce/promotional-modals/');
    return data;
  },

  getById: async (id: number): Promise<PromotionalModal> => {
    const { data } = await axiosInstance.get(`/ecommerce/promotional-modals/${id}/`);
    return data;
  },

  create: async (modal: CreatePromotionalModalDTO): Promise<PromotionalModal> => {
    const formData = new FormData();
    formData.append('title', modal.title);
    formData.append('description', modal.description);
    if (modal.discount_code) formData.append('discount_code', modal.discount_code);
    formData.append('cta_text', modal.cta_text);
    if (modal.cta_url) formData.append('cta_url', modal.cta_url);
    if (modal.image) formData.append('image', modal.image);
    formData.append('layout', modal.layout);
    formData.append('color_theme', modal.color_theme);
    formData.append('display_rules', JSON.stringify(modal.display_rules));
    formData.append('start_date', modal.start_date);
    formData.append('end_date', modal.end_date);
    formData.append('is_active', String(modal.is_active));

    // Targeting rules default
    formData.append("targeting_rules", JSON.stringify({ devices: ["all"], users: ["all"] }));

    const { data } = await axiosInstance.post('/ecommerce/promotional-modals/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },

  update: async ({ id, ...modal }: UpdatePromotionalModalDTO): Promise<PromotionalModal> => {
    const formData = new FormData();
    if (modal.title) formData.append('title', modal.title);
    if (modal.description) formData.append('description', modal.description);
    if (modal.discount_code !== undefined) formData.append('discount_code', modal.discount_code);
    if (modal.cta_text) formData.append('cta_text', modal.cta_text);
    if (modal.cta_url !== undefined) formData.append('cta_url', modal.cta_url);
    if (modal.image) formData.append('image', modal.image);
    if (modal.layout) formData.append('layout', modal.layout);
    if (modal.color_theme) formData.append('color_theme', modal.color_theme);
    if (modal.display_rules) formData.append('display_rules', JSON.stringify(modal.display_rules));
    if (modal.start_date) formData.append('start_date', modal.start_date);
    if (modal.end_date) formData.append('end_date', modal.end_date);
    if (modal.is_active !== undefined) formData.append('is_active', String(modal.is_active));

    const { data } = await axiosInstance.patch(`/ecommerce/promotional-modals/${id}/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/ecommerce/promotional-modals/${id}/`);
  },
};

// Ecommerce API (shared settings & logic)
export const ecommerceApi = {
  // Public: Get delivery settings
  getDeliverySettings: async (): Promise<{ inside_dhaka_charge: number; inside_gazipur_charge: number; outside_dhaka_charge: number; updated_at: string }> => {
    const { data } = await axiosInstance.get('/ecommerce/public/delivery-settings/');
    return data;
  },

  // Public: Price cart items on the server
  priceCart: async (items: Array<{ productId: string | number; quantity: number; variations?: Record<string, string> }>): Promise<any> => {
    const { data } = await axiosInstance.post('/ecommerce/public/cart/price/', { items });
    return data;
  },
};
