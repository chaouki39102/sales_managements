import type { PrintTemplate } from '../types';

export interface PrintTemplatesApi {
  list(docTypeCode?: string): Promise<PrintTemplate[]>;
  show(id: number): Promise<PrintTemplate>;
  create(tpl: Omit<PrintTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<PrintTemplate>;
  update(id: number, tpl: Partial<PrintTemplate>): Promise<PrintTemplate>;
  delete(id: number): Promise<void>;
  setDefault(id: number): Promise<PrintTemplate>;
  duplicate(id: number, newName: string): Promise<PrintTemplate>;
  library(): Promise<{ id: string; name: string; paper_size: string }[]>;
  installLibrary(templateId: string): Promise<PrintTemplate>;
  uploadLogo(file: File, onProgress?: (p: number) => void): Promise<{ path: string; url: string }>;
}


