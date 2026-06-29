import type { PrintTemplate } from './domain';

export interface PrintTemplateApiResponse {
  id:            number;
  name:          string;
  doc_type_code: string;
  paper_size:    string;
  is_default:    boolean;
  is_active:     boolean;
  config:        Omit<PrintTemplate, 'id' | 'name' | 'doc_type_code' | 'paper_size' | 'is_default' | 'is_active' | 'created_at' | 'updated_at'>;
  created_at:    string;
  updated_at:    string;
}
