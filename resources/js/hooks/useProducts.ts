import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService } from '@/services/productService';
import { ProductInput } from '@/types/product';

export function useProducts(page = 1, perPage = 20, filters = {}, search = '', sort = 'name', order = 'asc') {
  return useQuery({
    queryKey: ['products', page, perPage, filters, search, sort, order],
    queryFn: () => productService.getProducts({ page, per_page: perPage, ...filters, search, sort: `${order === 'desc' ? '-' : ''}${sort}`, include: 'family,brand,productType,packagings,prices' }),
    keepPreviousData: true,
  });
}

export function useProductMutations() {
  const qc = useQueryClient();
  const create = useMutation({ mutationFn: (data: ProductInput) => productService.createProduct(data), onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }) });
  const update = useMutation({ mutationFn: ({ id, data }: { id: number; data: Partial<ProductInput> }) => productService.updateProduct(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }) });
  const remove = useMutation({ mutationFn: (id: number) => productService.deleteProduct(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }) });
  return { create, update, remove };
}
