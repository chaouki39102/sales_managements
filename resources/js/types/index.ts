export interface User {
  id: number;
  name: string;
  email: string;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  message: string;
  data: {
    user: User;
    token: string;
  };
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  message: string;
  data: T;
  timestamp: string;
  meta?: {
    total?: number;
    per_page?: number;
    current_page?: number;
    last_page?: number;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface Party {
  id: number;
  code: string;
  name: string;
  commercial_name: string | null;
  party_type_id: number;
  email: string | null;
  phone: string | null;
  address: string | null;
  nif: string | null;
  is_tva_exempt: boolean;
  active: boolean;
  created_at: string;
}

export interface CommercialDocument {
  id: number;
  document_number: string;
  document_date: string;
  due_date: string | null;
  party_id: number;
  document_type_id: number;
  document_status_id: number;
  warehouse_id: number | null;
  total_ht: number;
  tva_amount: number;
  total_ttc: number;
  remaining_amount: number;
  notes: string | null;
  is_locked: boolean;
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  code: string;
  family_id: number;
  brand_id: number | null;
  active: boolean;
  created_at: string;
}

export interface ErrorResponse {
  status: 'error';
  code: string;
  message: string;
  errors?: Record<string, string[]>;
  timestamp: string;
}


