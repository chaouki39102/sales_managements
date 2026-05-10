// types/admin.ts

export interface AdminCompany {
  id: number;
  name: string;
  commercial_name?: string;
  slug: string;
  email?: string;
  phone?: string;
  address?: string;
  plan: string;
  active: boolean;
  is_suspended: boolean;
  suspended_reason?: string;
  verified_at?: string | null;
  notes?: string;
  users_count: number;
  max_users: number;
  max_products: number;
  max_warehouses: number;
  owner?: { id: number; name: string; email: string };
  created_at: string;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  active: boolean;
  companies_count?: number;
  created_at: string;
}

export interface AdminStats {
  companies: {
    total: number;
    active: number;
    suspended: number;
    verified: number;
    by_plan: Record<string, number>;
  };
  users: {
    total: number;
    active: number;
    new_this_month: number;
  };
  recent_companies: AdminCompany[];
  recent_users: AdminUser[];
}

export interface AdminPlan {
  key: string;
  label: string;
  max_users: number;
  max_products: number;
  max_warehouses: number;
  companies_count?: number;
}

export interface ActivityLog {
  id: number;
  event: string;
  description: string;
  causer?: { id: number; name: string; email: string };
  subject_type?: string;
  subject_id?: number;
  company?: { id: number; name: string };
  ip_address?: string;
  user_agent?: string;
  old_values?: any;
  new_values?: any;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from?: number;
    to?: number;
  };
}

export interface AdminCompaniesParams {
  search?: string;
  status?: 'active' | 'suspended' | 'inactive' | 'verified' | 'unverified';
  plan?: string;
  page?: number;
  per_page?: number;
}

export interface AdminUsersParams {
  search?: string;
  role?: string;
  active?: string;
  page?: number;
  per_page?: number;
}

export interface AdminActivityParams {
  search?: string;
  event?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
}
