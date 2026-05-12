// ════════════════════════════════════════════════
// types/admin.ts — النسخة الكاملة
// ════════════════════════════════════════════════

export interface AdminCompany {
  id: number;
  name: string;
  commercial_name?: string;
  slug: string;
  email?: string;
  phone?: string;
  address?: string;
  plan: string;
  active: boolean;          // is_active من Laravel Resource
  is_suspended: boolean;
  suspended_reason?: string;
  suspended_at?: string;
  verified_at?: string | null;
  notes?: string;
  users_count: number;
  max_users: number;
  max_products: number;
  max_warehouses: number;
  trial_ends_at?: string | null;
  on_trial?: boolean;
  owner?: { id: number; name: string; email: string };
  created_at: string;
  updated_at?: string;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  active: boolean;          // is_active من Laravel Resource
  companies_count?: number;
  avatar?: string;
  phone?: string;
  last_login_at?: string;
  created_at: string;
}

export interface AdminStats {
  companies: {
    total: number;
    active: number;
    suspended: number;
    inactive: number;
    verified: number;
    on_trial?: number;
    by_plan: Record<string, number>;
  };
  users: {
    total: number;
    active: number;
    new_this_month: number;
    new_today?: number;
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
  price?: number;
  features?: string[];
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
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  created_at: string;
}

export interface SystemSettings {
  allow_registration: boolean;
  allow_new_companies: boolean;
  debug_mode: boolean;
  public_api: boolean;
  free_trial_days: number;
  free_max_users: number;
  starter_max_products: number;
  maintenance_mode: boolean;
  maintenance_message: string;
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
  sort?: string;
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
  causer_id?: number;
  company_id?: number;
  page?: number;
  per_page?: number;
}
