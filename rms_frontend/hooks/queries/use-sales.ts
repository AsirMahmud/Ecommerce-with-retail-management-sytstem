import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getSales,
    getDueSales,
    getSale,
    createSale,
    updateSale,
    deleteSale,
    bulkDeleteSales,
    getPayments,
    addPayment,
    getReturns,
    createReturn,
    approveReturn,
    rejectReturn,
    lookupCustomer,
    getDashboardStats,
    PaginatedResponse,
    deleteAllSales,
    getSalesSummary
} from '@/lib/api/sales';
import type { Sale, Payment, Return, SalesSummary } from '@/types/sales';
import { useToast } from '../use-toast';

export const useSales = (params?: {
    start_date?: string;
    end_date?: string;
    status?: string;
    sale_type?: string;
    payment_method?: string;
    payment_status?: string;
    customer_phone?: string;
    search?: string;
    ordering?: string;
    page?: number;
    page_size?: number;
}) => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const salesQuery = useQuery({
        queryKey: ['sales', params],
        queryFn: () => getSales(params)
    });

    const summaryParams = {
        start_date: params?.start_date,
        end_date: params?.end_date,
        status: params?.status,
        sale_type: params?.sale_type,
        payment_method: params?.payment_method,
        payment_status: params?.payment_status,
        customer_phone: params?.customer_phone,
        search: params?.search,
    };

    const summaryQuery = useQuery({
        queryKey: ['sales-summary', summaryParams],
        queryFn: () => getSalesSummary(summaryParams)
    });

    const createSaleMutation = useMutation({
        mutationFn: createSale,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            queryClient.invalidateQueries({ queryKey: ['sales-summary'] });
            toast({
                title: 'Success',
                description: 'Sale created successfully'
            });
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: 'Failed to create sale',
                variant: 'destructive'
            });
        }
    });

    const updateSaleMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<Sale> }) => updateSale(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            queryClient.invalidateQueries({ queryKey: ['sales-summary'] });
            toast({
                title: 'Success',
                description: 'Sale updated successfully'
            });
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: 'Failed to update sale',
                variant: 'destructive'
            });
        }
    });

    const deleteSaleMutation = useMutation({
        mutationFn: deleteSale,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            queryClient.invalidateQueries({ queryKey: ['sales-summary'] });
            toast({
                title: 'Success',
                description: 'Sale deleted successfully'
            });
        },
        onError: (error: any) => {
            toast({
                title: 'Error',
                description: error.response?.data?.error || 'Failed to delete sale',
                variant: 'destructive'
            });
        }
    });

    const bulkDeleteSalesMutation = useMutation({
        mutationFn: bulkDeleteSales,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            queryClient.invalidateQueries({ queryKey: ['sales-summary'] });
            toast({
                title: 'Success',
                description: data.message || 'Sales deleted successfully'
            });
        },
        onError: (error: any) => {
            toast({
                title: 'Error',
                description: error.response?.data?.error || 'Failed to delete sales',
                variant: 'destructive'
            });
        }
    });

    const deleteAllSalesMutation = useMutation({
        mutationFn: deleteAllSales,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            queryClient.invalidateQueries({ queryKey: ['sales-summary'] });
            toast({
                title: 'Success',
                description: data.message || 'All sales deleted successfully'
            });
        },
        onError: (error: any) => {
            toast({
                title: 'Error',
                description: error.response?.data?.error || 'Failed to delete all sales',
                variant: 'destructive'
            });
        }
    });

    return {
        sales: salesQuery.data?.results || [],
        pagination: {
            count: salesQuery.data?.count || 0,
            next: salesQuery.data?.next,
            previous: salesQuery.data?.previous,
            currentPage: params?.page || 1,
            pageSize: params?.page_size || 10
        },
        summary: summaryQuery.data,
        isSummaryLoading: summaryQuery.isLoading,
        isLoading: salesQuery.isLoading,
        isFetching: salesQuery.isFetching || summaryQuery.isFetching,
        refetch: () => {
            salesQuery.refetch();
            summaryQuery.refetch();
        },
        error: salesQuery.error,
        createSale: createSaleMutation.mutate,
        updateSale: updateSaleMutation.mutate,
        deleteSale: deleteSaleMutation.mutate,
        bulkDeleteSales: bulkDeleteSalesMutation.mutate,
        deleteAllSales: deleteAllSalesMutation.mutate,
        isCreating: createSaleMutation.isPending,
        isUpdating: updateSaleMutation.isPending,
        isDeleting: deleteSaleMutation.isPending,
        isBulkDeleting: bulkDeleteSalesMutation.isPending,
        isDeletingAll: deleteAllSalesMutation.isPending
    };
};

export const useSalesSummary = (params?: {
    start_date?: string;
    end_date?: string;
    status?: string;
    sale_type?: string;
    payment_method?: string;
    payment_status?: string;
    customer_phone?: string;
    search?: string;
}) => {
    const query = useQuery({
        queryKey: ['sales-summary', params],
        queryFn: () => getSalesSummary(params)
    });

    return {
        summary: query.data,
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        refetch: query.refetch,
        error: query.error
    };
};

export const useDueSales = (params?: {
    ordering?: string;
    page?: number;
    page_size?: number;
}) => {
    const salesQuery = useQuery({
        queryKey: ['due-sales', params],
        queryFn: () => getDueSales(params)
    });

    return {
        sales: salesQuery.data?.results || [],
        pagination: {
            count: salesQuery.data?.count || 0,
            next: salesQuery.data?.next,
            previous: salesQuery.data?.previous,
            currentPage: params?.page || 1,
            pageSize: params?.page_size || 10
        },
        isLoading: salesQuery.isLoading,
        error: salesQuery.error,
    };
};

export const useSale = (id: number) => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const saleQuery = useQuery({
        queryKey: ['sale', id],
        queryFn: () => getSale(id)
    });

    const addPaymentMutation = useMutation({
        mutationFn: ({ saleId, data }: { saleId: number; data: Partial<Payment> }) => addPayment(saleId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sale', id] });
            toast({
                title: 'Success',
                description: 'Payment added successfully'
            });
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: 'Failed to add payment',
                variant: 'destructive'
            });
        }
    });

    const createReturnMutation = useMutation({
        mutationFn: ({ saleId, data }: { saleId: number; data: Partial<Return> }) => createReturn(saleId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sale', id] });
            toast({
                title: 'Success',
                description: 'Return created successfully'
            });
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: 'Failed to create return',
                variant: 'destructive'
            });
        }
    });

    return {
        sale: saleQuery.data,
        isLoading: saleQuery.isLoading,
        error: saleQuery.error,
        addPayment: addPaymentMutation.mutate,
        createReturn: createReturnMutation.mutate,
        isAddingPayment: addPaymentMutation.isPending,
        isCreatingReturn: createReturnMutation.isPending
    };
};

export const useReturns = (params?: {
    start_date?: string;
    end_date?: string;
    status?: string;
    search?: string;
    ordering?: string;
}) => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const returnsQuery = useQuery({
        queryKey: ['returns', params],
        queryFn: () => getReturns(params)
    });

    const approveReturnMutation = useMutation({
        mutationFn: approveReturn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['returns'] });
            toast({
                title: 'Success',
                description: 'Return approved successfully'
            });
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: 'Failed to approve return',
                variant: 'destructive'
            });
        }
    });

    const rejectReturnMutation = useMutation({
        mutationFn: rejectReturn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['returns'] });
            toast({
                title: 'Success',
                description: 'Return rejected successfully'
            });
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: 'Failed to reject return',
                variant: 'destructive'
            });
        }
    });

    return {
        returns: returnsQuery.data,
        isLoading: returnsQuery.isLoading,
        error: returnsQuery.error,
        approveReturn: approveReturnMutation.mutate,
        rejectReturn: rejectReturnMutation.mutate,
        isApproving: approveReturnMutation.isPending,
        isRejecting: rejectReturnMutation.isPending
    };
};

export const useCustomerLookup = (phone: string) => {
    return useQuery({
        queryKey: ['customer-lookup', phone],
        queryFn: () => lookupCustomer(phone),
        enabled: !!phone
    });
};

export const useDashboardStats = (params?: {
    period?: string;
    start_date?: string;
    end_date?: string;
    status?: string;
    payment_method?: string;
    customer_phone?: string;
}) => {
    return useQuery({
        queryKey: ['dashboard-stats', params],
        queryFn: () => getDashboardStats(params)
    });
}; 