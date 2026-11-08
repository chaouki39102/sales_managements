// resources/js/pages/profile/types.ts — أنواع الملف الشخصي

export interface Gender   { id: number; name: string; label: string }
export interface Wilaya   { id: number; name: string; arabic_name?: string }
export interface Commune  { id: number; name: string; arabic_name?: string; wilaya_id: number }
export interface Role     { id: number; name: string; display_name?: string }
export interface Permission { id: number; name: string; display_name?: string; group?: string }

export interface UserProfile {
  id:                 number;
  name:               string;
  email:              string;
  username?:          string;
  phone?:             string;
  bio?:               string;
  avatar?:            string;
  job_title?:         string;
  birth_date?:        string;
  address?:           string;
  active:             boolean;
  last_login_at?:     string;
  email_verified_at?: string;
  created_at:         string;
  gender_id?:         number;
  commune_id?:        number;
  wilaya_id?:         number;
  gender?:            Gender;
  commune?:           Commune;
  wilaya?:            Wilaya;
  roles?:             Role[];
  permissions?:       Permission[];
}

export type Tab = "info" | "security" | "permissions";

export interface ProfileFormData {
  name:       string;
  username:   string;
  phone:      string;
  bio:        string;
  birth_date: string;
  gender_id:  string;
  address:    string;
  commune_id: string;
  wilaya_id:  string;
}
