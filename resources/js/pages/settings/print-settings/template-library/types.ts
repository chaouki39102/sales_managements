import type { PrintTemplate, DocTypeCode, PaperSize } from '@/reporting';

// ─── Versioning ─────────────────────────────────────────────────────────────────
export interface TemplateVersion {
  id:        string;
  version:   string;
  revision:  number;
  createdAt: string;
  updatedAt: string;
  author:    string;
  country:   string;
  layoutEngineVersion: string;
}

// ─── Tags & Categories ──────────────────────────────────────────────────────────
export interface TemplateTags {
  tags: string[];
  category: string;
  subcategory?: string;
}

// ─── Metadata (frontend registry entry) ─────────────────────────────────────────
export interface LibraryTemplateMeta extends TemplateVersion {
  name:             string;
  nameAr:           string;
  description:      string;
  descriptionAr:    string;
  documentType:     DocTypeCode;
  paperSize:        PaperSize;
  category:         string;
  subcategory?:     string;
  tags:             string[];
  readOnly:         true;
}

// ─── Full entry in the frontend registry ────────────────────────────────────────
export interface LibraryTemplateEntry {
  meta:         LibraryTemplateMeta;
  createConfig: () => PrintTemplate;
}

// ─── API response shape (from backend GET /print-templates/library) ────────────
export interface LibraryApiResponse {
  id:             string;
  name:           string;
  name_ar:        string;
  description:    string;
  description_ar: string;
  document_type:  string;
  paper_size:     string;
  category:       string;
  subcategory?:   string;
  tags:           string[];
  version:        string;
  revision:       number;
  country:        string;
  author:         string;
  read_only:      boolean;
}

// ─── Category descriptor ────────────────────────────────────────────────────────
export interface TemplateCategory {
  id:      string;
  name:    string;
  nameAr:  string;
  icon?:   string;
}

// ─── Filter state ───────────────────────────────────────────────────────────────
export interface LibraryFilterState {
  search:       string;
  docType:      string | null;
  paperSize:    string | null;
  category:     string | null;
  country:      string | null;
  tags:         string[];
  favoritesOnly: boolean;
}

// ─── Favorites (stored in localStorage) ─────────────────────────────────────────
export interface FavoriteEntry {
  templateId: string;
  addedAt:    string;
}

// ─── Install history entry ──────────────────────────────────────────────────────
export interface InstallHistoryEntry {
  templateId:      string;
  templateNameAr:  string;
  installedAt:     string;
  version:         string;
  createdTplId:    number | null;
}
