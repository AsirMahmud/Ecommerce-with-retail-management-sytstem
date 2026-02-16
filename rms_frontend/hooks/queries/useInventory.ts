'use client'
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import {
    categoriesApi,
    onlineCategoriesApi,
    productsApi,
    productVariationsApi,
    galleriesApi,
    galleryImagesApi,
    dashboardApi
} from '@/lib/api/inventory';
import { supplierApi } from '@/lib/api/supplier';
import {
    Category,
    Product,
    ProductVariation,
    Gallery,
    GalleryImage,
    CreateCategoryDTO,
    CreateProductDTO,
    CreateProductVariationDTO,
    CreateGalleryDTO,
    CreateGalleryImageDTO,
    UpdateCategoryDTO,
    UpdateProductDTO,
    UpdateProductVariationDTO,
    UpdateGalleryDTO,
    UpdateGalleryImageDTO,
    DashboardOverview,
    CategoryMetrics,
    StockMovementAnalysis
} from '@/types/inventory';

// Query Keys
export const inventoryKeys = {
    all: ['inventory'] as const,
    dashboard: {
        all: () => [...inventoryKeys.all, 'dashboard'] as const,
        overview: (period: string) => [...inventoryKeys.dashboard.all(), 'overview', period] as const,
        stockAlerts: () => [...inventoryKeys.dashboard.all(), 'stock-alerts'] as const,
        categoryMetrics: () => [...inventoryKeys.dashboard.all(), 'category-metrics'] as const,
        stockMovementAnalysis: (period: string) => [...inventoryKeys.dashboard.all(), 'stock-movement-analysis', period] as const,
    },
    categories: {
        all: () => [...inventoryKeys.all, 'categories'] as const,
        lists: () => [...inventoryKeys.categories.all(), 'list'] as const,
        list: (filters: string) => [...inventoryKeys.categories.lists(), { filters }] as const,
        details: () => [...inventoryKeys.categories.all(), 'detail'] as const,
        detail: (id: number) => [...inventoryKeys.categories.details(), id] as const,
    },
    suppliers: {
        all: () => [...inventoryKeys.all, 'suppliers'] as const,
        lists: () => [...inventoryKeys.suppliers.all(), 'list'] as const,
        list: (filters: string) => [...inventoryKeys.suppliers.lists(), { filters }] as const,
        details: () => [...inventoryKeys.suppliers.all(), 'detail'] as const,
        detail: (id: number) => [...inventoryKeys.suppliers.details(), id] as const,
    },
    products: {
        all: () => [...inventoryKeys.all, 'products'] as const,
        lists: () => [...inventoryKeys.products.all(), 'list'] as const,
        list: (params?: any) => [...inventoryKeys.products.lists(), { params }] as const,
        details: () => [...inventoryKeys.products.all(), 'detail'] as const,
        detail: (id: number) => [...inventoryKeys.products.details(), id] as const,
        variations: (productId: number) => [...inventoryKeys.products.detail(productId), 'variations'] as const,
        variation: (productId: number, id: number) => [...inventoryKeys.products.variations(productId), id] as const,
        galleries: (productId: number) => [...inventoryKeys.products.detail(productId), 'galleries'] as const,
        gallery: (productId: number, id: number) => [...inventoryKeys.products.galleries(productId), id] as const,
        analytics: (productId: number, days?: number) => [...inventoryKeys.products.detail(productId), 'analytics', days] as const,
        stockHistory: (productId: number, days?: number) => [...inventoryKeys.products.detail(productId), 'stock-history', days] as const,
        salesHistory: (productId: number, days?: number) => [...inventoryKeys.products.detail(productId), 'sales-history', days] as const,
    },
};

// Category Hooks
export const useCategories = (filters?: string) => {
    return useQuery({
        queryKey: inventoryKeys.categories.list(filters || ''),
        queryFn: categoriesApi.getAll,
    });
};

export const useOnlineCategories = (filters?: string) => {
    return useQuery({
        queryKey: ['online-categories', filters],
        queryFn: () => onlineCategoriesApi.getAll(),
    });
};

export const useCreateOnlineCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: onlineCategoriesApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['online-categories'] });
        },
    });
};

export const useUpdateOnlineCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: onlineCategoriesApi.update,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['online-categories'] });
            queryClient.invalidateQueries({ queryKey: ['online-categories', data.id] });
        },
    });
};

export const useDeleteOnlineCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: onlineCategoriesApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['online-categories'] });
        },
    });
};

export const useUpdateOnlineCategoryOrder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: onlineCategoriesApi.updateOrder,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['online-categories'] });
        },
    });
};

export const useCategory = (id: number) => {
    return useQuery({
        queryKey: inventoryKeys.categories.detail(id),
        queryFn: () => categoriesApi.getById(id),
        enabled: !!id,
    });
};

export const useCreateCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: categoriesApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: inventoryKeys.categories.lists() });
        },
    });
};

export const useUpdateCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: categoriesApi.update,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: inventoryKeys.categories.lists() });
            queryClient.invalidateQueries({ queryKey: inventoryKeys.categories.detail(data.id) });
        },
    });
};

export const useDeleteCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: categoriesApi.delete,
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: inventoryKeys.categories.lists() });
            queryClient.invalidateQueries({ queryKey: inventoryKeys.categories.detail(id) });
        },
    });
};

// Supplier Hooks
export const useSuppliers = (filters?: string) => {
    return useQuery({
        queryKey: ['suppliers', filters],
        queryFn: supplierApi.getAll,
    });
};

export const useSupplier = (id: number) => {
    return useQuery({
        queryKey: ['suppliers', id],
        queryFn: () => supplierApi.getById(id),
        enabled: !!id,
    });
};

export const useCreateSupplier = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: supplierApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
        },
    });
};

export const useUpdateSupplier = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: supplierApi.update,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            queryClient.invalidateQueries({ queryKey: ['suppliers', data.id] });
        },
    });
};

export const useDeleteSupplier = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: supplierApi.delete,
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            queryClient.invalidateQueries({ queryKey: ['suppliers', id] });
        },
    });
};

// Product Hooks
export const useProducts = (params?: any) => {
    return useQuery({
        queryKey: inventoryKeys.products.list(params),
        queryFn: () => productsApi.getAll(params),
    });
};

export const useProductStats = (params?: any) => {
    return useQuery({
        queryKey: [...inventoryKeys.products.lists(), 'stats', { params }],
        queryFn: () => productsApi.getStats(params),
    });
};

export const useInfiniteProducts = (params?: any, options?: any) => {
    return useInfiniteQuery({
        queryKey: [...inventoryKeys.products.lists(), 'infinite', { params }],
        queryFn: ({ pageParam = 1 }) => productsApi.getAll({ ...params, page: pageParam }),
        getNextPageParam: (lastPage) => {
            if (lastPage.next) {
                const url = new URL(lastPage.next);
                return parseInt(url.searchParams.get('page') || '1');
            }
            return undefined;
        },
        initialPageParam: 1,
        ...options,
    });
};

export const useProduct = (id: number) => {
    return useQuery({
        queryKey: inventoryKeys.products.detail(id),
        queryFn: () => productsApi.getById(id),
        enabled: !!id,
    });
};

export const useCreateProduct = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: productsApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: inventoryKeys.products.lists() });
        },
    });
};

export const useUpdateProduct = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: productsApi.update,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: inventoryKeys.products.lists() });
            queryClient.invalidateQueries({ queryKey: inventoryKeys.products.detail(data.id) });
        },
    });
};

export const useDeleteProduct = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: productsApi.delete,
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: inventoryKeys.products.lists() });
            queryClient.invalidateQueries({ queryKey: inventoryKeys.products.detail(id) });
        },
        onError: (error: any) => {
            // Only log actual errors, not successful 204/200 responses
            if (error?.response?.status !== 204 && error?.response?.status !== 200) {
                console.error('Delete product failed:', error.response?.data || error.message);
            }
        },
    });
};

// Product Variation Hooks
export const useProductVariations = (productId: number) => {
    return useQuery({
        queryKey: inventoryKeys.products.variations(productId),
        queryFn: () => productVariationsApi.getAll(productId),
        enabled: !!productId,
    });
};

export const useProductVariation = (productId: number, id: number) => {
    return useQuery({
        queryKey: inventoryKeys.products.variation(productId, id),
        queryFn: () => productVariationsApi.getById(productId, id),
        enabled: !!productId && !!id,
    });
};

export const useCreateProductVariation = (productId: number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (variation: CreateProductVariationDTO) => productVariationsApi.create(productId, variation),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: inventoryKeys.products.variations(productId) });
        },
    });
};

export const useUpdateProductVariation = (productId: number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (variation: UpdateProductVariationDTO) => productVariationsApi.update(productId, variation),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: inventoryKeys.products.variations(productId) });
            queryClient.invalidateQueries({ queryKey: inventoryKeys.products.variation(productId, data.id) });
        },
    });
};

export const useDeleteProductVariation = (productId: number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => productVariationsApi.delete(productId, id),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: inventoryKeys.products.variations(productId) });
            queryClient.invalidateQueries({ queryKey: inventoryKeys.products.variation(productId, id) });
        },
    });
};

// Gallery Hooks
export const useProductGalleries = (productId: number) => {
    return useQuery({
        queryKey: inventoryKeys.products.galleries(productId),
        queryFn: () => galleriesApi.getAll(productId),
        enabled: !!productId,
    });
};

export const useGallery = (id: number) => {
    return useQuery({
        queryKey: ['gallery', id],
        queryFn: () => galleriesApi.getById(id),
        enabled: !!id,
    });
};

export const useCreateGallery = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (gallery: CreateGalleryDTO) => galleriesApi.create(gallery),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: inventoryKeys.products.galleries(data.id) });
            queryClient.invalidateQueries({ queryKey: inventoryKeys.products.detail(data.id) });
        },
    });
};

export const useUploadColorImages = (productId: number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (formData: FormData) => galleriesApi.uploadColorImages(productId, formData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: inventoryKeys.products.galleries(productId) });
            queryClient.invalidateQueries({ queryKey: inventoryKeys.products.detail(productId) });
        },
    });
};

// Gallery Image Hooks
export const useCreateGalleryImage = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (image: CreateGalleryImageDTO) => galleryImagesApi.create(image),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['galleries'] });
        },
    });
};

export const useDeleteGalleryImage = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => galleryImagesApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['galleries'] });
        },
    });
};

// Dashboard Hooks
export const useDashboardOverview = (period: 'day' | 'month' | 'year' = 'day') => {
    return useQuery({
        queryKey: inventoryKeys.dashboard.overview(period),
        queryFn: () => dashboardApi.getOverview(period),
    });
};

export const useStockAlerts = () => {
    return useQuery({
        queryKey: inventoryKeys.dashboard.stockAlerts(),
        queryFn: dashboardApi.getStockAlerts,
    });
};

export const useCategoryMetrics = () => {
    return useQuery({
        queryKey: inventoryKeys.dashboard.categoryMetrics(),
        queryFn: dashboardApi.getCategoryMetrics,
    });
};

export const useStockMovementAnalysis = (period: 'day' | 'month' | 'year' = 'month') => {
    return useQuery({
        queryKey: inventoryKeys.dashboard.stockMovementAnalysis(period),
        queryFn: () => dashboardApi.getStockMovementAnalysis(period),
    });
};

// Product Analytics Hooks
export const useProductAnalytics = (productId: number, days?: number) => {
    return useQuery({
        queryKey: inventoryKeys.products.analytics(productId, days),
        queryFn: () => productsApi.getAnalytics(productId, days),
        enabled: !!productId,
    });
};

export const useProductStockHistory = (productId: number, days?: number) => {
    return useQuery({
        queryKey: inventoryKeys.products.stockHistory(productId, days),
        queryFn: () => productsApi.getStockHistory(productId, days),
        enabled: !!productId,
    });
};

export const useProductSalesHistory = (productId: number, days?: number) => {
    return useQuery({
        queryKey: inventoryKeys.products.salesHistory(productId, days),
        queryFn: () => productsApi.getSalesHistory(productId, days),
        enabled: !!productId,
    });
};

// Add Stock Hook
export const useAddStock = (productId: number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ variationId, quantity, notes }: { variationId: number; quantity: number; notes?: string }) =>
            productsApi.addStock(productId, variationId, quantity, notes),
        onSuccess: () => {
            // Invalidate relevant queries to refresh data
            queryClient.invalidateQueries({ queryKey: inventoryKeys.products.detail(productId) });
            queryClient.invalidateQueries({ queryKey: inventoryKeys.products.variations(productId) });
            queryClient.invalidateQueries({ queryKey: inventoryKeys.products.analytics(productId, 30) });
            queryClient.invalidateQueries({ queryKey: inventoryKeys.products.stockHistory(productId, 90) });
            queryClient.invalidateQueries({ queryKey: inventoryKeys.dashboard.stockAlerts() });
            queryClient.invalidateQueries({ queryKey: inventoryKeys.dashboard.stockMovementAnalysis('month') });
        },
    });
}; 