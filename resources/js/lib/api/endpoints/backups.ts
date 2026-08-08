// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/backups.ts — النسخ الاحتياطي واستعادة قاعدة البيانات
//
// المسارات (كلها داخل /{company} وتتطلب can:update_company):
//   GET    /backups                  → قائمة النسخ
//   POST   /backups                  → إنشاء نسخة جديدة
//   POST   /backups/{file}/verify    → التحقق من المجموع الاختباري
//   GET    /backups/{file}/download  → تنزيل الملف (blob)
//   POST   /backups/{file}/restore   → استعادة (تستبدل قاعدة البيانات)
//   DELETE /backups/{file}           → حذف
// ════════════════════════════════════════════════════════════════════════════

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiDownload, apiGet, apiPost } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BackupFile {
  name:      string;
  size:      number;
  date:      string;
  driver:    string;
  extension: string;
  encrypted: boolean;
}

export interface BackupCreated {
  file:       string;
  size:       number;
  hash:       string;
  driver:     string;
  created_at: string;
}

export interface BackupVerify {
  ok:   boolean;
  size: number;
  hash: string;
}

export interface BackupRestoreResult {
  file:   string;
  safety: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

const enc = (file: string) => encodeURIComponent(file);

export const backupsApi = {
  list:     ()                              => apiGet<BackupFile[]>('/backups'),
  create:   (label?: string, keep?: number) =>
    apiPost<BackupCreated>('/backups', { label: label || null, keep: keep ?? null }),
  verify:   (file: string)                  => apiPost<BackupVerify>(`/backups/${enc(file)}/verify`),
  download: (file: string)                  => apiDownload(`/backups/${enc(file)}/download`),
  restore:  (file: string, confirmed: boolean) =>
    apiPost<BackupRestoreResult>(`/backups/${enc(file)}/restore`, { confirmed }),
  delete:   (file: string)                  => apiDelete(`/backups/${enc(file)}`),
} as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useBackups() {
  const slug = useActiveSlug();
  return useQuery({
    queryKey:  tenantKeys.backups.list(slug ?? ''),
    queryFn:   () => backupsApi.list(),
    enabled:   !!slug,
    staleTime: 30_000,
  });
}

export function useBackupMutations() {
  const slug = useActiveSlug();
  const qc    = useQueryClient();
  const invalidate = () => {
    if (slug) {
      qc.invalidateQueries({ queryKey: tenantKeys.backups.list(slug) });
      qc.invalidateQueries({ queryKey: tenantKeys.backups.all(slug) });
    }
  };

  const create = useMutation({
    mutationFn: ({ label, keep }: { label?: string; keep?: number }) =>
      backupsApi.create(label, keep),
    onSuccess: invalidate,
  });

  const verify = useMutation({
    mutationFn: (file: string) => backupsApi.verify(file),
  });

  const restore = useMutation({
    mutationFn: (file: string) => backupsApi.restore(file, true),
    onSuccess:  invalidate,
  });

  const remove = useMutation({
    mutationFn: backupsApi.delete,
    onSuccess:  invalidate,
  });

  return { create, verify, restore, remove };
}
