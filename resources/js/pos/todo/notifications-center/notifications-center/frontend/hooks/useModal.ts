// ─────────────────────────────────────────────────────────────
//  hooks/useModal.ts
//  ⚠️  لا تنسخ هذا الملف إذا كان useModal.ts موجوداً مسبقاً في
//      hooks/useModal.ts — استخدم النسخة الموجودة في مشروعك.
//      هذا فقط لضمان توافق توقيع { open, openModal, closeModal }
//      المستخدم في مثال ConfirmDeleteModal.
// ─────────────────────────────────────────────────────────────
import { useState, useCallback } from 'react';

export const useModal = (initialOpen = false) => {
  const [open, setOpen] = useState(initialOpen);

  const openModal  = useCallback(() => setOpen(true), []);
  const closeModal = useCallback(() => setOpen(false), []);
  const toggleModal = useCallback(() => setOpen((v) => !v), []);

  return { open, openModal, closeModal, toggleModal };
};
