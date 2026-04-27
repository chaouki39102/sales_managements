import { useQuery } from '@tanstack/react-query';
import { productService } from '@/services/productService';

export function useLookups() {
  const families = useQuery({ queryKey: ['families'], queryFn: productService.getFamilies, staleTime: Infinity });
  const brands = useQuery({ queryKey: ['brands'], queryFn: productService.getBrands, staleTime: Infinity });
  const productTypes = useQuery({ queryKey: ['product-types'], queryFn: productService.getProductTypes, staleTime: Infinity });
  const units = useQuery({ queryKey: ['units'], queryFn: productService.getUnits, staleTime: Infinity });
  const tvaRates = useQuery({ queryKey: ['tvas'], queryFn: productService.getTvaRates, staleTime: Infinity });
  const priceLevels = useQuery({ queryKey: ['price-levels'], queryFn: productService.getPriceLevels, staleTime: Infinity });
  const valuationMethods = useQuery({ queryKey: ['valuation-methods'], queryFn: productService.getValuationMethods, staleTime: Infinity });
  const warehouses = useQuery({ queryKey: ['warehouses'], queryFn: productService.getWarehouses, staleTime: Infinity });

  return {
    families: families.data ?? [],
    brands: brands.data ?? [],
    productTypes: productTypes.data ?? [],
    units: units.data ?? [],
    tvaRates: tvaRates.data ?? [],
    priceLevels: priceLevels.data ?? [],
    valuationMethods: valuationMethods.data ?? [],
    warehouses: warehouses.data ?? [],
    isLoading: families.isLoading || brands.isLoading || productTypes.isLoading,
  };
}
