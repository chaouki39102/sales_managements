import React, { useState, useRef, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';

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
import DocumentFooter from './CommercialDocumentModal/DocumentFooter';
import { DocumentChainPanel } from './components/DocumentChainPanel';
import { ReturnDocumentModal } from './components/ReturnDocumentModal';
import { BulkImportModal } from './components/BulkImportModal';
import { ShippingInfoSection } from './components/ShippingInfoSection';
import { PaymentTermsTable } from './components/PaymentTermsTable';
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal';

const TemplatePrintModal = React.lazy(() => import('@/pages/settings/print-settings/components/shared/TemplatePrintModal'));

export default function CommercialDocumentPage() {
  const { typeCode, id } = useParams<{ typeCode: string; id?: string }>();
  const navigate = useNavigate();
  const slug = useActiveSlug();
  const qc = useQueryClient();

  const isEdit = !!id;
  const listPath = `/documents/${typeCode}`;

  // ── Fetch document type by code ─────────────────────────────────────────
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

  // ── Fetch existing document for editing ─────────────────────────────────
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

  const existingDocument = isEdit ? existingDoc : undefined;
  const onClose = () => navigate(listPath);
  const onSaved = () => {
    qc.invalidateQueries({ queryKey: [slug, 'documents'] });
  };

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

  // ── Local UI state ──────────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showPartyCombo, setShowPartyCombo] = useState(false);
  const [showAllPayments, setShowAllPayments] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // ── Computed values ─────────────────────────────────────────────────────
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

  // ── Loading state ───────────────────────────────────────────────────────
  const isLoading = loadingDocType || (isEdit && loadingExisting);
  if (isLoading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--bg0)',
        flexDirection: 'column', gap: 12,
      }}>
        <i className="ti ti-loader" style={{
          fontSize: 32, color: 'var(--em)',
          animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{ fontSize: 13, color: 'var(--t3)' }}>
          {isEdit ? 'جاري تحميل المستند...' : 'جاري التحميل...'}
        </span>
      </div>
    );
  }

  if (!docType) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--bg0)',
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
    width: '100%', padding: '7px 10px', borderRadius: 'var(--r2)',
    border: `1px solid ${hasError ? 'var(--red)' : 'var(--b3)'}`,
    background: isReadOnly ? 'var(--bg3)' : 'var(--bg1)',
    color: 'var(--t1)', fontSize: 13,
    fontFamily: 'Tajawal, sans-serif', outline: 'none',
    boxSizing: 'border-box',
  });

  // ── Totals text (compact) ───────────────────────────────────────────────
  const totalsText = [
    `HT ${fmtDZD(totals.totalHt)} دج`,
    `TVA ${fmtDZD(totals.totalTva)} دج`,
    totals.totalStamp > 0.01 ? `الطابع ${fmtDZD(totals.totalStamp)} دج` : null,
    `الخصم ${fmtDZD(totals.totalDiscount)} دج`,
  ].filter(Boolean).join(' · ');

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: 'var(--bg0)', direction: 'rtl',
      transition: 'background .2s ease-out',
    }}>
      {/* ═══ TOP BAR — 56px ═══ */}
      <div style={{
        height: 56, flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '0 16px',
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

        {/* Doc icon */}
        <div style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          background: isCancelled
            ? 'var(--redb)'
            : `color-mix(in srgb, ${isPurchase ? 'var(--blue)' : 'var(--green)'} 12%, transparent)`,
          border: isCancelled
            ? '1px solid var(--red)'
            : `1px solid color-mix(in srgb, ${isPurchase ? 'var(--blue)' : 'var(--green)'} 25%, transparent)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className={`ti ${isCancelled ? 'ti-ban' : isPurchase ? 'ti-truck' : 'ti-receipt'}`}
            style={{ fontSize: 15, color: isCancelled ? 'var(--red)' : isPurchase ? 'var(--blue)' : 'var(--green)' }}
          />
        </div>

        {/* Doc name + number */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 800, color: 'var(--t1)',
            display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
          }}>
            {isEdit ? `تعديل ${docType.name}` : `${docType.name} جديد`}
            {isEdit && docNumber && (
              <span style={{
                padding: '1px 7px', borderRadius: 'var(--r1)',
                background: 'var(--bg1)', border: '1px solid var(--b2)',
                fontSize: 12, fontWeight: 700, color: 'var(--em)',
              }}>
                {docNumber}
              </span>
            )}
            {/* Status pill — highest priority only */}
            {statusPill && (
              <span style={{
                padding: '2px 8px', borderRadius: 99, fontSize: 10.5, fontWeight: 700,
                background: statusPill.bg, color: statusPill.color,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <i className={`ti ${statusPill.icon}`} style={{ fontSize: 10 }} />
                {statusPill.label}
              </span>
            )}
            {/* Secondary statuses as gray text (not colored pills) */}
            <span style={{ fontSize: 10.5, color: 'var(--t4)', display: 'flex', gap: 4, alignItems: 'center' }}>
              {pmMode === 'additive' && !statusPill && (
                <><i className="ti ti-plus" style={{ fontSize: 9 }} />دفعات إضافية</>
              )}
              {stockBadge && (
                <span style={{ color: stockBadge.color }}>{stockBadge.text}</span>
              )}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 1 }}>
            {isEdit ? `تم التعديل آخر مرة` : `رقم الوثيقة يُولَّد تلقائياً`}
          </div>
        </div>

        {/* Advanced options gear */}
        <button onClick={() => setDrawerOpen(true)}
          style={{
            padding: '6px 12px', borderRadius: 'var(--r2)',
            border: '1px solid var(--b2)', background: 'var(--bg1)',
            cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--t2)',
            display: 'flex', alignItems: 'center', gap: 5,
            fontFamily: 'inherit',
          }}
          title="خيارات متقدمة"
        >
          {hasAdvancedError && (
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: 'var(--orange)', flexShrink: 0,
            }} />
          )}
          <i className="ti ti-adjustments" style={{ fontSize: 14 }} />
          خيارات متقدمة
        </button>

        {/* Save button */}
        <button onClick={handleSave} disabled={isPending || isReadOnly}
          style={{
            padding: '7px 20px', borderRadius: 'var(--r2)',
            border: 'none', background: 'var(--em)',
            color: '#fff', cursor: isPending || isReadOnly ? 'not-allowed' : 'pointer',
            fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 5,
            opacity: isPending || isReadOnly ? 0.6 : 1,
            transition: 'opacity .15s ease-out',
          }}
          title="Ctrl+S — حفظ المستند"
        >
          {isPending ? (
            <i className="ti ti-loader" style={{ animation: 'spin .8s linear infinite', fontSize: 14 }} />
          ) : (
            <i className="ti ti-device-floppy" style={{ fontSize: 14 }} />
          )}
          حفظ
        </button>
      </div>

      {/* ═══ TWO-COLUMN BODY ═══ */}
      <div style={{
        display: 'flex', flex: 1, overflow: 'hidden',
        background: 'var(--bg0)',
      }}>
        {/* ─── SIDEBAR — 300px ─── */}
        <div style={{
          width: 300, flexShrink: 0,
          background: 'var(--bg2)',
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto', padding: 16, gap: 12,
        }}>
          {needsParty && (
            <div>
              {/* Avatar circle + party name */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: 'color-mix(in srgb, var(--em) 12%, transparent)',
                  color: 'var(--em)', fontSize: 14, fontWeight: 800,
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
                        fontSize: 14, fontWeight: 700, color: 'var(--t1)',
                        cursor: isReadOnly ? 'default' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      {selectedParty?.name ?? (
                        <span style={{ color: 'var(--t4)', fontWeight: 400, fontSize: 13 }}>
                          — اختر {isPurchase ? 'المورد' : 'الزبون'} —
                        </span>
                      )}
                      {!isReadOnly && (
                        <i className="ti ti-pencil" style={{ fontSize: 12, color: 'var(--t4)', opacity: 0.5 }} />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Balance — large colored number */}
              {partyBalance && (
                <div style={{
                  marginBottom: 8,
                  display: 'flex', alignItems: 'baseline', gap: 6,
                }}>
                  <span style={{
                    fontSize: 18, fontWeight: 800,
                    color: balanceType === 'debit' ? 'var(--green)' : 'var(--t1)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {fmtDZD(currentBalance)} دج
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: balanceType === 'debit' ? 'var(--green)' : 'var(--t3)',
                  }}>
                    {balanceType === 'debit' ? 'مدين لنا' : 'رصيد دائن'}
                  </span>
                </div>
              )}

              {/* Credit gauge — thin bar */}
              {creditLimit > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--t4)',
                    marginBottom: 3,
                  }}>
                    <span>حد الائتمان: {fmtDZD(creditLimit)} دج</span>
                    <span style={{ color: gaugeColor, fontWeight: 600 }}>
                      {willExceed ? `تجاوز +${fmtDZD(Number(cck?.exceed_by ?? 0))}` : `${fmtDZD(usedCredit)} مستخدم`}
                    </span>
                  </div>
                  <div style={{
                    height: 4, borderRadius: 99, background: 'var(--bg3)',
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
                      marginTop: 4, fontSize: 10, color: 'var(--orange)',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <i className="ti ti-alert-triangle" style={{ fontSize: 9 }} />
                      {String(cck?.overdue_invoices?.count ?? '0')} فاتورة متأخرة
                    </div>
                  )}
                </div>
              )}

              {/* Compact customer insights */}
              {customerInsights && (
                <div style={{
                  padding: '10px 12px', borderRadius: 'var(--r2)',
                  background: 'var(--bg1)', border: '1px solid var(--b2)',
                }}>
                  {/* 3 KPI chips in a row */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                    {docCount > 0 && (
                      <span style={{
                        padding: '3px 8px', borderRadius: 'var(--r1)',
                        background: 'var(--bg3)', fontSize: 10.5, fontWeight: 600,
                        color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        <i className="ti ti-file-description" style={{ fontSize: 9, color: 'var(--t4)' }} />
                        {docCount} مستند
                      </span>
                    )}
                    {monthlyAvg != null && (
                      <span style={{
                        padding: '3px 8px', borderRadius: 'var(--r1)',
                        background: 'var(--bg3)', fontSize: 10.5, fontWeight: 600,
                        color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        <i className="ti ti-calculator" style={{ fontSize: 9, color: 'var(--t4)' }} />
                        {fmtDZD(monthlyAvg)}/شهر
                      </span>
                    )}
                    {avgPayDays != null && (
                      <span style={{
                        padding: '3px 8px', borderRadius: 'var(--r1)',
                        background: 'var(--bg3)', fontSize: 10.5, fontWeight: 600,
                        color: avgPayDays > 0 ? 'var(--red)' : 'var(--green)',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        <i className="ti ti-clock" style={{ fontSize: 9 }} />
                        {avgPayDays > 0 ? '+' : ''}{avgPayDays} يوم
                      </span>
                    )}
                  </div>

                  {/* Last 2 documents */}
                  {insightDocs.slice(0, 2).map((d) => {
                    const isOverdue = d.status === 'overdue';
                    const isUnpaid = Number(d.remaining_amount ?? 0) > 0.01 && !isOverdue;
                    return (
                      <div key={String(d.id)} style={{
                        padding: '5px 8px', borderRadius: 'var(--r1)',
                        background: 'var(--bg3)', border: '1px solid var(--b1)',
                        fontSize: 10.5, marginBottom: 4,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <span style={{ fontWeight: 600, color: 'var(--t2)' }}>
                          {String(d.document_number ?? '')}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ color: 'var(--t3)', fontVariantNumeric: 'tabular-nums' }}>
                            {fmtDZD(Number(d.net_to_pay ?? 0))} دج
                          </span>
                          {isOverdue && <span style={{ fontSize: 8, color: 'var(--red)', fontWeight: 700 }}>متأخر</span>}
                          {isUnpaid && <span style={{ fontSize: 8, color: 'var(--orange)', fontWeight: 700 }}>غير مسدد</span>}
                        </span>
                      </div>
                    );
                  })}

                  {/* View all link */}
                  {insightDocs.length > 2 && (
                    <div style={{
                      fontSize: 10.5, color: 'var(--em)', fontWeight: 600,
                      cursor: 'pointer', textAlign: 'center', paddingTop: 4,
                    }}
                      onClick={() => {/* could open a popover */ }}
                    >
                      عرض الكل ←
                    </div>
                  )}
                </div>
              )}

              {/* Balance warning */}
              {balanceWarning && (
                <div style={{ marginTop: 4 }}>
                  <AlertBanner type="warning" message={balanceWarning} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── MAIN CONTENT ─── */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          overflow: 'hidden', background: 'var(--bg1)',
        }}>
          {/* Compact info row — date + doc number */}
          <div style={{
            padding: '10px 20px 0',
            display: 'flex', gap: 12, alignItems: 'flex-start',
          }}>
            {isEdit && (
              <div style={{ width: 200 }}>
                <div style={{
                  fontSize: 10.5, fontWeight: 600, color: 'var(--t4)', marginBottom: 2,
                }}>
                  رقم المستند
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    style={{
                      ...fieldInputStyle(!!docNumberErr),
                      paddingLeft: checkingDocNumber ? 28 : 10,
                      fontSize: 12,
                    }}
                    value={docNumber}
                    disabled={isReadOnly}
                    onChange={(e) => handleDocNumberChange(e.target.value)}
                    placeholder="أدخل رقم المستند..."
                  />
                  {checkingDocNumber && (
                    <i className="ti ti-loader" style={{
                      position: 'absolute', left: 10, top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: 12, animation: 'spin 1s linear infinite',
                      color: 'var(--t4)', pointerEvents: 'none',
                    }} />
                  )}
                </div>
                <FieldError msg={docNumberErr} />
              </div>
            )}
            <div style={{ width: 180 }}>
              <div style={{
                fontSize: 10.5, fontWeight: 600, color: 'var(--t4)', marginBottom: 2,
              }}>
                تاريخ المستند
              </div>
              <input
                type="date"
                style={{
                  ...fieldInputStyle(!!errors.document_date),
                  fontSize: 12,
                }}
                value={form.document_date as string}
                disabled={isReadOnly}
                onChange={(e) => set('document_date', e.target.value)}
              />
              <FieldError msg={errors.document_date} />
            </div>
          </div>

          {/* Alerts */}
          <div style={{ padding: '8px 20px 0' }}>
            {successMsg && <AlertBanner type="success" message={successMsg} />}
            {apiErr && <AlertBanner type="error" message={apiErr} />}
            {priceLevelSwitchMsg && (
              <AlertBanner
                type="warning"
                message={`المنتج "${priceLevelSwitchMsg.productName}" ليس له سعر في فئة "${priceLevelSwitchMsg.from}"، تم التبديل إلى "${priceLevelSwitchMsg.to}".`}
              />
            )}
            {isCancelled && <AlertBanner type="error" message="هذا المستند ملغى — جميع الحقول معطلة." />}
            {isLocked && !isCancelled && (
              <AlertBanner type="warning" message="هذا المستند مقفل. لا يمكن تعديله حتى يتم فك القفل من قِبل المسؤول." />
            )}
            {pmMode === 'additive' && !isLocked && (
              <AlertBanner
                type="info"
                message="المستند معتمد — الأسطر محمية من التعديل. يمكنك فقط إضافة دفعات جديدة."
              />
            )}
          </div>

          {/* Party change warning */}
          {partyChangeWarning && (
            <div style={{ padding: '8px 20px 0' }}>
              <div style={{
                padding: '8px 12px', borderRadius: 'var(--r2)',
                background: 'color-mix(in srgb, var(--orange) 10%, transparent)',
                border: '1px solid var(--orange)', fontSize: 12, color: 'var(--orange)',
                display: 'flex', alignItems: 'flex-start', gap: 8,
              }}>
                <i className="ti ti-alert-triangle" style={{ marginTop: 1, flexShrink: 0, fontSize: 13 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, marginBottom: 2, fontSize: 11.5 }}>
                    {partyChangeWarning.blockType === 'existing_payments' && 'دفعات مُسجَّلة في المستند'}
                    {partyChangeWarning.blockType === 'has_payments' && 'دفعات في النموذج'}
                    {partyChangeWarning.blockType === 'price_level_change' && 'تعارض فئة السعر'}
                    {!partyChangeWarning.blockType && 'لا يمكن تغيير المتعامل'}
                  </div>
                  <div style={{ fontSize: 11 }}>{partyChangeWarning.message}</div>
                </div>
                <button onClick={() => setPartyChangeWarning(null)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--orange)', padding: 0, fontSize: 12,
                  }}
                >
                  <i className="ti ti-x" />
                </button>
              </div>
            </div>
          )}

          {/* Document chain */}
          {isEdit && (
            <div style={{ padding: '6px 20px 0' }}>
              <DocumentChainPanel
                chain={chain}
                isLoading={isLoadingChain}
                currentId={Number(isEdit ? existingDocument?.id : null)}
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

          {/* Lines section — fills remaining space */}
          <div style={{
            flex: 1, overflow: 'auto', padding: '10px 20px 0', minHeight: 0,
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

          {/* ═══ BOTTOM BAR — 72px ═══ */}
          <div style={{
            flexShrink: 0,
            background: 'var(--bg2)',
            borderTop: '1px solid var(--b1)',
            boxShadow: '0 -4px 12px rgba(0,0,0,.04)',
            position: 'relative',
          }}>
            <div style={{
              display: 'flex', alignItems: 'stretch', height: 72,
              padding: '0 20px',
            }}>
              {/* Left side: Payments (compact) */}
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                minWidth: 0, overflow: 'hidden',
              }}>
                {payments.length > 0 && (
                  <>
                    {/* First payment line */}
                    <select
                      style={{
                        padding: '5px 8px', borderRadius: 'var(--r1)',
                        border: '1px solid var(--b2)', background: 'var(--bg1)',
                        color: 'var(--t1)', fontSize: 12, fontFamily: 'inherit',
                        maxWidth: 120, cursor: 'pointer',
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
                        width: 110, padding: '5px 8px', borderRadius: 'var(--r1)',
                        border: '1px solid var(--b2)', background: 'var(--bg1)',
                        color: 'var(--t1)', fontSize: 12, fontFamily: 'inherit',
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
                        padding: '4px 10px', borderRadius: 'var(--r1)',
                        border: '1px solid var(--b2)', background: 'var(--bg1)',
                        cursor: 'pointer', fontSize: 11, fontWeight: 600,
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
                          padding: '4px 8px', borderRadius: 'var(--r1)',
                          border: '1px solid var(--b2)', background: 'var(--bg1)',
                          cursor: 'pointer', fontSize: 11, fontWeight: 600,
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
                          padding: '4px 8px', borderRadius: 'var(--r1)',
                          border: '1px dashed var(--b3)', background: 'transparent',
                          cursor: 'pointer', fontSize: 11, color: 'var(--t4)',
                          fontFamily: 'inherit',
                        }}
                      >
                        + إضافة دفعة
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Right side: Totals (compact) */}
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
                justifyContent: 'center', gap: 1, flexShrink: 0,
              }}>
                <div style={{
                  fontSize: 20, fontWeight: 800, color: 'var(--em)',
                  fontVariantNumeric: 'tabular-nums', lineHeight: 1.2,
                }}>
                  {fmtDZD(totals.netToPay)} دج
                </div>
                <div style={{
                  fontSize: 11, color: 'var(--t4)',
                  direction: 'ltr', textAlign: 'right',
                }}>
                  {totalsText}
                </div>
              </div>
            </div>

            {/* Multi-payment popover */}
            {showAllPayments && payments.length > 1 && (
              <div style={{
                position: 'absolute', bottom: '100%', left: 20, right: '50%',
                zIndex: 30,
                background: 'var(--bg1)', borderRadius: 'var(--r2)',
                border: '1px solid var(--b2)',
                boxShadow: '0 -4px 20px rgba(0,0,0,.1)',
                padding: 12, maxHeight: 220, overflowY: 'auto',
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: 'var(--t4)',
                  marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <i className="ti ti-coin" style={{ fontSize: 12 }} />
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

      {/* ═══ STICKY FOOTER ═══ */}
      <div style={{
        flexShrink: 0,
      }}>
        <DocumentFooter
          form={form}
          totals={totals}
          payments={payments}
          pmMode={pmMode}
          isEdit={isEdit}
          isReadOnly={isReadOnly}
          isCancelled={isCancelled}
          isPending={isPending}
          successMsg={successMsg}
          docCode={docCode}
          RETURNABLE_CODES={RETURNABLE_CODES}
          handleDelete={handleDelete}
          handleExport={handleExport}
          onClose={onClose}
          handleSave={handleSave}
          onPrint={isEdit ? handlePrint : undefined}
          templates={printTemplates}
          selectedTemplateId={selectedTemplateId}
          onTemplateChange={setSelectedTemplateId}
        />
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
              position: 'relative', width: 380, height: '100vh',
              background: 'var(--bg1)',
              boxShadow: '-8px 0 24px rgba(0,0,0,.12)',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
              transform: 'translateX(0)',
              transition: 'transform .2s ease-out',
            }}
          >
            <div style={{
              padding: '14px 16px', borderBottom: '1px solid var(--b2)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{
                fontWeight: 800, fontSize: 13, color: 'var(--t1)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <i className="ti ti-adjustments" />
                خيارات متقدمة
              </div>
              <button onClick={() => setDrawerOpen(false)}
                style={{
                  width: 28, height: 28, borderRadius: 8,
                  border: '1px solid var(--b2)', background: 'var(--bg1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--t3)',
                }}
              >
                <i className="ti ti-x" style={{ fontSize: 13 }} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              {/* Due date */}
              <div style={{ marginBottom: 14 }}>
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

              {/* Warehouse */}
              <div style={{ marginBottom: 14 }}>
                <Label required>المستودع</Label>
                <select
                  style={{
                    ...fieldInputStyle(!!errors.warehouse_id),
                    cursor: isReadOnly ? 'not-allowed' : 'pointer',
                  }}
                  value={form.warehouse_id as string}
                  disabled={isReadOnly}
                  onChange={(e) => {
                    set('warehouse_id', e.target.value);
                    ctrlQc.invalidateQueries({ queryKey: [ctrlSlug, 'warehouse-stock', warehouseIdNum] });
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

              {/* Fiscal year */}
              <div style={{ marginBottom: 14 }}>
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

              {/* Currency */}
              <div style={{ marginBottom: 14 }}>
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

              {/* Price level */}
              {!isPurchase && lookups.priceLevels.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <Label>فئة السعر</Label>
                  <ComboBox
                    options={priceLevelOptions}
                    value={form.price_level_id as string}
                    onChange={(v) => handlePriceLevelChange(v)}
                    placeholder="— الافتراضي —"
                    disabled={isReadOnly || isLinesReadOnly}
                  />
                  {isLinesReadOnly && (
                    <div style={{ fontSize: 10.5, color: 'var(--t4)', marginTop: 3 }}>
                      فئة السعر محمية — الأسطر معتمدة
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div style={{ marginBottom: 14 }}>
                <Label>ملاحظات للزبون</Label>
                <textarea
                  rows={2}
                  style={{ ...fieldInputStyle(), resize: 'vertical' }}
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
                    color: 'var(--t3)', fontSize: 12, resize: 'vertical',
                  }}
                  value={form.internal_notes as string}
                  disabled={isReadOnly}
                  onChange={(e) => set('internal_notes', e.target.value)}
                  placeholder="ملاحظات داخلية — لا تظهر في الطباعة"
                />
              </div>

              {/* Shipping + Payment terms */}
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
                  <div style={{ marginTop: 8 }}>
                    <button
                      onClick={() => setExtraTab(extraTab === 'shipping' ? 'payment-terms' : 'shipping')}
                      style={{
                        padding: '4px 10px', borderRadius: 'var(--r1)',
                        border: '1px solid var(--b2)', background: 'var(--bg1)',
                        cursor: 'pointer', fontSize: 11, color: 'var(--t3)',
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
            setSuccessMsg(`تم إنشاء المرتجع ${num} ✓`);
            if (ctrlSlug) {
              ctrlQc.invalidateQueries({ queryKey: [ctrlSlug, 'documents'] });
            }
            setTimeout(() => { setSuccessMsg(''); onSaved(); onClose(); }, 1800);
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
