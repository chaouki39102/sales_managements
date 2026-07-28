// lib/api/admin/client.ts
//
// Re-exports the standard apiGet from the single source of truth.
// extractData now handles all backend envelopes consistently —
// no separate admin path needed.
//
export { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '@/lib/api/core/client';
