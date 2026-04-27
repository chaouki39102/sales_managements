// services/productService.ts
import apiClient from '@/lib/api/client';
import { Product, ProductInput, Family, Brand, ProductType, Unit, TvaRate, PriceLevel, InventoryValuationMethod, Warehouse } from '@/types/product';

const extractList = <T>(response: any): T[] => {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
};

export const productService = {
  getProducts: (params: Record<string, any>) =>
    apiClient.get('/products', { params }).then(res => res.data),

  getProduct: (id: number) =>
    apiClient.get<Product>(`/products/${id}`, { params: { include: 'family,brand,productType,variants.prices.priceLevel,variants.quantityDiscounts,variants.productLots.warehouse' } }).then(res => res.data),

  createProduct: (data: ProductInput) =>
    apiClient.post<Product>('/products', data).then(res => res.data),

  updateProduct: (id: number, data: Partial<ProductInput>) =>
    apiClient.put<Product>(`/products/${id}`, data).then(res => res.data),

  deleteProduct: (id: number) =>
    apiClient.delete(`/products/${id}`),

  // lookup data
  getFamilies: () => apiClient.get<Family[]>('/families', { params: { per_page: 200 } }).then(res => extractList(res.data)),
  getBrands: () => apiClient.get<Brand[]>('/brands', { params: { per_page: 200 } }).then(res => extractList(res.data)),
  getProductTypes: () => apiClient.get<ProductType[]>('/product-types', { params: { per_page: 50 } }).then(res => extractList(res.data)),
  getUnits: () => apiClient.get<Unit[]>('/units', { params: { per_page: 100 } }).then(res => extractList(res.data)),
  getTvaRates: () => apiClient.get<TvaRate[]>('/tvas', { params: { per_page: 20 } }).then(res => extractList(res.data)),
  getPriceLevels: () => apiClient.get<PriceLevel[]>('/price-levels', { params: { per_page: 50 } }).then(res => extractList(res.data)),
  getValuationMethods: () => apiClient.get<InventoryValuationMethod[]>('/inventory-valuation-methods', { params: { per_page: 20 } }).then(res => extractList(res.data)),
  getWarehouses: () => apiClient.get<Warehouse[]>('/warehouses', { params: { per_page: 50 } }).then(res => extractList(res.data)),

  // upload image
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return apiClient.post<{ url: string }>('/uploads/images', formData).then(res => res.data);
  },
};
