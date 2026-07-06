import React, { useState, useRef, useEffect, Suspense, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';
import { useNotificationStore } from '@/lib/store/notificationStore';

import { useCommercialDocumentController } from './hooks/useCommercialDocumentController';
import { fmtDZD } from './utils/document.utils';
import type { Tab } from './components/DocumentUIPrimitives';
import {
  AlertBanner, Section, Label, FieldError, ComboBox,
} from './components/DocumentUIPrimitives';
import { RETURNABLE_CODES, SHIPPING_CODES } from './types/document.types';

import DocumentLinesSection from './CommercialDocumentModal/DocumentLinesSection';
import DocumentPaymentsSection from './CommercialDocumentModal/DocumentPaymentsSection';
import DocumentTotalsSection from './CommercialDocumentModal/DocumentTotalsSection';
import { DocumentChainPanel } from './components/DocumentChainPanel';
import { ReturnDocumentModal } from './components/ReturnDocumentModal';
import { BulkImportModal } from './components/BulkImportModal';
import { ShippingInfoSection } from './components/ShippingInfoSection';
import { PaymentTermsTable } from './components/PaymentTermsTable';
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal';

const TemplatePrintModal = React.lazy(() => import('@/pages/settings/print-settings/components/shared/TemplatePrintModal'));

// ── Skeleton loader ──────────────────────────────────────────────────────────
function Skeleton({ width, height, borderRadius = 6 }: { width?: number | string; height?: number | string; borderRadius?: number }) {
  return (
    <div style={{
      width: width ?? '100%', height: height ?? 14,
      borderRadius, background: 'var(--bg3)',
      animation: 'skeletonPulse 1.5s ease-in-out infinite',
    }} />
  );
}

const skeletonKeyframes = `@keyframes skeletonPulse{0%,100%{opacity:1}50%{opacity:.4}}@keyframes slideUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}`;

// ── Responsive hook ──────────────────────────────────────────────────────────
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });
  useEffect(() => {
    const mq = window.matchMedia(query);
    const h = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, [query]);
  return matches;
}

export default function CommercialDocumentPage() {
  const { typeCode, id } = useParams<{ typeCode: string; id?: string }>();
  const navigate = useNavigate();
  const slug = useActiveSlug();
  const qc = useQueryClient();
  const addToast = useNotificationStore((s) => s.addToast);

  const isEdit = !!id;
  const listPath = `/documents/${typeCode}`;

  // ── Responsive ─────────────────────────────────────────────────────────────
  const isNarrow = useMediaQuery('(max-width: 899px)');
  const [sidebarForceOpen, setSidebarForceOpen] = useState(false);
  const sidebarVisible = isNarrow ? sidebarForceOpen : true;

  // ── Refs (hoisted early to avoid TDZ with useCallback) ──────────────────────
  const hasUnsavedRef = useRef(false);

  // ── Fetch document type by code ─────────────────────────────────────────────
  const { data: docType, isLoading: loadingDocType } = useQuery({
    queryKey: [slug, 'document-type-by-code', typeCode],
    queryFn: async () => {
      const res = await apiGet<unknown>('/document-types', { per_page: 500 });
      const types = Array.isArray(res) ? res : ((res as Record<string, unknown>)?.data as unknown[] ?? []);
      return (types as Array<{ code: string; name: string; id: number }>)
        .find((dt) => dt.code === typeCode) ?? null;
    },
    enabled: !!slug && !!typeCode,
  });

  // ── Fetch existing document for editing ─────────────────────────────────────
  const { data: existingDoc, isLoading: loadingExisting } = useQuery({
    queryKey: [slug, 'document-full', id],
    queryFn: async () => {
      const res = await apiGet<Record<string, unknown>>(`/documents/${id}`, {
        include: [
          'party', 'warehouse', 'documentType', 'fiscalYear',
          'lines.product', 'lines.productVariant', 'payments.paymentMode',
        ].join(','),
      });
      const data = (res as unknown as { data: Record<string, unknown> })?.data ?? res;
      return data as Record<string, unknown>;
    },
    enabled: !!slug && !!id,
  });

  // ── Audit log ──────────────────────────────────────────────────────────────
  const { data: auditLog, isLoading: isLoadingAudit } = useQuery({
    queryKey: [slug, 'audits', 'document', id],
    queryFn: async () => {
      const res = await apiGet<unknown>('/audits', {
        filter: { auditable_type: 'App\\Models\\CommercialDocument', auditable_id: id },
        per_page: 20,
        include: 'user',
      });
      return Array.isArray(res) ? res : ((res as Record<string, unknown>)?.data as unknown[] ?? []);
    },
    enabled: !!slug && !!id,
  });

  const existingDocument = isEdit ? existingDoc : undefined;
  const onClose = useCallback(() => {
    if (hasUnsavedRef.current && !window.confirm('لديك تغييرات غير محفوظة. هل تريد المغادرة؟')) return;
    navigate(listPath);
  }, [navigate, listPath]);
  const onSaved = useCallback(() => {
    qc.invalidateQueries({ queryKey: [slug, 'documents'] });
  }, [qc, slug]);

  const ctrl = useCommercialDocumentController({
    documentType: docType ?? null,
    existingDocument,
    onClose,
    onSaved,
    active: true,
  });

  const {
    slug: ctrlSlug, qc: ctrlQc, navigate: ctrlNavigate, docCode, isPurchase, isEdit: ctrlIsEdit,
    selectedYear,
    settingsDict, settingsApplyStamp,
    visibleCols, lineMode, handleColsChange, setLineMode,
    lookups, lookupsReady,
    form, errors, lineErr, apiErr, setApiErr,
    set, handlePartyChange, handlePriceLevelChange, priceLevelId,
    addLine, addLineWithProduct, removeLine, duplicateLine, updateLine,
    pmMode, payments,
    bulkAddLines, addPayment, addPaymentWithValues, removePayment, updatePayment,
    partyBalance, isLoadingBalance,
    totals, validate, buildPayload,
    updateStockData, needsParty, affectsStock, stockDir,
    isReadOnly, isLinesReadOnly,
    lineWarnings,
    priceLevelSwitchMsg, clearPriceLevelSwitchMsg,
    isLocked, isCancelled, isValidated,
    stockData, warehouseIdNum,
    docNumber, docNumberErr, checkingDocNumber, handleDocNumberChange,
    partyChangeWarning, setPartyChangeWarning,
    showReturnModal, setShowReturnModal,
    showBulkImport, setShowBulkImport,
    extraTab, setExtraTab,
    chain, isLoadingChain, convertMutation, allowedTargets,
    creditCheck, isLoadingCredit,
    customerInsights, isLoadingInsights,
    productSuggestions, isLoadingSuggestions,
    advancePayments, isLoadingAdvances,
    successMsg, setSuccessMsg,
    companyInfo, printTemplates,
    selectedTemplateId, setSelectedTemplateId, selectedTemplate,
    printModalOpen, setPrintModalOpen, handlePrint,
    showDeleteModal, setShowDeleteModal,
    deleteMut,
    handleSave, handleDelete, handleExport, handlePartyChangeWithWarning,
    isPending,
    isPartyExempt, partyOptions, priceLevelOptions,
    paymentModeOptions, treasuryAccountMap, selectedParty,
    stockBadge, paymentsExceedWarning, balanceWarning,
    savedDraft, draftKey, restoreDraft,
  } = ctrl;

  // ── Dirty state tracking ──────────────────────────────────────────────────
  const initialFormRef = useRef<string>('');
  useEffect(() => {
    if (!lookupsReady) return;
    if (!initialFormRef.current) {
      initialFormRef.current = JSON.stringify(form);
    }
  }, [form, lookupsReady]);
  const currentFormStr = JSON.stringify(form);
  const isDirty = lookupsReady && initialFormRef.current !== '' && initialFormRef.current !== currentFormStr;
  hasUnsavedRef.current = isDirty;

  // ── Field-level dirty indicator ───────────────────────────────────────────
  const initialFormParsed = useRef<Record<string, unknown>>({});
  useEffect(() => {
    if (initialFormRef.current && !Object.keys(initialFormParsed.current).length) {
      try { initialFormParsed.current = JSON.parse(initialFormRef.current); } catch {}
    }
  }, [lookupsReady]);
  const isFieldDirty = (key: string) => {
    if (!initialFormParsed.current || !lookupsReady) return false;
    return String(initialFormParsed.current[key] ?? '') !== String((form as Record<string, unknown>)[key] ?? '');
  };

  // ── Toast integration ──────────────────────────────────────────────────────
  useEffect(() => {
    if (successMsg) {
      addToast({ type: 'success', title: successMsg });
      setSuccessMsg('');
    }
  }, [successMsg]);

  useEffect(() => {
    if (apiErr) {
      addToast({ type: 'error', title: apiErr });
      setApiErr('');
    }
  }, [apiErr]);

  useEffect(() => {
    if (priceLevelSwitchMsg) {
      addToast({
        type: 'warning',
        title: `المنتج "${priceLevelSwitchMsg.productName}"`,
        message: `ليس له سعر في فئة "${priceLevelSwitchMsg.from}"، تم التبديل إلى "${priceLevelSwitchMsg.to}".`,
      });
      clearPriceLevelSwitchMsg();
    }
  }, [priceLevelSwitchMsg]);

  // ── Local UI state ─────────────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showPartyCombo, setShowPartyCombo] = useState(false);
  const [showAllPayments, setShowAllPayments] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close "More" dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    if (moreOpen) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [moreOpen]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (drawerOpen) { setDrawerOpen(false); return; }
        if (moreOpen) { setMoreOpen(false); return; }
        if (showPartyCombo) { setShowPartyCombo(false); return; }
        if (showAllPayments) { setShowAllPayments(false); return; }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!isReadOnly && !isPending) handleSave();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [drawerOpen, moreOpen, showPartyCombo, showAllPayments, isReadOnly, isPending, handleSave]);

  // ── Unsaved changes guard — beforeunload ──────────────────────────────────
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!hasUnsavedRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // ── Unsaved changes guard — browser back/forward navigation ──────────────
  useEffect(() => {
    const handler = () => {
      if (hasUnsavedRef.current && !window.confirm('لديك تغييرات غير محفوظة. هل تريد المغادرة؟')) {
        window.history.pushState(null, '', window.location.href);
      }
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  // ── Computed values ────────────────────────────────────────────────────────
  const hasAdvancedError = !!(errors.fiscal_year_id || errors.currency_id || errors.due_date || errors.warehouse_id);

  const statusPill = isCancelled
    ? { label: 'ملغى', color: 'var(--red)', bg: 'var(--redb)', icon: 'ti-ban' }
    : isLocked
      ? { label: 'مقفل', color: 'var(--t3)', bg: 'var(--bg3)', icon: 'ti-lock' }
      : isValidated
        ? { label: 'معتمد', color: 'var(--blue)', bg: 'var(--blueb)', icon: 'ti-circle-check' }
        : pmMode === 'additive'
          ? { label: 'دفعات إضافية', color: 'var(--orange)', bg: 'color-mix(in srgb, var(--orange) 12%, transparent)', icon: 'ti-plus' }
          : null;

  const firstLetter = selectedParty?.name?.charAt(0) ?? '?';

  const cck = creditCheck as Record<string, unknown> | undefined;
  const creditLimit = Number(cck?.credit_limit ?? 0);
  const usedCredit = Number(cck?.used_credit ?? 0);
  const usagePercent = creditLimit > 0 ? Math.min(100, (usedCredit / creditLimit) * 100) : 0;
  const willExceed = cck?.will_exceed === true;
  const gaugeColor = willExceed ? 'var(--red)' : usagePercent > 80 ? 'var(--orange)' : 'var(--green)';

  const ins = customerInsights as Record<string, unknown> | undefined;
  const insightDocs = (ins?.last_documents as Array<Record<string, unknown>> | undefined) ?? [];
  const docCount = Number(ins?.document_count ?? 0);
  const monthlyAvg = ins?.monthly_avg_invoice as number | undefined;
  const avgPayDays = ins?.avg_payment_days as number | undefined;

  const partyBalanceVal = partyBalance as Record<string, unknown> | undefined;
  const currentBalance = Number(partyBalanceVal?.current_balance ?? 0);
  const balanceType = (partyBalanceVal?.balance_type as string | undefined) ?? 'credit';

  const auditEntries = (auditLog as Array<Record<string, unknown>> | undefined) ?? [];

  // ── Loading state ──────────────────────────────────────────────────────────
  const isLoading = loadingDocType || (isEdit && loadingExisting);
  if (isLoading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', height: '100%',
        background: 'var(--bg0)', direction: 'rtl', gap: 0,
      }}>
        <style>{skeletonKeyframes}</style>
        {/* Skeleton top bar */}
        <div style={{
          height: 56, flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '0 16px', background: 'var(--bg2)',
          borderBottom: '1px solid var(--b1)',
        }}>
          <Skeleton width={32} height={32} borderRadius={8} />
          <Skeleton width={34} height={34} borderRadius={10} />
          <div style={{ flex: 1 }}><Skeleton width={160} height={16} /></div>
          <Skeleton width={34} height={34} borderRadius={8} />
          <Skeleton width={90} height={34} borderRadius={8} />
          <Skeleton width={34} height={34} borderRadius={8} />
          <Skeleton width={60} height={34} borderRadius={8} />
        </div>
        {/* Skeleton body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <div style={{ width: 300, flexShrink: 0, padding: 16, background: 'var(--bg2)' }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <Skeleton width={36} height={36} borderRadius="50%" />
              <div style={{ flex: 1 }}><Skeleton height={16} width={120} /></div>
            </div>
            <Skeleton height={14} width={180} style={{ marginBottom: 8 }} />
            <Skeleton height={4} borderRadius={99} style={{ marginBottom: 12 }} />
            <Skeleton height={80} borderRadius={8} />
          </div>
          <div style={{ flex: 1, padding: '16px 20px', background: 'var(--bg1)' }}>
            <Skeleton height={14} width={140} style={{ marginBottom: 12 }} />
            <Skeleton height={300} borderRadius={8} />
          </div>
        </div>
      </div>
    );
  }

  if (!docType) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', background: 'var(--bg0)',
        flexDirection: 'column', gap: 12,
      }}>
        <i className="ti ti-file-off" style={{ fontSize: 48, color: 'var(--t4)' }} />
        <span style={{ fontSize: 14, color: 'var(--t3)' }}>
          نوع المستند "{typeCode}" غير موجود
        </span>
        <button onClick={() => navigate(listPath)}
          style={{
            padding: '8px 18px', borderRadius: 'var(--r2)',
            border: '1px solid var(--b2)', background: 'var(--bg1)',
            color: 'var(--t2)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}
        >
          ← العودة للقائمة
        </button>
      </div>
    );
  }

  const fieldInputStyle = (hasError?: boolean): React.CSSProperties => ({
    width: '100%', padding: '6px 8px', borderRadius: 'var(--r2)',
    border: `1px solid ${hasError ? 'var(--red)' : 'var(--b3)'}`,
    background: isReadOnly ? 'var(--bg3)' : 'var(--bg1)',
    color: 'var(--t1)', fontSize: 12,
    fontFamily: 'Tajawal, sans-serif', outline: 'none',
    boxSizing: 'border-box',
  });

  // ── Totals text (compact) ──────────────────────────────────────────────────
  const totalsText = [
    `HT ${fmtDZD(totals.totalHt)} دج`,
    `TVA ${fmtDZD(totals.totalTva)} دج`,
    totals.totalStamp > 0.01 ? `الطابع ${fmtDZD(totals.totalStamp)} دج` : null,
    `الخصم ${fmtDZD(totals.totalDiscount)} دج`,
  ].filter(Boolean).join(' · ');

  // ── Is returnable? ─────────────────────────────────────────────────────────
  const canReturn = isEdit && RETURNABLE_CODES.has(docCode) && !isCancelled;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0,
      background: 'var(--bg0)', direction: 'rtl',
    }}>
      <style>{skeletonKeyframes}</style>

      {/* ═══ TOP BAR — 56px ═══ */}
      <div style={{
        height: 56, flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '0 12px',
        background: 'var(--bg2)',
        borderBottom: '1px solid var(--b1)',
      }}>
        {/* Back arrow */}
        <button onClick={onClose}
          style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            border: 'none', background: 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--t3)',
            transition: 'background .15s ease-out',
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = 'var(--bg3)')}
          onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
          title="العودة للقائمة"
        >
          <i className="ti ti-arrow-right" style={{ fontSize: 18 }} />
        </button>

        {/* Sidebar toggle (narrow screens) */}
        {isNarrow && (
          <button onClick={() => setSidebarForceOpen(!sidebarForceOpen)}
            style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              border: 'none', background: 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--t3)',
            }}
            title="إظهار الشريط الجانبي"
          >
            <i className="ti ti-menu-2" style={{ fontSize: 16 }} />
          </button>
        )}

        {/* Doc icon */}
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: isCancelled
            ? 'var(--redb)'
            : `color-mix(in srgb, ${isPurchase ? 'var(--blue)' : 'var(--green)'} 12%, transparent)`,
          border: isCancelled
            ? '1px solid var(--red)'
            : `1px solid color-mix(in srgb, ${isPurchase ? 'var(--blue)' : 'var(--green)'} 25%, transparent)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className={`ti ${isCancelled ? 'ti-ban' : isPurchase ? 'ti-truck' : 'ti-receipt'}`}
            style={{ fontSize: 14, color: isCancelled ? 'var(--red)' : isPurchase ? 'var(--blue)' : 'var(--green)' }}
          />
        </div>

        {/* Doc name + status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--t1)', whiteSpace: 'nowrap' }}>
            {isEdit ? `تعديل ${docType.name}` : `${docType.name} جديد`}
          </span>
          {statusPill && (
            <span style={{
              padding: '2px 6px', borderRadius: 99, fontSize: 9.5, fontWeight: 700,
              background: statusPill.bg, color: statusPill.color,
              display: 'flex', alignItems: 'center', gap: 3,
            }}>
              <i className={`ti ${statusPill.icon}`} style={{ fontSize: 9 }} />
              {statusPill.label}
            </span>
          )}
          {isDirty && (
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: 'var(--orange)', flexShrink: 0,
            }} title="تغييرات غير محفوظة" />
          )}
        </div>

        {/* Doc number inline (edit mode) */}
        {isEdit && (
          <div style={{ width: 140, flexShrink: 0, position: 'relative' }}>
            <input
              type="text"
              style={{
                ...fieldInputStyle(!!docNumberErr),
                paddingRight: checkingDocNumber ? 24 : 6, paddingLeft: 6,
                fontSize: 11, textAlign: 'center', height: 28,
              }}
              value={docNumber}
              disabled={isReadOnly}
              onChange={(e) => handleDocNumberChange(e.target.value)}
              placeholder="رقم المستند"
            />
            {checkingDocNumber && (
              <i className="ti ti-loader" style={{
                position: 'absolute', left: 6, top: '50%',
                transform: 'translateY(-50%)',
                fontSize: 10, animation: 'spin 1s linear infinite',
                color: 'var(--t4)', pointerEvents: 'none',
              }} />
            )}
          </div>
        )}

        {/* Date inline */}
        <div style={{ width: 130, flexShrink: 0 }}>
          <input
            type="date"
            style={{ ...fieldInputStyle(!!errors.document_date), fontSize: 11, height: 28, padding: '0 6px' }}
            value={form.document_date as string}
            disabled={isReadOnly}
            onChange={(e) => set('document_date', e.target.value)}
          />
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Print button */}
        {isEdit && (
          <button onClick={handlePrint}
            style={{
              width: 32, height: 32, borderRadius: 'var(--r2)',
              border: '1px solid var(--b2)', background: 'var(--bg1)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--t3)', flexShrink: 0,
            }}
            title="طباعة المستند"
          >
            <i className="ti ti-printer" style={{ fontSize: 14 }} />
          </button>
        )}

        {/* Advanced options gear */}
        <button onClick={() => setDrawerOpen(true)}
          style={{
            padding: '5px 10px', borderRadius: 'var(--r2)',
            border: '1px solid var(--b2)', background: 'var(--bg1)',
            cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--t2)',
            display: 'flex', alignItems: 'center', gap: 4,
            fontFamily: 'inherit', flexShrink: 0,
          }}
          title="خيارات متقدمة"
        >
          {hasAdvancedError && (
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--orange)', flexShrink: 0,
            }} />
          )}
          <i className="ti ti-adjustments" style={{ fontSize: 13 }} />
          {!isNarrow && 'خيارات متقدمة'}
        </button>

        {/* More dropdown */}
        <div ref={moreRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button onClick={() => setMoreOpen(!moreOpen)}
            style={{
              width: 32, height: 32, borderRadius: 'var(--r2)',
              border: '1px solid var(--b2)', background: 'var(--bg1)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--t3)',
            }}
            title="المزيد"
          >
            <i className="ti ti-dots-vertical" style={{ fontSize: 14 }} />
          </button>
          {moreOpen && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, zIndex: 50,
              minWidth: 160,
              background: 'var(--bg1)', borderRadius: 'var(--r2)',
              border: '1px solid var(--b2)', boxShadow: '0 8px 24px rgba(0,0,0,.12)',
              padding: 4, marginTop: 4,
              animation: 'fadeIn .15s ease',
            }}>
              <div style={{ padding: '7px 10px', fontSize: 10, fontWeight: 700, color: 'var(--t4)', borderBottom: '1px solid var(--b1)', marginBottom: 3 }}>
                تصدير
              </div>
              {['excel', 'pdf', 'json', 'xml'].map((fmt) => (
                <button key={fmt}
                  onClick={() => { setMoreOpen(false); handleExport(fmt); }}
                  style={{
                    width: '100%', padding: '6px 10px', border: 'none', background: 'none',
                    cursor: 'pointer', fontSize: 11.5, color: 'var(--t2)', fontWeight: 600,
                    fontFamily: 'inherit', textAlign: 'right', borderRadius: 'var(--r1)',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = 'var(--bg3)')}
                  onMouseOut={(e) => (e.currentTarget.style.background = 'none')}
                >
                  <i className={`ti ${fmt === 'excel' ? 'ti-file-spreadsheet' : fmt === 'pdf' ? 'ti-file-type-pdf' : fmt === 'json' ? 'ti-file-code' : 'ti-file-type-xml'}`}
                    style={{ fontSize: 12, color: 'var(--t4)' }} />
                  {fmt === 'excel' ? 'Excel' : fmt === 'pdf' ? 'PDF' : fmt === 'json' ? 'JSON' : 'XML'}
                </button>
              ))}
              {canReturn && (
                <>
                  <div style={{ borderTop: '1px solid var(--b1)', margin: '3px 0' }} />
                  <button
                    onClick={() => { setMoreOpen(false); setShowReturnModal(true); }}
                    style={{
                      width: '100%', padding: '6px 10px', border: 'none', background: 'none',
                      cursor: 'pointer', fontSize: 11.5, color: 'var(--orange)', fontWeight: 600,
                      fontFamily: 'inherit', textAlign: 'right', borderRadius: 'var(--r1)',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = 'var(--bg3)')}
                    onMouseOut={(e) => (e.currentTarget.style.background = 'none')}
                  >
                    <i className="ti ti-corner-up-left" style={{ fontSize: 12 }} />
                    إنشاء مرتجع
                  </button>
                </>
              )}
              {!isReadOnly && (
                <>
                  <div style={{ borderTop: '1px solid var(--b1)', margin: '3px 0' }} />
                  <button
                    onClick={() => { setMoreOpen(false); setShowDeleteModal(true); }}
                    style={{
                      width: '100%', padding: '6px 10px', border: 'none', background: 'none',
                      cursor: 'pointer', fontSize: 11.5, color: 'var(--red)', fontWeight: 600,
                      fontFamily: 'inherit', textAlign: 'right', borderRadius: 'var(--r1)',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = 'var(--bg3)')}
                    onMouseOut={(e) => (e.currentTarget.style.background = 'none')}
                  >
                    <i className="ti ti-trash" style={{ fontSize: 12 }} />
                    حذف المستند
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Save button */}
        <button onClick={handleSave} disabled={isPending || isReadOnly}
          style={{
            padding: '6px 16px', borderRadius: 'var(--r2)',
            border: 'none', background: isPending ? 'var(--bg3)' : 'var(--em)',
            color: isPending ? 'var(--t3)' : '#fff',
            cursor: isPending || isReadOnly ? 'not-allowed' : 'pointer',
            fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 4,
            opacity: isPending || isReadOnly ? 0.6 : 1,
            transition: 'opacity .15s ease-out', flexShrink: 0,
          }}
          title="Ctrl+S — حفظ المستند"
        >
          {isPending ? (
            <i className="ti ti-loader" style={{ animation: 'spin .8s linear infinite', fontSize: 13 }} />
          ) : (
            <i className="ti ti-device-floppy" style={{ fontSize: 13 }} />
          )}
          حفظ
        </button>
      </div>

      {/* ═══ TWO-COLUMN BODY ═══ */}
      <div style={{
        display: 'flex', flex: 1, overflow: 'hidden',
        background: 'var(--bg0)',
      }}>
        {/* ─── SIDEBAR ─── */}
        {sidebarVisible && (
          <div style={{
            width: isNarrow ? '100%' : 280,
            maxWidth: isNarrow ? '100%' : 280,
            flexShrink: 0,
            background: isNarrow ? 'var(--bg1)' : 'var(--bg2)',
            display: 'flex', flexDirection: 'column',
            overflowY: 'auto', padding: 12, gap: 10,
            position: isNarrow ? 'absolute' : 'relative',
            inset: isNarrow ? 0 : undefined,
            zIndex: isNarrow ? 40 : undefined,
            boxShadow: isNarrow ? '0 0 24px rgba(0,0,0,.15)' : undefined,
          }}>
            {isNarrow && (
              <button onClick={() => setSidebarForceOpen(false)}
                style={{
                  alignSelf: 'flex-start', padding: '4px 8px',
                  border: '1px solid var(--b2)', background: 'var(--bg1)',
                  borderRadius: 'var(--r1)', cursor: 'pointer',
                  fontSize: 11, color: 'var(--t3)', fontFamily: 'inherit',
                }}
              >
                <i className="ti ti-x" style={{ fontSize: 11 }} /> إغلاق
              </button>
            )}

            {needsParty && (
              <div>
                {/* Avatar + party name (click to toggle ComboBox) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                    background: 'color-mix(in srgb, var(--em) 12%, transparent)',
                    color: 'var(--em)', fontSize: 13, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {firstLetter}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {showPartyCombo ? (
                      <ComboBox
                        options={partyOptions}
                        value={form.party_id as string}
                        onChange={(v) => {
                          handlePartyChangeWithWarning(v);
                          setShowPartyCombo(false);
                        }}
                        placeholder={`— ابحث عن ${isPurchase ? 'مورد' : 'زبون'} —`}
                        disabled={isReadOnly}
                        error={!!errors.party_id}
                      />
                    ) : (
                      <div
                        onClick={() => !isReadOnly && setShowPartyCombo(true)}
                        style={{
                          fontSize: 13, fontWeight: 700, color: 'var(--t1)',
                          cursor: isReadOnly ? 'default' : 'pointer',
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        {selectedParty?.name ?? (
                          <span style={{ color: 'var(--t4)', fontWeight: 400, fontSize: 12 }}>
                            — اختر {isPurchase ? 'المورد' : 'الزبون'} —
                          </span>
                        )}
                        {!isReadOnly && (
                          <i className="ti ti-pencil" style={{ fontSize: 11, color: 'var(--t4)', opacity: 0.5 }} />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Party change warning popover */}
                {partyChangeWarning && !showPartyCombo && (
                  <div style={{
                    padding: '6px 8px', marginBottom: 6,
                    borderRadius: 'var(--r2)',
                    background: 'color-mix(in srgb, var(--orange) 10%, transparent)',
                    border: '1px solid var(--orange)',
                    fontSize: 11, color: 'var(--orange)',
                    display: 'flex', alignItems: 'flex-start', gap: 4,
                  }}>
                    <i className="ti ti-alert-triangle" style={{ marginTop: 0, flexShrink: 0, fontSize: 10 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, marginBottom: 0, fontSize: 10 }}>
                        {partyChangeWarning.blockType === 'existing_payments' && 'دفعات مُسجَّلة'}
                        {partyChangeWarning.blockType === 'has_payments' && 'دفعات في النموذج'}
                        {partyChangeWarning.blockType === 'price_level_change' && 'تعارض فئة السعر'}
                        {!partyChangeWarning.blockType && 'لا يمكن تغيير المتعامل'}
                      </div>
                      <div style={{ fontSize: 10 }}>{partyChangeWarning.message}</div>
                    </div>
                    <button onClick={() => setPartyChangeWarning(null)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--orange)', padding: 0, fontSize: 10, flexShrink: 0,
                      }}
                    >
                      <i className="ti ti-x" />
                    </button>
                  </div>
                )}

                {/* Balance — large colored number */}
                {partyBalance && (
                  <div style={{ marginBottom: 6, display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{
                      fontSize: 16, fontWeight: 800,
                      color: balanceType === 'debit' ? 'var(--green)' : 'var(--t1)',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {fmtDZD(currentBalance)} دج
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 600,
                      color: balanceType === 'debit' ? 'var(--green)' : 'var(--t3)',
                    }}>
                      {balanceType === 'debit' ? 'مدين لنا' : 'رصيد دائن'}
                    </span>
                  </div>
                )}

                {/* Credit gauge */}
                {creditLimit > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: 'var(--t4)',
                      marginBottom: 2,
                    }}>
                      <span>حد الائتمان: {fmtDZD(creditLimit)} دج</span>
                      <span style={{ color: gaugeColor, fontWeight: 600 }}>
                        {willExceed ? `تجاوز +${fmtDZD(Number(cck?.exceed_by ?? 0))}` : `${fmtDZD(usedCredit)} مستخدم`}
                      </span>
                    </div>
                    <div style={{
                      height: 3, borderRadius: 99, background: 'var(--bg3)',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%', width: `${usagePercent}%`,
                        background: gaugeColor, borderRadius: 99,
                        transition: 'width .3s ease-out',
                      }} />
                    </div>
                    {Number(cck?.overdue_invoices?.count ?? 0) > 0 && (
                      <div style={{
                        marginTop: 3, fontSize: 9.5, color: 'var(--orange)',
                        display: 'flex', alignItems: 'center', gap: 3,
                      }}>
                        <i className="ti ti-alert-triangle" style={{ fontSize: 8 }} />
                        {String(cck?.overdue_invoices?.count ?? '0')} فاتورة متأخرة
                      </div>
                    )}
                  </div>
                )}

                {/* Compact customer insights */}
                {customerInsights && (
                  <div style={{
                    padding: '8px 10px', borderRadius: 'var(--r2)',
                    background: 'var(--bg1)', border: '1px solid var(--b2)',
                    marginBottom: 6,
                  }}>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
                      {docCount > 0 && (
                        <span style={{
                          padding: '2px 6px', borderRadius: 'var(--r1)',
                          background: 'var(--bg3)', fontSize: 10, fontWeight: 600,
                          color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 3,
                        }}>
                          <i className="ti ti-file-description" style={{ fontSize: 8, color: 'var(--t4)' }} />
                          {docCount} مستند
                        </span>
                      )}
                      {monthlyAvg != null && (
                        <span style={{
                          padding: '2px 6px', borderRadius: 'var(--r1)',
                          background: 'var(--bg3)', fontSize: 10, fontWeight: 600,
                          color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 3,
                        }}>
                          <i className="ti ti-calculator" style={{ fontSize: 8, color: 'var(--t4)' }} />
                          {fmtDZD(monthlyAvg)}/شهر
                        </span>
                      )}
                      {avgPayDays != null && (
                        <span style={{
                          padding: '2px 6px', borderRadius: 'var(--r1)',
                          background: 'var(--bg3)', fontSize: 10, fontWeight: 600,
                          color: avgPayDays > 0 ? 'var(--red)' : 'var(--green)',
                          display: 'flex', alignItems: 'center', gap: 3,
                        }}>
                          <i className="ti ti-clock" style={{ fontSize: 8 }} />
                          {avgPayDays > 0 ? '+' : ''}{avgPayDays} يوم
                        </span>
                      )}
                    </div>
                    {insightDocs.slice(0, 2).map((d) => (
                      <div key={String(d.id)} style={{
                        padding: '4px 6px', borderRadius: 'var(--r1)',
                        background: 'var(--bg3)', border: '1px solid var(--b1)',
                        fontSize: 10, marginBottom: 3,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <span style={{ fontWeight: 600, color: 'var(--t2)' }}>
                          {String(d.document_number ?? '')}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <span style={{ color: 'var(--t3)', fontVariantNumeric: 'tabular-nums' }}>
                            {fmtDZD(Number(d.net_to_pay ?? 0))} دج
                          </span>
                          {d.status === 'overdue' && <span style={{ fontSize: 7, color: 'var(--red)', fontWeight: 700 }}>متأخر</span>}
                          {Number(d.remaining_amount ?? 0) > 0.01 && d.status !== 'overdue' && (
                            <span style={{ fontSize: 7, color: 'var(--orange)', fontWeight: 700 }}>غير مسدد</span>
                          )}
                        </span>
                      </div>
                    ))}
                    {insightDocs.length > 2 && (
                      <div style={{
                        fontSize: 10, color: 'var(--em)', fontWeight: 600,
                        cursor: 'pointer', textAlign: 'center', paddingTop: 3,
                      }}>
                        عرض الكل ←
                      </div>
                    )}
                  </div>
                )}

                {/* Balance warning */}
                {balanceWarning && (
                  <div style={{ marginTop: 2, marginBottom: 4 }}>
                    <AlertBanner type="warning" message={balanceWarning} />
                  </div>
                )}
              </div>
            )}

            {/* Document chain */}
            {isEdit && (
              <div>
                <div style={{
                  fontSize: 10, fontWeight: 700, color: 'var(--t4)', marginBottom: 4,
                  display: 'flex', alignItems: 'center', gap: 3,
                }}>
                  <i className="ti ti-link" style={{ fontSize: 9 }} />
                  سلسلة المستندات
                </div>
                <DocumentChainPanel
                  chain={chain}
                  isLoading={isLoadingChain}
                  currentId={Number(existingDocument?.id)}
                  allowedTargets={allowedTargets}
                  isReadOnly={isReadOnly}
                  onConvert={(targetCode) => {
                    if (!window.confirm(`تحويل هذا المستند إلى ${targetCode}؟`)) return;
                    convertMutation.mutate(
                      { documentId: Number(existingDocument!.id), targetTypeCode: targetCode },
                      { onSuccess: () => { onSaved(); onClose(); } },
                    );
                  }}
                  onNavigate={(docId) => {
                    navigate(`/documents/${typeCode}?document=${docId}`, { replace: true });
                  }}
                />
              </div>
            )}

            {/* ── Audit log timeline ── */}
            {isEdit && (
              <div>
                <div style={{
                  fontSize: 10, fontWeight: 700, color: 'var(--t4)', marginBottom: 4,
                  display: 'flex', alignItems: 'center', gap: 3,
                }}>
                  <i className="ti ti-history" style={{ fontSize: 9 }} />
                  سجل النشاطات
                </div>
                {isLoadingAudit ? (
                  <div style={{ padding: '4px 0' }}>
                    <Skeleton height={10} style={{ marginBottom: 4 }} />
                    <Skeleton height={10} style={{ marginBottom: 4 }} />
                    <Skeleton height={10} />
                  </div>
                ) : auditEntries.length === 0 ? (
                  <div style={{ fontSize: 10, color: 'var(--t4)', padding: '4px 0' }}>
                    لا توجد نشاطات بعد
                  </div>
                ) : (
                  <div style={{ position: 'relative', paddingRight: 14 }}>
                    {/* Timeline line */}
                    <div style={{
                      position: 'absolute', right: 4, top: 4, bottom: 4, width: 1.5,
                      background: 'var(--b2)', borderRadius: 99,
                    }} />
                    {auditEntries.slice(0, 10).map((entry: Record<string, unknown>) => {
                      const user = entry.user as Record<string, unknown> | undefined;
                      const userName = user?.name as string ?? 'نظام';
                      const event = entry.event as string;
                      const createdAt = entry.created_at as string;
                      const eventLabel =
                        event === 'created' ? 'إنشاء' :
                        event === 'updated' ? 'تعديل' :
                        event === 'deleted' ? 'حذف' :
                        event === 'validated' ? 'اعتماد' :
                        event === 'cancelled' ? 'إلغاء' :
                        event === 'locked' ? 'قفل' : event;
                      const eventColor =
                        event === 'created' ? 'var(--green)' :
                        event === 'deleted' ? 'var(--red)' :
                        event === 'cancelled' ? 'var(--red)' :
                        event === 'validated' ? 'var(--blue)' : 'var(--t3)';
                      const timeStr = createdAt
                        ? new Date(createdAt).toLocaleString('ar-DZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                        : '';
                      return (
                        <div key={String(entry.id)} style={{
                          position: 'relative', paddingBottom: 6, paddingTop: 1,
                        }}>
                          {/* Timeline dot */}
                          <div style={{
                            position: 'absolute', right: -12, top: 5, width: 7, height: 7,
                            borderRadius: '50%', background: eventColor,
                            border: '1.5px solid var(--bg2)',
                          }} />
                          <div style={{ fontSize: 9.5, color: 'var(--t2)', fontWeight: 600 }}>
                            {eventLabel}
                          </div>
                          <div style={{ fontSize: 9, color: 'var(--t4)' }}>
                            {userName} · {timeStr}
                          </div>
                        </div>
                      );
                    })}
                    {auditEntries.length > 10 && (
                      <div
                        onClick={() => setExtraTab('audit')}
                        style={{ fontSize: 9.5, color: 'var(--em)', fontWeight: 600, cursor: 'pointer', paddingTop: 2 }}
                      >
                        +{auditEntries.length - 10} أخرى
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── MAIN CONTENT ─── */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          overflow: 'hidden', background: 'var(--bg1)',
        }}>
          {/* Permanent banners — compact */}
          <div style={{ padding: '4px 12px 0' }}>
            {isCancelled && (
              <div style={{
                padding: '4px 10px', borderRadius: 'var(--r1)',
                background: 'var(--redb)', fontSize: 11, color: 'var(--red)', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <i className="ti ti-ban" style={{ fontSize: 11 }} />
                هذا المستند ملغى — جميع الحقول معطلة.
              </div>
            )}
            {isLocked && !isCancelled && (
              <div style={{
                padding: '4px 10px', borderRadius: 'var(--r1)',
                background: 'color-mix(in srgb, var(--orange) 10%, transparent)',
                fontSize: 11, color: 'var(--orange)', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <i className="ti ti-lock" style={{ fontSize: 11 }} />
                هذا المستند مقفل. لا يمكن تعديله حتى يتم فك القفل من قِبل المسؤول.
              </div>
            )}
            {pmMode === 'additive' && !isLocked && (
              <div style={{
                padding: '4px 10px', borderRadius: 'var(--r1)',
                background: 'color-mix(in srgb, var(--blue) 10%, transparent)',
                fontSize: 11, color: 'var(--blue)', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <i className="ti ti-plus" style={{ fontSize: 11 }} />
                المستند معتمد — الأسطر محمية من التعديل. يمكنك فقط إضافة دفعات جديدة.
              </div>
            )}
            {isDirty && !isLocked && !isCancelled && (
              <div style={{
                padding: '2px 8px', marginTop: 2,
                fontSize: 9.5, color: 'var(--orange)', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <i className="ti ti-alert-triangle" style={{ fontSize: 9 }} />
                توجد تغييرات غير محفوظة
              </div>
            )}
          </div>

          {/* Lines section — table fills remaining space — MAXIMUM SPACE */}
          <div style={{
            flex: 1, overflow: 'auto', padding: '6px 12px 0', minHeight: 0,
          }}>
            <DocumentLinesSection
              lines={form.lines}
              isLinesReadOnly={isLinesReadOnly}
              isReadOnly={isReadOnly}
              isPurchase={isPurchase}
              isPartyExempt={isPartyExempt}
              products={lookups.products}
              isLoadingProducts={lookups.isLoadingProducts}
              visibleCols={visibleCols}
              handleColsChange={handleColsChange}
              lineMode={lineMode}
              setLineMode={setLineMode}
              lineWarnings={lineWarnings}
              stockData={stockData}
              addLine={addLine}
              addLineWithProduct={addLineWithProduct}
              removeLine={removeLine}
              duplicateLine={duplicateLine}
              updateLine={updateLine}
              lineErr={lineErr}
              savedDraft={savedDraft}
              draftKey={draftKey}
              restoreDraft={restoreDraft}
              set={set}
              needsParty={needsParty}
              productSuggestions={productSuggestions}
              isLoadingSuggestions={isLoadingSuggestions}
              setShowBulkImport={setShowBulkImport}
              slug={ctrlSlug}
              affectsStock={affectsStock}
              stockDir={stockDir}
              warehouses={lookups.warehouses}
            />
          </div>

          {/* ═══ BOTTOM BAR — 52px ═══ */}
          <div style={{
            flexShrink: 0,
            background: 'var(--bg2)',
            borderTop: '1px solid var(--b1)',
            boxShadow: '0 -4px 12px rgba(0,0,0,.04)',
            position: 'relative',
          }}>
            <div style={{
              display: 'flex', alignItems: 'stretch', height: 52,
              padding: '0 12px',
            }}>
              {/* Left side: compact payments + line count */}
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', gap: 6,
                minWidth: 0, overflow: 'hidden',
              }}>
                {/* Line count chip */}
                <span style={{
                  padding: '2px 8px', borderRadius: 'var(--r1)',
                  background: 'var(--bg3)', fontSize: 10.5, fontWeight: 600,
                  color: 'var(--t3)', whiteSpace: 'nowrap',
                  display: 'flex', alignItems: 'center', gap: 3,
                }}>
                  <i className="ti ti-list" style={{ fontSize: 9 }} />
                  {form.lines.length} سطر
                </span>

                {payments.length > 0 && (
                  <>
                    <select
                      style={{
                        padding: '4px 6px', borderRadius: 'var(--r1)',
                        border: '1px solid var(--b2)', background: 'var(--bg1)',
                        color: 'var(--t1)', fontSize: 11, fontFamily: 'inherit',
                        maxWidth: 100, cursor: 'pointer',
                      }}
                      value={String(payments[0]?.payment_mode_id ?? '')}
                      disabled={isReadOnly}
                      onChange={(e) => updatePayment(0, 'payment_mode_id', Number(e.target.value))}
                    >
                      {paymentModeOptions.map((opt: { value: string; label: string }) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      style={{
                        width: 90, padding: '4px 6px', borderRadius: 'var(--r1)',
                        border: '1px solid var(--b2)', background: 'var(--bg1)',
                        color: 'var(--t1)', fontSize: 11, fontFamily: 'inherit',
                        textAlign: 'center', direction: 'ltr',
                      }}
                      value={fmtDZD(Number(payments[0]?.amount ?? 0))}
                      disabled={isReadOnly}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/[^0-9.]/g, '');
                        updatePayment(0, 'amount', Number(clean) || 0);
                      }}
                    />
                    <button
                      onClick={() => {
                        const remaining = totals.netToPay - payments.reduce((s, p) => s + Number(p.amount ?? 0), 0) + Number(payments[0]?.amount ?? 0);
                        updatePayment(0, 'amount', Math.max(0, remaining));
                      }}
                      style={{
                        padding: '3px 8px', borderRadius: 'var(--r1)',
                        border: '1px solid var(--b2)', background: 'var(--bg1)',
                        cursor: 'pointer', fontSize: 10, fontWeight: 600,
                        color: 'var(--t2)', fontFamily: 'inherit',
                      }}
                      disabled={isReadOnly}
                    >
                      دفعة كاملة
                    </button>
                    {payments.length > 1 && (
                      <button
                        onClick={() => setShowAllPayments(!showAllPayments)}
                        style={{
                          padding: '3px 6px', borderRadius: 'var(--r1)',
                          border: '1px solid var(--b2)', background: 'var(--bg1)',
                          cursor: 'pointer', fontSize: 10, fontWeight: 600,
                          color: 'var(--em)', fontFamily: 'inherit',
                        }}
                      >
                        +{payments.length - 1}
                      </button>
                    )}
                    {!isReadOnly && (
                      <button
                        onClick={() => addPayment()}
                        style={{
                          padding: '3px 6px', borderRadius: 'var(--r1)',
                          border: '1px dashed var(--b3)', background: 'transparent',
                          cursor: 'pointer', fontSize: 10, color: 'var(--t4)',
                          fontFamily: 'inherit',
                        }}
                      >
                        + إضافة دفعة
                      </button>
                    )}
                  </>
                )}
                {payments.length === 0 && !isReadOnly && (
                  <button
                    onClick={() => addPayment()}
                    style={{
                      padding: '3px 8px', borderRadius: 'var(--r1)',
                      border: '1px dashed var(--b3)', background: 'transparent',
                      cursor: 'pointer', fontSize: 10, color: 'var(--t4)',
                      fontFamily: 'inherit',
                    }}
                  >
                    + إضافة دفعة
                  </button>
                )}
              </div>

              {/* Right side: compact totals */}
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
                justifyContent: 'center', gap: 0, flexShrink: 0,
              }}>
                <div style={{
                  fontSize: 18, fontWeight: 800, color: 'var(--em)',
                  fontVariantNumeric: 'tabular-nums', lineHeight: 1.2,
                }}>
                  {fmtDZD(totals.netToPay)} دج
                </div>
                <div style={{
                  fontSize: 10, color: 'var(--t4)',
                  direction: 'ltr', textAlign: 'right',
                }}>
                  {totalsText}
                </div>
              </div>
            </div>

            {/* Multi-payment popover (slide-up) */}
            {showAllPayments && payments.length > 1 && (
              <div style={{
                position: 'absolute', bottom: '100%', left: 10, right: '50%',
                zIndex: 30,
                background: 'var(--bg1)', borderRadius: 'var(--r2)',
                border: '1px solid var(--b2)',
                boxShadow: '0 -4px 20px rgba(0,0,0,.1)',
                padding: 10, maxHeight: 220, overflowY: 'auto',
                animation: 'slideUp .15s ease-out',
              }}>
                <div style={{
                  fontSize: 10.5, fontWeight: 700, color: 'var(--t4)', marginBottom: 6,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <i className="ti ti-coin" style={{ fontSize: 11 }} />
                  جميع الدفعات
                </div>
                <DocumentPaymentsSection
                  payments={payments}
                  paymentModes={lookups.paymentModes}
                  paymentModeOptions={paymentModeOptions}
                  treasuryAccountMap={treasuryAccountMap}
                  treasuryAccounts={lookups.treasuryAccounts}
                  addPayment={addPayment}
                  addPaymentWithValues={addPaymentWithValues}
                  removePayment={removePayment}
                  updatePayment={updatePayment}
                  paymentsExceedWarning={paymentsExceedWarning}
                  advancePayments={advancePayments}
                  isLoadingAdvances={isLoadingAdvances}
                  pmMode={pmMode}
                  totals={totals}
                  affectsAccounting={docType?.affects_accounting ?? false}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ ADVANCED OPTIONS DRAWER ═══ */}
      {drawerOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          display: 'flex', justifyContent: 'flex-end',
        }}>
          <div onClick={() => setDrawerOpen(false)}
            style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,.3)',
              backdropFilter: 'blur(2px)',
              transition: 'opacity .2s ease-out',
            }}
          />
          <div ref={drawerRef}
            style={{
              position: 'relative', width: 360, height: '100dvh',
              background: 'var(--bg1)',
              boxShadow: '-6px 0 20px rgba(0,0,0,.1)',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
              transform: 'translateX(0)',
              transition: 'transform .2s ease-out',
            }}
          >
            <div style={{
              padding: '12px 14px', borderBottom: '1px solid var(--b2)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ fontWeight: 800, fontSize: 12, color: 'var(--t1)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <i className="ti ti-adjustments" style={{ fontSize: 13 }} />
                خيارات متقدمة
              </div>
              <button onClick={() => setDrawerOpen(false)}
                style={{
                  width: 26, height: 26, borderRadius: 6,
                  border: '1px solid var(--b2)', background: 'var(--bg1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--t3)',
                }}
              >
                <i className="ti ti-x" style={{ fontSize: 12 }} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
              <div style={{ marginBottom: 12 }}>
                <Label>تاريخ الاستحقاق</Label>
                <input
                  type="date"
                  style={fieldInputStyle()}
                  value={form.due_date as string}
                  min={form.document_date as string}
                  disabled={isReadOnly}
                  onChange={(e) => set('due_date', e.target.value)}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <Label required>المستودع</Label>
                <select
                  style={{
                    ...fieldInputStyle(!!errors.warehouse_id),
                    cursor: isReadOnly ? 'not-allowed' : 'pointer',
                  }}
                  value={form.warehouse_id as string}
                  disabled={isReadOnly}
                  onChange={(e) => {
                    const newId = e.target.value;
                    set('warehouse_id', newId);
                    ctrlQc.invalidateQueries({ queryKey: [ctrlSlug, 'warehouse-stock', newId] });
                  }}
                >
                  <option value="">— اختر —</option>
                  {lookups.warehouses.map((w: any) => (
                    <option key={String(w.id)} value={String(w.id)}>
                      {String(w.name)}{w.is_default ? ' ★' : ''}
                    </option>
                  ))}
                </select>
                <FieldError msg={errors.warehouse_id} />
              </div>

              <div style={{ marginBottom: 12 }}>
                <Label required>السنة المالية</Label>
                <select
                  style={{
                    ...fieldInputStyle(!!errors.fiscal_year_id),
                    cursor: isReadOnly ? 'not-allowed' : 'pointer',
                  }}
                  value={form.fiscal_year_id as string}
                  disabled={isReadOnly}
                  onChange={(e) => set('fiscal_year_id', e.target.value)}
                >
                  <option value="">— اختر —</option>
                  {lookups.fiscalYears.map((fy: any) => (
                    <option key={String(fy.id)} value={String(fy.id)}>
                      {String(fy.name)}
                      {fy.is_current ? ' ★' : ''}
                      {fy.is_closed ? ' (مقفلة)' : ''}
                    </option>
                  ))}
                </select>
                <FieldError msg={errors.fiscal_year_id} />
              </div>

              <div style={{ marginBottom: 12 }}>
                <Label required>العملة</Label>
                <select
                  style={{
                    ...fieldInputStyle(!!errors.currency_id),
                    cursor: isReadOnly ? 'not-allowed' : 'pointer',
                  }}
                  value={form.currency_id as string}
                  disabled={isReadOnly}
                  onChange={(e) => set('currency_id', e.target.value)}
                >
                  <option value="">— اختر —</option>
                  {lookups.currencies.map((c: any) => (
                    <option key={String(c.id)} value={String(c.id)}>
                      {String(c.code)} — {String(c.name)}{c.is_base_currency ? ' ★' : ''}
                    </option>
                  ))}
                </select>
                <FieldError msg={errors.currency_id} />
              </div>

              {!isPurchase && lookups.priceLevels.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <Label>فئة السعر</Label>
                  <ComboBox
                    options={priceLevelOptions}
                    value={form.price_level_id as string}
                    onChange={(v) => handlePriceLevelChange(v)}
                    placeholder="— الافتراضي —"
                    disabled={isReadOnly || isLinesReadOnly}
                  />
                  {isLinesReadOnly && (
                    <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 2 }}>
                      فئة السعر محمية — الأسطر معتمدة
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginBottom: 12 }}>
                <Label>ملاحظات للزبون</Label>
                <textarea
                  rows={2}
                  style={{ ...fieldInputStyle(), resize: 'vertical', fontSize: 12 }}
                  value={form.notes as string}
                  disabled={isReadOnly}
                  onChange={(e) => set('notes', e.target.value)}
                  placeholder="ملاحظات للزبون — تظهر في الطباعة"
                />
                <Label>ملاحظات داخلية</Label>
                <textarea
                  rows={1}
                  style={{
                    ...fieldInputStyle(),
                    border: '1px dashed var(--b3)',
                    color: 'var(--t3)', fontSize: 11, resize: 'vertical',
                  }}
                  value={form.internal_notes as string}
                  disabled={isReadOnly}
                  onChange={(e) => set('internal_notes', e.target.value)}
                  placeholder="ملاحظات داخلية — لا تظهر في الطباعة"
                />
              </div>

              <Section title="الشحن وشروط الدفع" icon="ti-truck-delivery" collapsible defaultOpen={false}>
                {(SHIPPING_CODES.has(docCode) ? extraTab : 'payment-terms') === 'shipping' ? (
                  <ShippingInfoSection
                    value={form.shipping_info}
                    deliveryDate={form.delivery_date}
                    disabled={isReadOnly}
                    onChange={(info) => set('shipping_info', info)}
                    onDeliveryDateChange={(date) => set('delivery_date', date)}
                  />
                ) : (
                  <PaymentTermsTable
                    terms={form.payment_terms}
                    netToPay={totals.netToPay}
                    disabled={isReadOnly}
                    onChange={(terms) => set('payment_terms', terms)}
                  />
                )}
                {SHIPPING_CODES.has(docCode) && (
                  <div style={{ marginTop: 6 }}>
                    <button
                      onClick={() => setExtraTab(extraTab === 'shipping' ? 'payment-terms' : 'shipping')}
                      style={{
                        padding: '3px 8px', borderRadius: 'var(--r1)',
                        border: '1px solid var(--b2)', background: 'var(--bg1)',
                        cursor: 'pointer', fontSize: 10.5, color: 'var(--t3)',
                      }}
                    >
                      {extraTab === 'shipping' ? '← شروط الدفع' : 'الشحن والتسليم →'}
                    </button>
                  </div>
                )}
              </Section>
            </div>
          </div>
        </div>
      )}

      {/* ═══ SUB-MODALS ═══ */}
      <BulkImportModal
        open={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        products={lookups.products}
        onImport={(importedLines: any) => { bulkAddLines(importedLines); }}
      />

      {showReturnModal && existingDocument && (
        <ReturnDocumentModal
          document={existingDocument}
          onCreated={(returnDoc) => {
            setShowReturnModal(false);
            const num = String((returnDoc as Record<string, unknown>).document_number ?? '');
            addToast({ type: 'success', title: `تم إنشاء المرتجع ${num} ✓` });
            if (ctrlSlug) {
              ctrlQc.invalidateQueries({ queryKey: [ctrlSlug, 'documents'] });
            }
            setTimeout(() => { onSaved(); onClose(); }, 1200);
          }}
          onClose={() => setShowReturnModal(false)}
        />
      )}

      <ConfirmDeleteModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => {
          setShowDeleteModal(false);
          deleteMut.mutate();
        }}
        loading={deleteMut.isPending}
        itemName={existingDocument?.document_number ? `#${existingDocument.document_number}` : undefined}
        warning="ملاحظة: الحذف غير مدعوم — استخدم الإلغاء."
      />

      {printModalOpen && existingDocument && companyInfo && (
        <Suspense fallback={null}>
          <TemplatePrintModal
            open={printModalOpen}
            onClose={() => setPrintModalOpen(false)}
            document={existingDocument as Record<string, unknown>}
            company={companyInfo as any}
            template={selectedTemplate || undefined}
            templates={printTemplates}
            docTypeCode={docCode}
          />
        </Suspense>
      )}
    </div>
  );
}
