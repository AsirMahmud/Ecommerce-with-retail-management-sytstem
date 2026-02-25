export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

export interface Category {
    id: number;
    name: string;
    slug: string;
    description?: string;
    parent?: number;
    product_count?: number;
    total_stock?: number;
    children?: Category[];
    order?: number;
    gender?: string;
    created_at: string;
    updated_at: string;
    detailed_stats?: {
        color_breakdown: { color: string; total_stock: number }[];
        size_breakdown: { size: string; total_stock: number }[];
        max_inventory: { name: string | null; stock: number };
        min_inventory: { name: string | null; stock: number };
        performance: {
            total_sold: number;
            total_revenue: number;
            best_selling_color: string | null;
        };
        products_detail?: {
            id: number;
            name: string;
            total_stock: number;
            size_breakdown: { size: string; total_stock: number }[];
            color_breakdown: { color: string; total_stock: number }[];
        }[];
        financials?: {
            total_investment: number;
            expected_revenue: number;
            potential_profit: number;
        };
    };
}

export interface Supplier {
    id: number;
    company_name: string;
    contact_person: string;
    email: string;
    phone: string;
    address: string;
    tax_number: string | null;
    website: string | null;
    payment_terms: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    products_count?: number;
    total_value?: number;
}

export interface Product {
    id: number;
    name: string;
    sku: string;
    barcode?: string;
    description?: string;
    category?: Category;
    online_categories?: Category[];
    supplier?: Supplier;
    cost_price: number;
    selling_price: number;
    stock_quantity: number;
    minimum_stock: number;
    image?: string;
    is_active: boolean;
    size_type?: string;
    size_category?: string;
    gender?: string;
    assign_to_online?: boolean;
    created_at: string;
    updated_at: string;
    variations?: ProductVariation[];
    galleries?: Gallery[];
    material_composition?: MeterialComposition[];
    material_composition_string?: string;
    who_is_this_for?: WhoIsThisFor[];
    features?: FeatureItem[];
    discount_percentage?: number;
    discount_end_date?: string | null;
    sale_price?: number;
    first_variation_color?: string | null;
    first_variation_size?: string | null;
    first_variation_image?: string | null;
}

export interface ProductVariation {
    id: number;
    product: number;
    size: string;
    color: string;
    color_hax?: string;
    stock: number;
    waist_size?: number;
    chest_size?: number;
    height?: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// Gallery groups images by color (up to 4 images per color)
export interface Gallery {
    id: number;
    color: string;
    color_hax?: string;
    alt_text?: string;
    images: GalleryImage[];
}

// Individual image within a gallery
export interface GalleryImage {
    id: number;
    imageType: 'PRIMARY' | 'SECONDARY' | 'THIRD' | 'FOURTH';
    image: string; // URL path returned by backend
    alt_text?: string;
}

export interface MeterialComposition {
    id: number;
    percentige: number;
    title?: string | null;
}

export interface WhoIsThisFor {
    id: number;
    title?: string | null;
    description?: string | null;
}

export interface FeatureItem {
    id: number;
    title?: string | null;
    description?: string | null;
}

// DTOs for creating/updating
export interface CreateCategoryDTO {
    name: string;
    description?: string;
    parent?: number;
    gender?: string;
}

export type CreateSupplierDTO = Omit<Supplier, 'id' | 'created_at' | 'updated_at'>;
export type UpdateSupplierDTO = Partial<CreateSupplierDTO> & { id: number };

export interface CreateProductDTO {
    name: string;
    barcode?: string;
    description?: string;
    category?: number;
    online_categories?: number[];
    supplier?: number;
    cost_price: number;
    selling_price: number;
    stock_quantity?: number;
    minimum_stock: number;
    image?: File;
    is_active: boolean;
    size_type?: string;
    size_category?: string;
    gender?: string;
    variations?: {
        size: string;
        color: string;
        color_hax?: string;
        stock: number;
        waist_size?: number;
        chest_size?: number;
        height?: number;
    }[];
    galleries?: {
        color: string;
        color_hax?: string;
        alt_text?: string;
        images?: {
            imageType: 'PRIMARY' | 'SECONDARY' | 'THIRD' | 'FOURTH';
            image: File;
            alt_text?: string;
        }[];
    }[];
    material_composition?: {
        percentige: number;
        title?: string | null;
    }[];
    who_is_this_for?: {
        title?: string | null;
        description?: string | null;
    }[];
    features?: {
        title?: string | null;
        description?: string | null;
    }[];
}

export interface CreateProductVariationDTO {
    product: number;
    variation_code: string;
    attributes: Record<string, string>;
    price_adjustment: number;
    stock_quantity: number;
    is_active: boolean;
}

export interface CreateGalleryDTO {
    product: number;
    color: string;
    color_hax?: string;
    alt_text?: string;
}

export interface CreateGalleryImageDTO {
    gallery: number;
    imageType: 'PRIMARY' | 'SECONDARY' | 'THIRD' | 'FOURTH';
    image: File;
    alt_text?: string;
}

// Update DTOs extend the Create DTOs with an id
export interface UpdateCategoryDTO extends Partial<CreateCategoryDTO> {
    id: number;
}

export interface UpdateProductDTO extends Partial<CreateProductDTO> {
    id: number;
}

export interface UpdateProductVariationDTO extends Partial<CreateProductVariationDTO> {
    id: number;
}

export interface UpdateGalleryDTO extends Partial<CreateGalleryDTO> {
    id: number;
}

export interface UpdateGalleryImageDTO extends Partial<CreateGalleryImageDTO> {
    id: number;
}

export interface InventoryAlert {
    id: number;
    product: number;
    variation?: number;
    alert_type: 'LOW' | 'OUT' | 'EXP';
    message: string;
    is_active: boolean;
    created_at: string;
    resolved_at?: string;
}

export interface DashboardMetrics {
    total_products: number;
    active_products: number;
    out_of_stock_products: number;
    low_stock_products: number;
    total_inventory_value: number;
    stock_in: number;
    stock_out: number;
    stock_health: {
        healthy: number;
        low: number;
        out: number;
    };
}

export interface StockMovements {
    total_in: number;
    total_out: number;
    total_adjustments: number;
}

export interface CategoryDistribution {
    name: string;
    product_count: number;
    total_value: number;
}

export interface MovementTrend {
    date: string;
    stock_in: number;
    stock_out: number;
}

export interface StockMovement {
    id: number;
    product: Product;
    movement_type: 'IN' | 'OUT' | 'ADJ';
    quantity: number;
    created_at: string;
}

export interface SupplierMetrics {
    company_name: string;
    total_products: number;
    total_value: number;
    low_stock_count: number;
}

export interface DashboardOverview {
    period: string;
    date_range: {
        start: string;
        end: string;
    };
    metrics: DashboardMetrics;
    stock_movements: StockMovements;
    category_distribution: CategoryDistribution[];
    recent_alerts: InventoryAlert[];
    movement_trends: MovementTrend[];
    top_selling_products: Product[];
    recent_movements: StockMovement[];
    supplier_metrics: SupplierMetrics[];
}

export interface CategoryMetrics {
    id: number;
    name: string;
    total_products: number;
    active_products: number;
    low_stock_products: number;
    total_value: number;
    avg_stock_level: number;
}

export interface StockMovementAnalysis {
    daily_movements: {
        date: string;
        stock_in: number;
        stock_out: number;
    }[];
    category_movements: {
        product__category__name: string;
        stock_in: number;
        stock_out: number;
    }[];
} 