'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  discountsApi,
  couponsApi,
  brandsApi,
  homePageSettingsApi,
  productEcommerceApi,
  heroSlidesApi,
  productStatusesApi,
  Discount,
  Brand,
  HomePageSettings,
  HeroSlide,
  ProductStatus,
  CreateDiscountDTO,
  UpdateDiscountDTO,
  CreateBrandDTO,
  UpdateBrandDTO,
  UpdateHomePageSettingsDTO,
  CreateHeroSlideDTO,
  UpdateHeroSlideDTO
} from '@/lib/api/ecommerce';

export type { ProductStatus };

// Query Keys
export const ecommerceKeys = {
  all: ['ecommerce'] as const,
  discounts: {
    all: () => [...ecommerceKeys.all, 'discounts'] as const,
    lists: () => [...ecommerceKeys.discounts.all(), 'list'] as const,
    list: (filters: string) => [...ecommerceKeys.discounts.lists(), { filters }] as const,
    details: () => [...ecommerceKeys.discounts.all(), 'detail'] as const,
    detail: (id: number) => [...ecommerceKeys.discounts.details(), id] as const,
  },
  coupons: {
    all: () => [...ecommerceKeys.all, 'coupons'] as const,
  },
  brands: {
    all: () => [...ecommerceKeys.all, 'brands'] as const,
    lists: () => [...ecommerceKeys.brands.all(), 'list'] as const,
    list: (filters: string) => [...ecommerceKeys.brands.lists(), { filters }] as const,
    details: () => [...ecommerceKeys.brands.all(), 'detail'] as const,
    detail: (id: number) => [...ecommerceKeys.brands.details(), id] as const,
  },
  homePageSettings: {
    all: () => [...ecommerceKeys.all, 'home-page-settings'] as const,
    detail: () => [...ecommerceKeys.homePageSettings.all(), 'detail'] as const,
  },
  products: {
    all: () => [...ecommerceKeys.all, 'products'] as const,
    ecommerceStatus: (id: number) => [...ecommerceKeys.products.all(), 'ecommerce-status', id] as const,
  },
  heroSlides: {
    all: () => [...ecommerceKeys.all, 'hero-slides'] as const,
    lists: () => [...ecommerceKeys.heroSlides.all(), 'list'] as const,
    list: (filters: string) => [...ecommerceKeys.heroSlides.lists(), { filters }] as const,
    details: () => [...ecommerceKeys.heroSlides.all(), 'detail'] as const,
    detail: (id: number) => [...ecommerceKeys.heroSlides.details(), id] as const,
  },
  productStatuses: {
    all: () => [...ecommerceKeys.all, 'product-statuses'] as const,
    lists: () => [...ecommerceKeys.productStatuses.all(), 'list'] as const,
    details: () => [...ecommerceKeys.productStatuses.all(), 'detail'] as const,
    detail: (id: number) => [...ecommerceKeys.productStatuses.details(), id] as const,
  },
};

export const useCoupons = () => useQuery({
  queryKey: ecommerceKeys.coupons.all(),
  queryFn: couponsApi.getAll,
});

export const useCreateCoupon = () => {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: couponsApi.create, onSuccess: () => queryClient.invalidateQueries({ queryKey: ecommerceKeys.coupons.all() }) });
};

export const useUpdateCoupon = () => {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: couponsApi.update, onSuccess: () => queryClient.invalidateQueries({ queryKey: ecommerceKeys.coupons.all() }) });
};

export const useDeleteCoupon = () => {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: couponsApi.delete, onSuccess: () => queryClient.invalidateQueries({ queryKey: ecommerceKeys.coupons.all() }) });
};

export const useSetCouponActive = () => {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: couponsApi.setActive, onSuccess: () => queryClient.invalidateQueries({ queryKey: ecommerceKeys.coupons.all() }) });
};

// Discount Hooks
export const useDiscounts = (filters?: string) => {
  return useQuery({
    queryKey: ecommerceKeys.discounts.list(filters || ''),
    queryFn: discountsApi.getAll,
  });
};

export const useDiscount = (id: number) => {
  return useQuery({
    queryKey: ecommerceKeys.discounts.detail(id),
    queryFn: () => discountsApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateDiscount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: discountsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ecommerceKeys.discounts.lists() });
    },
  });
};

export const useUpdateDiscount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: discountsApi.update,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ecommerceKeys.discounts.lists() });
      queryClient.invalidateQueries({ queryKey: ecommerceKeys.discounts.detail(data.id) });
    },
  });
};

export const useDeleteDiscount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: discountsApi.delete,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ecommerceKeys.discounts.lists() });
      queryClient.invalidateQueries({ queryKey: ecommerceKeys.discounts.detail(id) });
    },
  });
};

// Brand Hooks
export const useBrands = (filters?: string) => {
  return useQuery({
    queryKey: ecommerceKeys.brands.list(filters || ''),
    queryFn: brandsApi.getAll,
  });
};

export const useBrand = (id: number) => {
  return useQuery({
    queryKey: ecommerceKeys.brands.detail(id),
    queryFn: () => brandsApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateBrand = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: brandsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ecommerceKeys.brands.lists() });
    },
  });
};

export const useUpdateBrand = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: brandsApi.update,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ecommerceKeys.brands.lists() });
      queryClient.invalidateQueries({ queryKey: ecommerceKeys.brands.detail(data.id) });
    },
  });
};

export const useDeleteBrand = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: brandsApi.delete,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ecommerceKeys.brands.lists() });
      queryClient.invalidateQueries({ queryKey: ecommerceKeys.brands.detail(id) });
    },
  });
};

// Home Page Settings Hooks
export const useHomePageSettings = () => {
  return useQuery({
    queryKey: ecommerceKeys.homePageSettings.detail(),
    queryFn: homePageSettingsApi.get,
  });
};

export const useUpdateHomePageSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: FormData) => homePageSettingsApi.update(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ecommerceKeys.homePageSettings.detail() });
    },
  });
};

// Product Ecommerce Status Hooks
export const useUpdateProductEcommerceStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, status }: {
      productId: number;
      status: {
        is_new_arrival?: boolean;
        is_trending?: boolean;
        is_featured?: boolean;
        ecommerce_statuses?: number[];
      }
    }) => productEcommerceApi.updateStatus(productId, status),
    onMutate: async ({ productId, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['inventory', 'products', 'list'] });

      // Snapshot the previous value
      const previousProducts = queryClient.getQueryData(['inventory', 'products', 'list']);

      // Optimistically update to the new value
      queryClient.setQueryData(['inventory', 'products', 'list'], (old: any) => {
        if (!old) return old;
        return old.map((product: any) => {
          if (product.id === productId) {
            return {
              ...product,
              ...status,
              // If ecommerce_statuses is being updated, transform IDs to objects
              ...(status.ecommerce_statuses !== undefined && {
                ecommerce_statuses: status.ecommerce_statuses.map(id => {
                  // Try to find existing status object, or create minimal one
                  const existing = product.ecommerce_statuses?.find((s: any) => s.id === id);
                  return existing || { id, name: 'Loading...' };
                })
              })
            };
          }
          return product;
        });
      });

      return { previousProducts };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousProducts) {
        queryClient.setQueryData(['inventory', 'products', 'list'], context.previousProducts);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure sync
      queryClient.invalidateQueries({ queryKey: ['inventory', 'products', 'list'] });
    },
  });
};

// Product Status Hooks (Sections)
export const useProductStatuses = () => {
  return useQuery({
    queryKey: ecommerceKeys.productStatuses.lists(),
    queryFn: productStatusesApi.getAll,
  });
};

export const useProductStatus = (id: number) => {
  return useQuery({
    queryKey: ecommerceKeys.productStatuses.detail(id),
    queryFn: () => productStatusesApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateProductStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: productStatusesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ecommerceKeys.productStatuses.lists() });
    },
  });
};

export const useUpdateProductStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: Partial<ProductStatus> }) =>
      productStatusesApi.update(id, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ecommerceKeys.productStatuses.lists() });
      queryClient.invalidateQueries({ queryKey: ecommerceKeys.productStatuses.detail(data.id) });
    },
  });
};

export const useDeleteProductStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: productStatusesApi.delete,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ecommerceKeys.productStatuses.lists() });
      queryClient.invalidateQueries({ queryKey: ecommerceKeys.productStatuses.detail(id) });
    },
  });
};

// Hero Slides Hooks
export const useHeroSlides = (filters?: string) => {
  return useQuery({
    queryKey: ecommerceKeys.heroSlides.list(filters || ''),
    queryFn: heroSlidesApi.getAll,
  });
};

export const useHeroSlide = (id: number) => {
  return useQuery({
    queryKey: ecommerceKeys.heroSlides.detail(id),
    queryFn: () => heroSlidesApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateHeroSlide = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: heroSlidesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ecommerceKeys.heroSlides.lists() });
    },
  });
};

export const useUpdateHeroSlide = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: heroSlidesApi.update,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ecommerceKeys.heroSlides.lists() });
      queryClient.invalidateQueries({ queryKey: ecommerceKeys.heroSlides.detail(data.id) });
    },
  });
};

export const useDeleteHeroSlide = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: heroSlidesApi.delete,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ecommerceKeys.heroSlides.lists() });
      queryClient.invalidateQueries({ queryKey: ecommerceKeys.heroSlides.detail(id) });
    },
  });
};
