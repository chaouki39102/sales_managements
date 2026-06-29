import type { ApiClient } from './ApiClient';
import type { Notifier } from './Notifier';
import type { PrintTemplatesApi, TemplateRepositoryHooks } from './TemplateRepository';
import type { CompanyData } from '../types';

export interface HostDependencies {
  apiClient: ApiClient;
  notifier: Notifier;
  printTemplatesApi: PrintTemplatesApi;
  templateHooks: TemplateRepositoryHooks;
  company: CompanyData | null;
  slug: string | null;
}
