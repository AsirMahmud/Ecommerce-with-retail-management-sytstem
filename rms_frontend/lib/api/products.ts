import apiClient from '../api-client';

export interface Product {
    id: number;
    name: string;
    sku: string;
    price: number;
    stock: number;
    category: string;
    description?: string;
    created_at: string;
    updated_at: string;
}

export interface CreateProductDTO {
    name: string;
    sku: string;
    price: number;
    stock: number;
    category: string;
    description?: string;
}

export interface UpdateProductDTO extends Partial<CreateProductDTO> {
    id: number;
}

export const productsApi = {
    getAll: async (): Promise<Product[]> => {
        const { data } = await apiClient.get<Product[]>('/products/');
        return data;
    },

    getById: async (id: number): Promise<Product> => {
        const { data } = await apiClient.get<Product>(`/products/${id}/`);
        return data;
    },

    create: async (product: CreateProductDTO): Promise<Product> => {
        const { data } = await apiClient.post<Product>('/products/', product);
        return data;
    },

    update: async ({ id, ...product }: UpdateProductDTO): Promise<Product> => {
        const { data } = await apiClient.put<Product>(`/products/${id}/`, product);
        return data;
    },

    delete: async (id: number): Promise<void> => {
        await apiClient.delete(`/products/${id}/`);
    }
};
 