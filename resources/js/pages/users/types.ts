// resources/js/pages/users/types.ts — أنواع صفحة المستخدمين

// ─── Types ─────────────────────────────────────
export interface Permission {
    id: number;
    name: string;
    display_name?: string;
    group?: string;
    description?: string | null;
}
export interface Role {
    id: number;
    name: string;
    display_name?: string;
    description?: string | null;
    permissions?: Permission[];
    relations?: {
        permissions?: { id: number; name: string; display_name?: string }[];
    };
}
export interface User {
    id: number;
    name: string;
    email: string;
    username?: string;
    phone?: string;
    job_title?: string;
    active: boolean;
    last_login_at?: string;
    created_at: string;
    roles?: Role[];
    permissions?: Permission[];
    two_factor_enabled?: boolean;
}

// ─── Form / UI state shapes ────────────────────
export interface UserFormState {
    name: string;
    email: string;
    username: string;
    phone: string;
    job_title: string;
    password: string;
    role: string;
    permission_ids: number[];
    active: boolean;
}
export type UsersMainTab = "users" | "roles" | "permissions";
export type UsersFilter = "all" | "active" | "inactive";
