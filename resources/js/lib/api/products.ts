// ════════════════════════════════════════════════
// lib/api/products.ts
// ════════════════════════════════════════════════
import client from './client';
import type { Product, ProductVariant, PaginatedResponse } from '@/types';

export interface ProductFilters {
  search?: string;
  family_id?: number;
  brand_id?: number;
  active?: boolean;
  page?: number;
  per_page?: number;
}

export const productsApi = {
  list:          (filters?: ProductFilters)       => client.get<PaginatedResponse<Product>>('/products', { params: filters }),
  get:           (id: number)                     => client.get<{ data: Product }>(`/products/${id}`),
  create:        (data: Partial<Product>)         => client.post<{ data: Product }>('/products', data),
  update:        (id: number, data: Partial<Product>) => client.put<{ data: Product }>(`/products/${id}`, data),
  delete:        (id: number)                     => client.delete(`/products/${id}`),
  getActive:     ()                               => client.get<{ data: Product[] }>('/products/active'),
  getByFamily:   (familyId: number)               => client.get<{ data: Product[] }>(`/products/by-family/${familyId}`),
  getByBrand:    (brandId: number)                => client.get<{ data: Product[] }>(`/products/by-brand/${brandId}`),
};

export const variantsApi = {
  list:          (filters?: { search?: string; page?: number }) => client.get<PaginatedResponse<ProductVariant>>('/product-variants', { params: filters }),
  get:           (id: number)                     => client.get<{ data: ProductVariant }>(`/product-variants/${id}`),
  create:        (data: Partial<ProductVariant>)  => client.post<{ data: ProductVariant }>('/product-variants', data),
  update:        (id: number, data: Partial<ProductVariant>) => client.put<{ data: ProductVariant }>(`/product-variants/${id}`, data),
  delete:        (id: number)                     => client.delete(`/product-variants/${id}`),
  getLowStock:   ()                               => client.get<{ data: ProductVariant[] }>('/product-variants/low-stock'),
  getByBarcode:  (barcode: string)                => client.get<{ data: ProductVariant[] }>('/product-variants', { params: { barcode } }),
};
