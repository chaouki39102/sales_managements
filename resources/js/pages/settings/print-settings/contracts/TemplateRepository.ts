import type { PrintTemplate, DocTypeCode } from '../types';

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

export interface TemplateRepositoryHooks {
  usePrintTemplates: (docTypeCode?: DocTypeCode) => { data: PrintTemplate[] | undefined; isLoading: boolean };
  usePrintTemplateMutations: () => {
    create: { mutateAsync: (tpl: Omit<PrintTemplate, 'id' | 'created_at' | 'updated_at'>) => Promise<PrintTemplate> };
    update: { mutateAsync: ({ id, data }: { id: number; data: Partial<PrintTemplate> }) => Promise<PrintTemplate> };
    remove: { mutateAsync: (id: number) => Promise<void> };
    setDefault: { mutateAsync: (id: number) => Promise<PrintTemplate> };
    duplicate: { mutateAsync: ({ id, name }: { id: number; name: string }) => Promise<PrintTemplate> };
    installLibrary: { mutateAsync: (templateId: string) => Promise<PrintTemplate> };
  };
}

export const PRINT_TEMPLATE_KEYS = {
  all:     (slug: string)              => [slug, 'print-templates']              as const,
  list:    (slug: string, code?: string) => [slug, 'print-templates', 'list', code] as const,
  detail:  (slug: string, id: number)  => [slug, 'print-templates', id]         as const,
};
