// ════════════════════════════════════════════════════════════════════════════
// lib/store/documentQuickCreateStore.tsx
//
// يوفّر نسخة واحدة عالمية من CommercialDocumentModal يمكن فتحها من أي صفحة
// بالمشروع (زر عائم، اختصار لوحة مفاتيح، أو أي مكوّن آخر لاحقاً) دون الحاجة
// لتمرير props عبر شجرة المكوّنات. الحالة نفسها بسيطة (Context + useState)
// عمداً — لا تعتمد على أي مكتبة إدارة حالة خارجية حتى تعمل بمعزل عن أي بنية
// حالية بالمشروع.
// ════════════════════════════════════════════════════════════════════════════

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useActiveSlug } from '@/lib/store/appStore';
import { tenantKeys } from '@/lib/api/core/queryKeys';
import type { DocumentType } from '@/lib/api/core/types';
import CommercialDocumentModal from '@/pages/documents/CommercialDocumentModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuickCreateState {
  open:             boolean;
  documentType:     DocumentType | null;
  existingDocument: Record<string, unknown> | undefined;
}

interface DocumentQuickCreateContextValue {
  state: QuickCreateState;
  /** يفتح مستنداً جديداً بنوع معيّن (يُستخدم من الزر العائم/الاختصار) */
  openQuickCreate: (type: DocumentType) => void;
  /** يفتح مستنداً موجوداً للتعديل — متروك للاستخدام المستقبلي (مثلاً من نتائج بحث عامة) */
  openQuickEdit: (type: DocumentType, doc: Record<string, unknown>) => void;
  closeQuickCreate: () => void;
}

const DocumentQuickCreateContext = createContext<DocumentQuickCreateContextValue | null>(null);

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDocumentQuickCreate(): DocumentQuickCreateContextValue {
  const ctx = useContext(DocumentQuickCreateContext);
  if (!ctx) {
    throw new Error(
      'useDocumentQuickCreate يجب استخدامه داخل <DocumentQuickCreateProvider> — ' +
      'تأكد من لف جذر التطبيق به مرة واحدة فقط.',
    );
  }
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

const EMPTY_STATE: QuickCreateState = {
  open: false,
  documentType: null,
  existingDocument: undefined,
};

export function DocumentQuickCreateProvider({ children }: { children: React.ReactNode }) {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  const [state, setState] = useState<QuickCreateState>(EMPTY_STATE);

  const openQuickCreate = useCallback((type: DocumentType) => {
    setState({ open: true, documentType: type, existingDocument: undefined });
  }, []);

  const openQuickEdit = useCallback((type: DocumentType, doc: Record<string, unknown>) => {
    setState({ open: true, documentType: type, existingDocument: doc });
  }, []);

  const closeQuickCreate = useCallback(() => {
    // لا نُصفّر documentType فوراً — نترك المودال يُكمل انتقال الإغلاق (opacity)
    // بلا "قفزة" محتوى قبل زوال الخلفية، تماماً كما يفعل نمط
    // "حاوية دائمة في DOM مع تحكم CSS بالظهور" المستخدم أصلاً في index.tsx.
    setState((s) => ({ ...s, open: false }));
  }, []);

  const handleSaved = useCallback(() => {
    if (slug) qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
  }, [slug, qc]);

  const value = useMemo<DocumentQuickCreateContextValue>(() => ({
    state, openQuickCreate, openQuickEdit, closeQuickCreate,
  }), [state, openQuickCreate, openQuickEdit, closeQuickCreate]);

  return (
    <DocumentQuickCreateContext.Provider value={value}>
      {children}

      {/* نسخة واحدة عالمية — تُركَّب دائماً بالـDOM، الظهور يُتحكَّم به عبر open
          فقط (نفس نمط CommercialDocumentModal الحالي)، فلا حاجة لأي منطق
          mount/unmount إضافي هنا. */}
      <CommercialDocumentModal
        open={state.open}
        documentType={state.documentType}
        existingDocument={state.existingDocument}
        onClose={closeQuickCreate}
        onSaved={() => { handleSaved(); closeQuickCreate(); }}
      />
    </DocumentQuickCreateContext.Provider>
  );
}
