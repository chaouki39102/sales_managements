// types/admin.ts

export interface AdminCompany {
  id:               number;
  name:             string;
  commercial_name?: string | null;
  slug:             string;
  email?:           string | null;
  phone?:           string | null;
  address?:         string | null;
  activity?:        string | null;
  nif?:             string | null;
  plan:             string;
  max_users:        number;
  max_products:     number;
  max_warehouses:   number;
  users_count:      number;
  active:           boolean;
  is_suspended:     boolean;
  suspended_at?:    string | null;
  suspended_reason?: string | null;
  verified_at?:     string | null;
  notes?:           string | null;
  owner_id?:        number | null;
  owner?:           AdminUserMin | null;
  created_at:       string;
  updated_at:       string;
}

export interface AdminUser {
  id:               number;
  name:             string;
  email:            string;
  phone?:           string | null;
  active:           boolean;
  is_approved:      boolean;
  role?:            string;
  companies_count?: number;
  last_login_at?:   string | null;
  created_at:       string;
}

export interface AdminUserMin {
  id:    number;
  name:  string;
  email: string;
}

export interface CompanyMembership {
  id:         number;
  name:       string;
  slug:       string;
  pivot?: {
    role:   string;
    active: boolean;
  };
}

export interface ActivityLog {
  id:            number;
  event:         string;
  description?:  string;
  subject_type?: string;
  subject_id?:   number;
  causer?:       AdminUserMin | null;
  company?:      { id: number; name: string } | null;
  ip_address?:   string | null;
  old_values?:   Record<string, unknown> | null;
  new_values?:   Record<string, unknown> | null;
  created_at:    string;
}

export interface AdminPlan {
  id:               number;
  key:              string;
  label:            string;
  description?:     string | null;
  max_users:        number;
  max_products:     number;
  max_warehouses:   number;
  is_active:        boolean;
  sort_order:       number;
  companies_count:  number;
}

export interface SystemSettings {
  allow_registration:   boolean;
  allow_new_companies:  boolean;
  debug_mode:           boolean;
  public_api:           boolean;
  maintenance_mode:     boolean;
  maintenance_message:  string;
  free_trial_days:      number;
  free_max_users:       number;
  starter_max_products: number;
}

export interface AdminDashboardStats {
  companies: {
    total:          number;
    active:         number;
    suspended:      number;
    verified:       number;
    unverified:     number;
    by_plan:        Record<string, number>;
  };
  users: {
    total:            number;
    active:           number;
    new_this_month:   number;
    pending_approval: number;
    by_role:          Record<string, number>;
  };
  recent_companies:  AdminCompany[];
  recent_users:      AdminUser[];
  recent_activity:   ActivityLog[];
  growth_7d:         { date: string; companies: number; users: number }[];
  at_risk_companies: { id: number; name: string; plan: string; current: number; max: number; pct: number }[];
  system_health: {
    php_version:      string;
    laravel_version:  string;
    db_size_mb:       number;
    cache_driver:     string;
    queue_driver:     string;
    queue_pending:    number;
    queue_failed:     number;
    maintenance_mode: boolean;
    disk_free_gb:     number;
  };
}

// ─── Shared ───────────────────────────────────────────────────────────────────

export interface Paginated<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page:    number;
    per_page:     number;
    total:        number;
    from:         number | null;
    to:           number | null;
  };
}

export interface AdminCompaniesFilter {
  search?:   string;
  status?:   '' | 'active' | 'suspended' | 'inactive' | 'verified' | 'unverified';
  plan?:     string;
  sort_by?:  'name' | 'created_at' | 'users_count';
  sort_dir?: 'asc' | 'desc';
  page?:     number;
  per_page?: number;
}

export interface AdminUsersFilter {
  search?:   string;
  role?:     string;
  active?:   string;
  page?:     number;
  per_page?: number;
}
