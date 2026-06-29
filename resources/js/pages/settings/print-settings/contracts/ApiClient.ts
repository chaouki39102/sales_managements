export interface ApiClient {
  get<T>(url: string, params?: Record<string, unknown>): Promise<T>;
  post<T>(url: string, data?: unknown): Promise<T>;
  put<T>(url: string, data?: unknown): Promise<T>;
  patch<T>(url: string, data?: unknown): Promise<T>;
  delete(url: string): Promise<void>;
  upload<T>(url: string, fd: FormData, onProgress?: (p: number) => void): Promise<T>;
}
