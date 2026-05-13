// types/filters.ts — فلاتر الاستعلام لكل كيان
export interface InvoiceFilters {
  search?:           string;
  document_type_id?: number;
  party_id?:         number;
  status?:           string;
  date_from?:        string;
  date_to?:          string;
  page?:             number;
  per_page?:         number;
  sort?:             string;
}

export interface PartyFilters {
  search?:        string;
  party_type_id?: number;
  active?:        boolean;
  page?:          number;
  per_page?:      number;
  sort?:          string;
}

export interface ProductFilters {
  search?:          string;
  family_id?:       number;
  brand_id?:        number;
  product_type_id?: number;
  active?:          boolean;
  page?:            number;
  per_page?:        number;
  sort?:            string;
  include?:         string;
}

export interface VariantFilters {
  search?:     string;
  barcode?:    string;
  product_id?: number;
  page?:       number;
  per_page?:   number;
}
