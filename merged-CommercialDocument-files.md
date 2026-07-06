

# =========================================
# 📘 CommercialDocument
# =========================================

## FILE: resources/js/pages/documents/CommercialDocumentModal/DocumentFooter.tsx
```
import React from 'react';
import type { DocumentTotals } from '../types/document.types';
import { fmtDZD } from '../utils/document.utils';

interface DocumentFooterProps {
  form: {
    lines: Array<unknown>;
  };
  totals: DocumentTotals;
  payments: Array<unknown>;
  pmMode: string;
  isEdit: boolean;
  isReadOnly: boolean;
  isCancelled: boolean;
  isPending: boolean;
  successMsg: string;
  docCode: string;
  RETURNABLE_CODES: Set<string>;
  handleDelete: () => void;
  handleExport: (format: 'excel' | 'pdf' | 'json' | 'xml') => void;
  onClose: () => void;
  handleSave: () => void;
  onPrint?: () => void;
  templates?: Array<{ id: number | null; name: string }>;
  selectedTemplateId?: number | null;
  onTemplateChange?: (id: number | null) => void;
}

export default function DocumentFooter({
  form, totals, payments,
  pmMode, isEdit, isReadOnly, isCancelled, isPending,
  successMsg, docCode,   RETURNABLE_CODES,
  handleDelete, handleExport,
  onClose, handleSave,
  onPrint, templates, selectedTemplateId, onTemplateChange,
}: DocumentFooterProps) {
  return (
    <div style={{
      padding: '12px 20px', borderTop: '1px solid var(--b1)',
      background: isCancelled ? 'var(--bg3)' : 'var(--bg2)',
      display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center',
      borderRadius: '0 0 var(--r3) var(--r3)',
    }}>
      <div style={{ fontSize: 12, color: 'var(--t4)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {form.lines.length > 0 && (
          <>
            <span>{form.lines.length} سطر</span>
            <span>·</span>
            <span style={{ fontWeight: 700, color: 'var(--green)' }}>
              {fmtDZD(totals.netToPay)} دج
            </span>
          </>
        )}
        {totals.remaining > 0.01 && payments.length > 0 && (
          <>
            <span>·</span>
            <span style={{ color: 'var(--red)', fontWeight: 600 }}>
              متبقي {fmtDZD(totals.remaining)} دج
            </span>
          </>
        )}
        {pmMode === 'additive' && payments.length > 0 && (
          <>
            <span>·</span>
            <span style={{ color: 'var(--orange)', fontWeight: 600 }}>
              {payments.length} دفعة
            </span>
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {isEdit && !isReadOnly && RETURNABLE_CODES.has(docCode) && (
          <button
            disabled={isPending}
            style={{
              padding: '8px 14px', borderRadius: 'var(--r2)',
              border: '1px solid var(--purple)',
              background: 'color-mix(in srgb, var(--purple) 10%, transparent)',
              color: 'var(--purple)',
              cursor: isPending ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <i className="ti ti-receipt-refund" />
            إنشاء مرتجع
          </button>
        )}
        {isEdit && !isReadOnly && (
          <button
            onClick={handleDelete}
            disabled={isPending}
            title="حذف المستند"
            style={{
              padding: '8px 16px', borderRadius: 'var(--r2)',
              border: '1px solid var(--red)', background: 'var(--redb)',
              color: 'var(--red)',
              cursor: isPending ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <i className="ti ti-trash" />
            حذف
          </button>
        )}

        {isEdit && onPrint && (
          <>
            {(templates && templates.length > 1) && (
              <select
                value={selectedTemplateId ?? ''}
                onChange={e => onTemplateChange?.(e.target.value ? Number(e.target.value) : null)}
                style={{
                  padding: '6px 8px', borderRadius: 'var(--r2)',
                  border: '1px solid var(--b2)', background: 'var(--bg1)',
                  fontSize: 12, color: 'var(--t2)', outline: 'none', cursor: 'pointer',
                  maxWidth: 120,
                }}
              >
                <option value="">القالب الافتراضي</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id ?? ''}>{t.name}</option>
                ))}
              </select>
            )}
            <button
              onClick={onPrint}
              style={{
                padding: '8px 14px', borderRadius: 'var(--r2)',
                border: '1px solid var(--em)', background: 'color-mix(in srgb, var(--em) 12%, transparent)',
                color: 'var(--em)', cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <i className="ti ti-printer" />
              طباعة بالقوالب
            </button>
          </>
        )}

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => {
              const menu = document.getElementById('export-menu');
              if (menu) menu.style.display = menu.style.display === 'none' ? 'flex' : 'none';
            }}
            style={{
              padding: '8px 14px', borderRadius: 'var(--r2)',
              border: '1px solid var(--b2)', background: 'var(--bg1)',
              color: 'var(--t2)', cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <i className="ti ti-download" />
            تصدير
            <i className="ti ti-chevron-down" style={{ fontSize: 11 }} />
          </button>
          <div id="export-menu" style={{
            display: 'none', position: 'absolute', bottom: '100%', right: 0, marginBottom: 4,
            flexDirection: 'column', gap: 2,
            background: 'var(--bg1)', border: '1px solid var(--b2)', borderRadius: 'var(--r2)',
            padding: 4, zIndex: 100, minWidth: 140,
          }}>
            {[
              { label: 'Excel', icon: 'ti-file-spreadsheet', format: 'excel' as const },
              { label: 'PDF', icon: 'ti-file-type-pdf', format: 'pdf' as const },
              { label: 'JSON', icon: 'ti-file-code', format: 'json' as const },
              { label: 'XML', icon: 'ti-file-code-2', format: 'xml' as const },
            ].map(opt => (
              <button key={opt.format}
                onClick={() => {
                  document.getElementById('export-menu')!.style.display = 'none';
                  handleExport(opt.format);
                }}
                style={{
                  padding: '6px 12px', borderRadius: 'var(--r2)',
                  border: 'none', background: 'transparent',
                  color: 'var(--t2)', cursor: 'pointer',
                  fontSize: 12.5, fontWeight: 500,
                  display: 'flex', alignItems: 'center', gap: 8, textAlign: 'right',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--b1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <i className={`ti ${opt.icon}`} style={{ fontSize: 15 }} />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onClose}
          disabled={isPending || !!successMsg}
          style={{
            padding: '8px 18px', borderRadius: 'var(--r2)',
            border: '1px solid var(--b2)', background: 'var(--bg1)',
            color: 'var(--t2)',
            cursor: isPending || !!successMsg ? 'not-allowed' : 'pointer',
            fontSize: 13, fontWeight: 600,
          }}
        >
          {isReadOnly ? 'إغلاق' : 'إلغاء'}
        </button>

        {!isReadOnly && (
          <button
            onClick={handleSave}
            disabled={isPending || !!successMsg}
            style={{
              padding: '8px 24px', borderRadius: 'var(--r2)',
              border: 'none',
              background: successMsg ? 'var(--green)' : 'var(--em)',
              color: 'white',
              cursor: isPending || !!successMsg ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 7,
              opacity: isPending ? 0.7 : 1, transition: 'background .2s',
            }}
          >
            {isPending ? (
              <>
                <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
                جاري الحفظ...
              </>
            ) : successMsg ? (
              <>
                <i className="ti ti-check" />
                تم الحفظ
              </>
            ) : (
              <>
                <i className={`ti ${isEdit ? 'ti-device-floppy' : 'ti-plus'}`} />
                {pmMode === 'additive'
                  ? 'حفظ الدفعات الجديدة'
                  : isEdit ? 'تحديث المستند' : 'حفظ المستند'}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

```

## FILE: resources/js/pages/documents/CommercialDocumentModal/DocumentHeaderSection.tsx
```
import React from 'react';
import type { DocumentType } from '@/lib/api/core/types';

interface DocumentHeaderSectionProps {
  documentType: DocumentType | null;
  isEdit: boolean;
  isCancelled: boolean;
  isLocked: boolean;
  isValidated: boolean;
  isPurchase: boolean;
  docCode: string;
  docNumber: string;
  existingDocument?: Record<string, unknown>;
  pmMode: string;
  stockBadge: { text: string; bg: string; color: string } | null;
  onClose: () => void;
  isPending: boolean;
}

export default function DocumentHeaderSection({
  documentType, isEdit, isCancelled, isLocked, isValidated,
  isPurchase, docCode, docNumber, existingDocument,
  pmMode, stockBadge, onClose, isPending,
}: DocumentHeaderSectionProps) {
  return (
    <div style={{
      padding: '14px 20px', borderBottom: '1px solid var(--b1)',
      background: isCancelled ? 'var(--bg3)' : 'var(--bg2)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: isCancelled
            ? 'var(--redb)'
            : `color-mix(in srgb, ${isPurchase ? 'var(--blue)' : 'var(--green)'} 12%, transparent)`,
          border: isCancelled
            ? '1px solid var(--red)'
            : `1px solid color-mix(in srgb, ${isPurchase ? 'var(--blue)' : 'var(--green)'} 25%, transparent)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i
            className={`ti ${isCancelled ? 'ti-ban' : isPurchase ? 'ti-truck' : 'ti-receipt'}`}
            style={{
              fontSize: 18,
              color: isCancelled ? 'var(--red)' : isPurchase ? 'var(--blue)' : 'var(--green)',
            }}
          />
        </div>

        <div>
          <div style={{
            fontSize: 14, fontWeight: 800, color: 'var(--t1)',
            display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
          }}>
            {isEdit ? `تعديل ${documentType?.name}` : `${documentType?.name} جديد`}

            {isEdit && existingDocument?.document_number && (
              <span style={{
                padding: '2px 8px', borderRadius: 'var(--r1)',
                background: 'var(--bg1)', border: '1px solid var(--b2)',
                fontSize: 12, fontWeight: 700, color: 'var(--em)',
              }}>
                {docNumber || String(existingDocument.document_number)}
              </span>
            )}

            {isCancelled && (
              <span style={{
                padding: '2px 8px', borderRadius: 'var(--r1)',
                background: 'var(--redb)', border: '1px solid var(--red)',
                fontSize: 11, fontWeight: 700, color: 'var(--red)',
              }}>ملغى</span>
            )}
            {isLocked && (
              <span style={{
                padding: '2px 8px', borderRadius: 'var(--r1)',
                background: 'var(--bg3)', border: '1px solid var(--b2)',
                fontSize: 11, fontWeight: 700, color: 'var(--t3)',
              }}>
                <i className="ti ti-lock" style={{ marginLeft: 4, fontSize: 10 }} />
                مقفل
              </span>
            )}
            {isValidated && !isCancelled && (
              <span style={{
                padding: '2px 8px', borderRadius: 'var(--r1)',
                background: 'var(--blueb)', border: '1px solid var(--blue)',
                fontSize: 11, fontWeight: 700, color: 'var(--blue)',
              }}>معتمد</span>
            )}
            {pmMode === 'additive' && (
              <span style={{
                padding: '2px 8px', borderRadius: 'var(--r1)',
                background: 'color-mix(in srgb, var(--orange) 12%, transparent)',
                border: '1px solid var(--orange)',
                fontSize: 10, fontWeight: 700, color: 'var(--orange)',
              }}>
                <i className="ti ti-plus" style={{ marginLeft: 3, fontSize: 9 }} />
                دفعات إضافية فقط
              </span>
            )}
            {stockBadge && (
              <span style={{
                padding: '2px 8px', borderRadius: 'var(--r1)',
                fontSize: 11, fontWeight: 700,
                background: stockBadge.bg, color: stockBadge.color,
              }}>
                {stockBadge.text}
              </span>
            )}
          </div>

          <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>
            {documentType?.name} — {docCode}
            {!isEdit && <span style={{ marginRight: 8 }}>· رقم الوثيقة يُولَّد تلقائياً</span>}
            {isCancelled && <span style={{ marginRight: 8, color: 'var(--red)' }}>· لا يمكن تعديل مستند ملغى</span>}
            {isLocked && !isCancelled && <span style={{ marginRight: 8, color: 'var(--t4)' }}>· مقفل — فك القفل للتعديل</span>}
            {pmMode === 'additive' && !isLocked && (
              <span style={{ marginRight: 8, color: 'var(--orange)' }}>
                · الأسطر للقراءة — يمكن إضافة دفعات جديدة فقط
              </span>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={onClose}
        disabled={isPending}
        style={{
          width: 28, height: 28, borderRadius: 8,
          border: '1px solid var(--b2)', background: 'var(--bg1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: isPending ? 'not-allowed' : 'pointer', color: 'var(--t3)',
        }}
      >
        <i className="ti ti-x" style={{ fontSize: 13 }} />
      </button>
    </div>
  );
}

```

## FILE: resources/js/pages/documents/CommercialDocumentModal/DocumentInfoSection.tsx
```
import React, { useMemo, useState, useEffect } from 'react';
import { Section, Label, FieldError, ComboBox, AlertBanner } from '../components/DocumentUIPrimitives';
import PartyBalanceBadge from './PartyBalanceBadge';
import { CreditCheckBar } from '../components/CreditCheckBar';
import { CustomerInsightPanel } from '../components/CustomerInsightPanel';
import type { PartyBalanceInfo } from '../hooks/useDocumentForm';

interface DocumentInfoSectionProps {
  form: Record<string, unknown>;
  errors: Record<string, string>;
  set: (field: string, value: unknown) => void;
  isEdit: boolean;
  isReadOnly: boolean;
  isLinesReadOnly: boolean;
  isPurchase: boolean;
  needsParty: boolean;
  docCode: string;
  docNumber: string;
  docNumberErr: string;
  checkingDocNumber: boolean;
  handleDocNumberChange: (num: string) => void;
  handlePartyChangeWithWarning: (id: string) => void;
  partyOptions: Array<{ id: number; label: string; sub: string; badge: string }>;
  priceLevelOptions: Array<{ id: number; label: string }>;
  handlePriceLevelChange: (v: string) => void;
  lookups: {
    warehouses: Array<{ id: number; name: string; is_default?: boolean }>;
    fiscalYears: Array<{ id: number; name: string; is_current?: boolean; is_closed?: boolean }>;
    currencies: Array<{ id: number; code: string; name: string; is_base_currency?: boolean }>;
    priceLevels: Array<{ id: number; name: string }>;
  };
  partyBalance: PartyBalanceInfo | null;
  isLoadingBalance: boolean;
  selectedParty?: { name?: string } | null;
  creditCheck: Record<string, unknown> | null;
  isLoadingCredit: boolean;
  customerInsights: Record<string, unknown> | null;
  isLoadingInsights: boolean;
  balanceWarning: string | null;
  qc: { invalidateQueries: (opts: { queryKey: unknown }) => void };
  slug: string | undefined;
  warehouseIdNum: number | null;
}

// نفس الأنماط المستخدَمة بالملف الأصلي (بدون أي تغيير) — استُخرجت هنا فقط
// لتفادي تكرارها بين المجموعتين.
const fieldInputStyle = (isReadOnly: boolean, hasError?: boolean): React.CSSProperties => ({
  width: '100%', padding: '7px 10px', borderRadius: 'var(--r2)',
  border: `1px solid ${hasError ? 'var(--red)' : 'var(--b3)'}`,
  background: isReadOnly ? 'var(--bg3)' : 'var(--bg1)',
  color: 'var(--t1)', fontSize: 13,
  fontFamily: 'Tajawal, sans-serif', outline: 'none',
  boxSizing: 'border-box',
});

export default function DocumentInfoSection({
  form, errors, set, isEdit, isReadOnly, isLinesReadOnly,
  isPurchase, needsParty, docCode,
  docNumber, docNumberErr, checkingDocNumber,
  handleDocNumberChange, handlePartyChangeWithWarning,
  partyOptions, priceLevelOptions, handlePriceLevelChange,
  lookups,
  partyBalance, isLoadingBalance, selectedParty,
  creditCheck, isLoadingCredit,
  customerInsights, isLoadingInsights,
  balanceWarning,
  qc, slug, warehouseIdNum,
}: DocumentInfoSectionProps) {

  // ── القسم الثانوي (مطوي افتراضياً) يُفتح تلقائياً لو ظهر خطأ تحقق بداخله ──
  // (المستودع/السنة المالية/العملة قيمها الافتراضية تأتي من Settings مسبقاً،
  // لذا الخطأ نادر، لكن لو حدث يجب ألا يختفي عن المستخدم داخل قسم مطوي)
  const hasAdvancedError = !!(errors.warehouse_id || errors.fiscal_year_id || errors.currency_id);
  const [advancedOpen, setAdvancedOpen] = useState(hasAdvancedError);
  useEffect(() => {
    if (hasAdvancedError) setAdvancedOpen(true);
  }, [hasAdvancedError]);

  const advancedFieldsCount = useMemo(() => {
    let n = 3; // المستودع + السنة المالية + العملة (دائماً موجودة)
    if (!isPurchase && lookups.priceLevels.length > 0) n += 1;
    return n;
  }, [isPurchase, lookups.priceLevels.length]);

  return (
    <>
      {/* ═══ المجموعة الأساسية — نفس Section، لكن تحتوي فقط الحقول الثلاثة
           التي يحتاجها كل مستند بلا استثناء: الرقم (عند التعديل)، الطرف
           التجاري، وتاريخ المستند ═══ */}
      <Section title="معلومات المستند" icon="ti-file-description">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: 12,
        }}>

          {isEdit && (
            <div>
              <Label required>رقم المستند</Label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  style={{
                    ...fieldInputStyle(isReadOnly, !!docNumberErr),
                    paddingLeft: checkingDocNumber ? 28 : 10,
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

          {needsParty && (
            <div style={{ gridColumn: 'span 2' }}>
              <Label required>{isPurchase ? 'المورد' : 'الزبون'}</Label>
              <ComboBox
                options={partyOptions}
                value={form.party_id as string}
                onChange={handlePartyChangeWithWarning}
                placeholder={`— ابحث عن ${isPurchase ? 'مورد' : 'زبون'} —`}
                disabled={isReadOnly}
                error={!!errors.party_id}
              />
              <FieldError msg={errors.party_id} />

              <PartyBalanceBadge
                balance={partyBalance}
                isLoading={isLoadingBalance}
                partyLabel={isPurchase ? 'المورد' : 'الزبون'}
              />

              {!isPurchase && (
                <CreditCheckBar
                  creditCheck={creditCheck}
                  isLoading={isLoadingCredit}
                  partyName={selectedParty?.name}
                />
              )}

              <CustomerInsightPanel
                insights={customerInsights}
                isLoading={isLoadingInsights}
              />

              {balanceWarning && (
                <AlertBanner type="warning" message={balanceWarning} />
              )}
            </div>
          )}

          <div>
            <Label required>تاريخ المستند</Label>
            <input
              type="date"
              style={fieldInputStyle(isReadOnly, !!errors.document_date)}
              value={form.document_date as string}
              disabled={isReadOnly}
              onChange={(e) => set('document_date', e.target.value)}
            />
            <FieldError msg={errors.document_date} />
          </div>
        </div>
      </Section>

      {/* ═══ خيارات إضافية — مطوية افتراضياً. القيم هنا تأتي جاهزة وصحيحة من
           Settings (المستودع/العملة/فئة السعر الافتراضية) في 90%+ من الحالات،
           فلا داعي لعرضها دائماً قبل وصول المستخدم لجدول الأصناف. تُفتح
           تلقائياً لو ظهر خطأ تحقق بداخلها (انظر useEffect بالأعلى). ═══ */}
      <Section
        title="خيارات إضافية"
        icon="ti-adjustments"
        collapsible
        open={advancedOpen}
        onOpenChange={setAdvancedOpen}
        badge={
          hasAdvancedError ? (
            <span style={{
              padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 800,
              background: 'var(--redb)', color: 'var(--red)',
            }}>
              يحتاج مراجعة
            </span>
          ) : (
            <span style={{
              padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700,
              background: 'var(--bg3)', color: 'var(--t4)',
            }}>
              {advancedFieldsCount} حقول — قيم افتراضية مُطبَّقة
            </span>
          )
        }
      >
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: 12,
        }}>

          <div>
            <Label>تاريخ الاستحقاق</Label>
            <input
              type="date"
              style={fieldInputStyle(isReadOnly)}
              value={form.due_date as string}
              min={form.document_date as string}
              disabled={isReadOnly}
              onChange={(e) => set('due_date', e.target.value)}
            />
          </div>

          <div>
            <Label required>المستودع</Label>
            <select
              style={{
                ...fieldInputStyle(isReadOnly, !!errors.warehouse_id),
                cursor: isReadOnly ? 'not-allowed' : 'pointer',
              }}
              value={form.warehouse_id as string}
              disabled={isReadOnly}
              onChange={(e) => {
                set('warehouse_id', e.target.value);
                qc.invalidateQueries({ queryKey: [slug, 'warehouse-stock', warehouseIdNum] });
              }}
            >
              <option value="">— اختر —</option>
              {lookups.warehouses.map((w) => (
                <option key={String(w.id)} value={String(w.id)}>
                  {String(w.name)}{w.is_default ? ' ★' : ''}
                </option>
              ))}
            </select>
            <FieldError msg={errors.warehouse_id} />
          </div>

          <div>
            <Label required>السنة المالية</Label>
            <select
              style={{
                ...fieldInputStyle(isReadOnly, !!errors.fiscal_year_id),
                cursor: isReadOnly ? 'not-allowed' : 'pointer',
              }}
              value={form.fiscal_year_id as string}
              disabled={isReadOnly}
              onChange={(e) => set('fiscal_year_id', e.target.value)}
            >
              <option value="">— اختر —</option>
              {lookups.fiscalYears.map((fy) => (
                <option key={String(fy.id)} value={String(fy.id)}>
                  {String(fy.name)}
                  {fy.is_current ? ' ★' : ''}
                  {fy.is_closed ? ' (مقفلة)' : ''}
                </option>
              ))}
            </select>
            <FieldError msg={errors.fiscal_year_id} />
          </div>

          <div>
            <Label required>العملة</Label>
            <select
              style={{
                ...fieldInputStyle(isReadOnly, !!errors.currency_id),
                cursor: isReadOnly ? 'not-allowed' : 'pointer',
              }}
              value={form.currency_id as string}
              disabled={isReadOnly}
              onChange={(e) => set('currency_id', e.target.value)}
            >
              <option value="">— اختر —</option>
              {lookups.currencies.map((c) => (
                <option key={String(c.id)} value={String(c.id)}>
                  {String(c.code)} — {String(c.name)}{c.is_base_currency ? ' ★' : ''}
                </option>
              ))}
            </select>
            <FieldError msg={errors.currency_id} />
          </div>

          {!isPurchase && lookups.priceLevels.length > 0 && (
            <div>
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

          <div style={{ gridColumn: 'span 2' }}>
            <Label>ملاحظات للزبون</Label>
            <textarea
              rows={2}
              style={{ ...fieldInputStyle(isReadOnly), resize: 'vertical' }}
              value={form.notes as string}
              disabled={isReadOnly}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="ملاحظات للزبون — تظهر في الطباعة"
            />
            <Label>ملاحظات داخلية</Label>
            <textarea
              rows={1}
              style={{
                ...fieldInputStyle(isReadOnly),
                border: '1px dashed var(--b3)',
                color: 'var(--t3)', fontSize: 12,
                resize: 'vertical',
              }}
              value={form.internal_notes as string}
              disabled={isReadOnly}
              onChange={(e) => set('internal_notes', e.target.value)}
              placeholder="ملاحظات داخلية — لا تظهر في الطباعة"
            />
          </div>
        </div>
      </Section>
    </>
  );
}

```

## FILE: resources/js/pages/documents/CommercialDocumentModal/DocumentLinesSection.tsx
```
import React from 'react';
import { Section, AlertBanner, ColumnManager } from '../components/DocumentUIPrimitives';
import { BarcodeInput } from '../components/BarcodeInput';
import { LineCard } from '../components/LineCard';
import { DocumentLineRow } from '../components/DocumentLineRow';
import { SmartSuggestionsPanel } from '../components/SmartSuggestionsPanel';
import type { LineItem, ColKey } from '../types/document.types';
import { ALL_COLUMNS } from '../types/document.types';
import type { ComputeLineWarning } from '../hooks/useComputeLine';
import { validateLineStock } from '../utils/document.utils';

interface DocumentLinesSectionProps {
  lines: LineItem[];
  isLinesReadOnly: boolean;
  isReadOnly: boolean;
  isPurchase: boolean;
  isPartyExempt: boolean;
  products: Array<{ id: number; name: string; ref?: string | null; barcode?: string | null }>;
  isLoadingProducts: boolean;
  visibleCols: Set<ColKey>;
  handleColsChange: (cols: Set<ColKey>) => void;
  lineMode: 'table' | 'card';
  setLineMode: React.Dispatch<React.SetStateAction<'table' | 'card'>>;
  lineWarnings: Map<number, ComputeLineWarning[]>;
  stockData: Record<number, number>;
  addLine: () => void;
  addLineWithProduct: (productId: string, unitPrice?: number, tvaRate?: number) => void;
  removeLine: (idx: number) => void;
  duplicateLine: (idx: number) => void;
  updateLine: (idx: number, patch: Partial<LineItem>, product?: unknown) => void;
  lineErr: string;
  savedDraft: Record<string, unknown> | null;
  draftKey: string;
  restoreDraft: () => Record<string, unknown> | null;
  set: (field: string, value: unknown) => void;
  needsParty: boolean;
  productSuggestions: unknown;
  isLoadingSuggestions: boolean;
  setShowBulkImport: React.Dispatch<React.SetStateAction<boolean>>;
  slug: string | undefined;
  affectsStock: boolean;
  stockDir: 1 | -1 | 0;
  warehouses: Array<{ id: number; name: string }>;
}

export default function DocumentLinesSection({
  lines, isLinesReadOnly, isReadOnly, isPurchase, isPartyExempt,
  products, isLoadingProducts,
  visibleCols, handleColsChange,
  lineMode, setLineMode,
  lineWarnings, stockData,
  addLine, addLineWithProduct, removeLine, duplicateLine, updateLine,
  lineErr, savedDraft, draftKey, restoreDraft, set,
  needsParty, productSuggestions, isLoadingSuggestions,
  setShowBulkImport, slug,
  affectsStock, stockDir,
  warehouses,
}: DocumentLinesSectionProps) {
  return (
    <Section
      title="أسطر المستند"
      icon="ti-list-details"
      badge={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {lines.length > 0 && (
            <span style={{
              padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700,
              background: 'var(--emb)', color: 'var(--em)',
            }}>
              {lines.length} سطر
            </span>
          )}
          {isLinesReadOnly && (
            <span style={{
              padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700,
              background: 'var(--bg3)', color: 'var(--t4)',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <i className="ti ti-lock" style={{ fontSize: 10 }} />
              محمية
            </span>
          )}
          {!isLinesReadOnly && (
            <ColumnManager visible={visibleCols} onChange={handleColsChange} />
          )}
        </div>
      }
    >
      {affectsStock && (
        <AlertBanner
          type={stockDir > 0 ? 'info' : 'warning'}
          message={stockDir > 0
            ? 'هذا المستند سيضيف الكميات إلى المخزون عند الحفظ'
            : 'هذا المستند سيخصم الكميات من المخزون عند الحفظ'}
        />
      )}

      {lineErr && <AlertBanner type="error" message={lineErr} />}

      {!isLinesReadOnly && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <BarcodeInput
            products={products}
            onProductFound={(productId) => {
              addLineWithProduct(String(productId));
            }}
            disabled={isLinesReadOnly}
          />
          <button
            onClick={() => setLineMode((m) => {
              const next = m === 'table' ? 'card' : 'table';
              try { localStorage.setItem(`doc_line_mode_${slug ?? 'default'}`, next); } catch {}
              return next;
            })}
            style={{
              padding: '5px 10px', borderRadius: 'var(--r1)',
              border: '1px solid var(--b3)', background: 'transparent',
              color: 'var(--t3)', cursor: 'pointer', fontSize: 11,
              display: 'flex', alignItems: 'center', gap: 4,
              fontFamily: 'inherit',
            }}
          >
            <i className={`ti ti-${lineMode === 'table' ? 'layout-cards' : 'table'}`} />
            {lineMode === 'table' ? 'عرض البطاقات' : 'عرض الجدول'}
          </button>
        </div>
      )}

      {isLoadingProducts ? (
        <div style={{
          textAlign: 'center', padding: 24, color: 'var(--t4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
          جاري تحميل المنتجات...
        </div>
      ) : (
        <>
          {lines.length === 0 ? (
            <div>
              {savedDraft && (
                <div style={{
                  padding: '10px 14px', marginBottom: 8, borderRadius: 'var(--r2)',
                  background: 'color-mix(in srgb, var(--blue) 8%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--blue) 20%, transparent)',
                  display: 'flex', alignItems: 'center', gap: 10, fontSize: 12,
                }}>
                  <i className="ti ti-history" style={{ color: 'var(--blue)', fontSize: 16 }} />
                  <span style={{ flex: 1, color: 'var(--t2)' }}>
                    لديك مسودة محفوظة من قبل — هل تريد استعادتها؟
                  </span>
                  <button
                    onClick={() => {
                      const draft = restoreDraft();
                      if (draft) {
                        Object.keys(draft).forEach((k) => {
                          if (k !== '_savedAt' && typeof set === 'function') {
                            (set as (field: string, value: unknown) => void)(k, draft[k]);
                          }
                        });
                        try { localStorage.removeItem(draftKey); } catch {}
                      }
                    }}
                    style={{
                      padding: '5px 12px', borderRadius: 'var(--r1)',
                      border: '1px solid var(--blue)', background: 'var(--emb)',
                      color: 'var(--blue)', cursor: 'pointer', fontSize: 11,
                      fontWeight: 700, fontFamily: 'inherit',
                    }}
                  >
                    استعادة
                  </button>
                  <button
                    onClick={() => { try { localStorage.removeItem(draftKey); } catch {} }}
                    style={{
                      padding: '5px 10px', borderRadius: 'var(--r1)',
                      border: '1px solid var(--b3)', background: 'transparent',
                      color: 'var(--t3)', cursor: 'pointer', fontSize: 11,
                      fontFamily: 'inherit',
                    }}
                  >
                    تجاهل
                  </button>
                </div>
              )}
              <div style={{
                padding: 16, textAlign: 'center', color: 'var(--t4)',
                fontSize: 12, background: 'var(--bg3)', borderRadius: 'var(--r2)',
              }}>
                {isLinesReadOnly ? 'لا أسطر — المستند فارغ' : 'لا أسطر بعد — اضغط "إضافة سطر" أدناه'}
              </div>
            </div>
          ) : lineMode === 'card' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {lines.map((line, idx) => {
                const stockResult = line._product
                  ? validateLineStock(line, line._product, isPurchase, stockData)
                  : { ok: true as const };
                return (
                  <LineCard
                    key={idx}
                    line={line}
                    idx={idx}
                    products={products}
                    isPurchase={isPurchase}
                    disabled={isLinesReadOnly}
                    stockData={stockData}
                    stockValidation={stockResult}
                    isTvaExempt={!isPurchase && isPartyExempt}
                    lineWarnings={lineWarnings.get(idx)}
                    warehouses={warehouses}
                    onUpdate={updateLine}
                    onRemove={removeLine}
                    onDuplicate={duplicateLine}
                  />
                );
              })}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--bg3)', borderBottom: '2px solid var(--b2)' }}>
                  {ALL_COLUMNS.filter((c) => visibleCols.has(c.key)).map((col) => (
                    <th key={col.key} style={{
                      padding: '6px 8px', textAlign: 'right', fontWeight: 700,
                      color: 'var(--t3)', fontSize: 11, whiteSpace: 'nowrap',
                      minWidth: col.w,
                    }}>
                      {col.label}
                    </th>
                  ))}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => {
                    const stockResult = line._product
                      ? validateLineStock(line, line._product, isPurchase, stockData)
                      : { ok: true as const };
                    const lineIdxWarnings = lineWarnings.get(idx);
                    return (
                      <DocumentLineRow
                        key={idx}
                        line={line}
                        idx={idx}
                        visibleCols={visibleCols}
                        isPurchase={isPurchase}
                        disabled={isLinesReadOnly}
                        products={products}
                        stockData={stockData}
                        stockValidation={stockResult}
                        onUpdate={updateLine}
                        onRemove={removeLine}
                        onDuplicate={duplicateLine}
                        isTvaExempt={!isPurchase && isPartyExempt}
                        lineWarnings={lineIdxWarnings}
                        warehouses={warehouses}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!isLinesReadOnly && needsParty && (
            <SmartSuggestionsPanel
              suggestions={productSuggestions}
              isLoading={isLoadingSuggestions}
              onAddProduct={(productId, suggestedPrice, suggestedTva) => {
                addLineWithProduct(String(productId), suggestedPrice ?? undefined, suggestedTva ?? undefined);
              }}
              disabled={isReadOnly}
            />
          )}

          {!isLinesReadOnly && (
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <button
                onClick={addLine}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 'var(--r2)',
                  border: '1px dashed var(--b3)', background: 'transparent',
                  color: 'var(--t3)', cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--em)'; e.currentTarget.style.color = 'var(--em)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--b3)'; e.currentTarget.style.color = 'var(--t3)'; }}
              >
                <i className="ti ti-plus" />
                إضافة سطر
              </button>
              <button
                onClick={() => setShowBulkImport(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 'var(--r2)',
                  border: '1px dashed var(--b3)', background: 'transparent',
                  color: 'var(--t3)', cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--purple)'; e.currentTarget.style.color = 'var(--purple)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--b3)'; e.currentTarget.style.color = 'var(--t3)'; }}
              >
                <i className="ti ti-upload" />
                استيراد من Excel
              </button>
            </div>
          )}
        </>
      )}
    </Section>
  );
}

```

## FILE: resources/js/pages/documents/CommercialDocumentModal/DocumentPaymentsSection.tsx
```
import React from 'react';
import { Section, Label, AlertBanner } from '../components/DocumentUIPrimitives';
import { CheckFormFields } from '../components/CheckFormFields';
import { AdvancePaymentsPanel } from '../components/AdvancePaymentsPanel';
import type { PaymentEntry } from '../types/document.types';
import { fmtDZD } from '../utils/document.utils';
import { toNum } from '../utils/document.utils';

interface DocumentPaymentsSectionProps {
  payments: PaymentEntry[];
  paymentModes: Array<{ id: number; name: string }>;
  paymentModeOptions: Array<{
    id: number;
    label: string;
    treasury_account_id?: number | null;
    requires_reference?: boolean;
  }>;
  treasuryAccountMap: Map<number, { id: number; name: string; type: string }>;
  treasuryAccounts: Array<{ id: number; code: string; name: string; type: string }>;
  addPayment: () => void;
  addPaymentWithValues: (values: Partial<PaymentEntry>) => void;
  removePayment: (idx: number) => void;
  updatePayment: (idx: number, patch: Partial<PaymentEntry>) => void;
  paymentsExceedWarning: string | null;
  advancePayments: unknown;
  isLoadingAdvances: boolean;
  pmMode: string;
  totals: { remaining: number };
  affectsAccounting: boolean;
}

export default function DocumentPaymentsSection({
  payments,
  paymentModes, paymentModeOptions, treasuryAccountMap, treasuryAccounts,
  addPayment, addPaymentWithValues, removePayment, updatePayment,
  paymentsExceedWarning,
  advancePayments, isLoadingAdvances,
  pmMode, totals, affectsAccounting,
}: DocumentPaymentsSectionProps) {
  if (!affectsAccounting) return null;

  return (
    <Section title="الدفعات" icon="ti-wallet" collapsible>

      <AdvancePaymentsPanel
        advances={advancePayments}
        isLoading={isLoadingAdvances}
        onApply={(adv) => {
          if (pmMode === 'locked') return;
          addPaymentWithValues({
            payment_mode_id: String((adv as Record<string, unknown>).payment_mode_id),
            amount: String((adv as Record<string, unknown>).unapplied_amount),
            reference: (adv as Record<string, unknown>).reference as string ?? '',
            payment_date: (adv as Record<string, unknown>).payment_date as string,
          });
        }}
        disabled={pmMode === 'locked'}
      />

      {paymentsExceedWarning && (
        <AlertBanner type="warning" message={paymentsExceedWarning} />
      )}

      {payments.length === 0 && (
        <div style={{
          padding: 12, fontSize: 12, color: 'var(--t4)',
          background: 'var(--bg3)', borderRadius: 'var(--r2)', marginBottom: 12,
        }}>
          {pmMode === 'locked'
            ? 'المستند محمي — لا يمكن إضافة دفعات.'
            : 'لم تُضَف دفعات — سيتم إنشاء المستند دون تسديد.'}
        </div>
      )}

      {payments.map((pay, idx) => {
        const isExisting = pay.id !== undefined && pay.id !== null;
        const selectedMode = paymentModes.find(
          (pm) => String(pm.id) === pay.payment_mode_id,
        );
        const autoTreasuryId = selectedMode?.treasury_account_id ?? null;
        const manualTreasuryStr = pay.treasury_account_id ? String(pay.treasury_account_id) : '';
        const effectiveTreasury = autoTreasuryId
          ? treasuryAccountMap.get(autoTreasuryId)
          : (manualTreasuryStr ? treasuryAccountMap.get(parseInt(manualTreasuryStr)) : null);

        const remainingForFill = totals.remaining;
        const isLast = idx === payments.length - 1;

        return (
          <div key={pay._clientRef ?? idx} style={{
            display: 'grid',
            gridTemplateColumns: '1fr 130px 160px 120px 1fr 32px',
            gap: 8, marginBottom: 10, alignItems: 'end',
            padding: 12, borderRadius: 'var(--r2)',
            background: isExisting ? 'var(--goldb)' : 'var(--bg2)',
            border: `1px solid ${isExisting ? 'var(--gold)' : 'var(--b2)'}`,
          }}>
            <div>
              {idx === 0 && <Label>طريقة الدفع</Label>}
              <select
                disabled={pmMode === 'locked'}
                style={{
                  width: '100%', padding: '7px 10px', borderRadius: 'var(--r2)',
                  border: `1px solid ${!pay.payment_mode_id ? 'var(--red)' : 'var(--b3)'}`,
                  background: 'var(--bg1)', color: 'var(--t1)',
                  fontSize: 13, fontFamily: 'Tajawal, sans-serif',
                  outline: 'none', cursor: pmMode === 'locked' ? 'not-allowed' : 'pointer',
                  boxSizing: 'border-box',
                }}
                value={pay.payment_mode_id}
                onChange={(e) => updatePayment(idx, { payment_mode_id: e.target.value })}
              >
                <option value="">— اختر —</option>
                {paymentModeOptions.map((pm) => (
                  <option key={pm.id} value={String(pm.id)}>{pm.label}</option>
                ))}
              </select>
            </div>

            <div>
              {idx === 0 && <Label>المبلغ</Label>}
              <input
                type="number" min={0} step={0.01}
                disabled={pmMode === 'locked'}
                style={{
                  width: '100%', padding: '7px 10px', borderRadius: 'var(--r2)',
                  border: '1px solid var(--b3)',
                  background: 'var(--bg1)', color: 'var(--t1)',
                  fontSize: 13, fontFamily: 'Tajawal, sans-serif',
                  outline: 'none', boxSizing: 'border-box',
                }}
                value={pay.amount}
                onChange={(e) => updatePayment(idx, { amount: e.target.value })}
                placeholder="0.00"
              />
              {isLast && remainingForFill > 0.01 && (
                <button
                  type="button"
                  onClick={() => updatePayment(idx, {
                    amount: String(Math.max(0, remainingForFill)),
                  })}
                  style={{
                    fontSize: 10, fontWeight: 600, color: 'var(--em)',
                    marginTop: 3, padding: 0, background: 'none',
                    border: 'none', cursor: 'pointer', textDecoration: 'underline',
                  }}
                >
                  ملء المتبقي ({fmtDZD(remainingForFill)})
                </button>
              )}
            </div>

            <div>
              {idx === 0 && <Label>المرجع</Label>}
              <input
                type="text"
                disabled={pmMode === 'locked'}
                style={{
                  width: '100%', padding: '7px 10px', borderRadius: 'var(--r2)',
                  border: `1px solid ${
                    selectedMode?.requires_reference && !pay.reference?.trim()
                      ? 'var(--red)' : 'var(--b3)'
                  }`,
                  background: 'var(--bg1)', color: 'var(--t1)',
                  fontSize: 13, fontFamily: 'Tajawal, sans-serif',
                  outline: 'none', boxSizing: 'border-box',
                }}
                value={pay.reference ?? ''}
                onChange={(e) => updatePayment(idx, { reference: e.target.value })}
                placeholder={selectedMode?.requires_reference ? 'إلزامي ★' : 'اختياري...'}
              />
            </div>

            <div>
              {idx === 0 && <Label>التاريخ</Label>}
              <input
                type="date"
                disabled={pmMode === 'locked'}
                style={{
                  width: '100%', padding: '7px 10px', borderRadius: 'var(--r2)',
                  border: '1px solid var(--b3)',
                  background: 'var(--bg1)', color: 'var(--t1)',
                  fontSize: 13, fontFamily: 'Tajawal, sans-serif',
                  outline: 'none', boxSizing: 'border-box',
                }}
                value={pay.payment_date}
                onChange={(e) => updatePayment(idx, { payment_date: e.target.value })}
              />
            </div>

            <div>
              {idx === 0 && <Label>الحساب</Label>}
              {autoTreasuryId ? (
                <div style={{
                  padding: '7px 10px', borderRadius: 'var(--r2)',
                  border: '1px solid var(--b3)', background: 'var(--bg3)',
                  fontSize: 12, height: 38, display: 'flex', alignItems: 'center', gap: 6,
                  overflow: 'hidden', boxSizing: 'border-box',
                }}>
                  {effectiveTreasury ? (
                    <>
                      <i className={`ti ${
                        effectiveTreasury.type === 'bank' ? 'ti-building-bank' :
                        effectiveTreasury.type === 'cash' ? 'ti-cash' : 'ti-credit-card'
                      }`} style={{ fontSize: 12, color: 'var(--t4)', flexShrink: 0 }} />
                      <span style={{
                        color: 'var(--t2)', fontWeight: 600,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {effectiveTreasury.name}
                      </span>
                    </>
                  ) : (
                    <span style={{ color: 'var(--t4)' }}>ح/ {autoTreasuryId}</span>
                  )}
                </div>
              ) : (
                <select
                  disabled={pmMode === 'locked'}
                  style={{
                    width: '100%', padding: '7px 10px', borderRadius: 'var(--r2)',
                    border: `1px solid ${!manualTreasuryStr ? 'var(--red)' : 'var(--b3)'}`,
                    background: 'var(--bg1)', color: 'var(--t1)',
                    fontSize: 12, fontFamily: 'Tajawal, sans-serif',
                    outline: 'none', cursor: pmMode === 'locked' ? 'not-allowed' : 'pointer',
                    height: 38, boxSizing: 'border-box',
                  }}
                  value={manualTreasuryStr}
                  onChange={(e) => updatePayment(idx, { treasury_account_id: e.target.value })}
                >
                  <option value="">— اختر حساباً ★ —</option>
                  {treasuryAccounts.map((ta) => (
                    <option key={ta.id} value={String(ta.id)}>
                      {ta.name} ({ta.type === 'bank' ? 'بنك' : ta.type === 'cash' ? 'نقدية' : 'شيك'})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {pmMode !== 'locked' && (
              <button
                onClick={() => removePayment(idx)}
                style={{
                  width: 32, height: 32, borderRadius: 'var(--r1)',
                  border: '1px solid color-mix(in srgb, var(--red) 30%, transparent)',
                  background: 'var(--redb)', color: 'var(--red)',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  alignSelf: 'flex-end',
                }}
              >
                <i className="ti ti-trash" style={{ fontSize: 13 }} />
              </button>
            )}

            {effectiveTreasury?.type === 'check' && (
              <div style={{ gridColumn: '1 / -1' }}>
                <CheckFormFields
                  checkNumber={pay.check_number}
                  checkBank={pay.check_bank}
                  checkDueDate={pay.check_due_date}
                  onChange={(fields) => updatePayment(idx, fields)}
                />
              </div>
            )}
          </div>
        );
      })}

      {pmMode !== 'locked' && (
        <button
          onClick={addPayment}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 'var(--r2)',
            border: '1px dashed var(--b3)', background: 'transparent',
            color: 'var(--t3)', cursor: 'pointer', fontSize: 12, fontWeight: 600,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--em)';
            e.currentTarget.style.color = 'var(--em)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--b3)';
            e.currentTarget.style.color = 'var(--t3)';
          }}
        >
          <i className="ti ti-plus" />
          {pmMode === 'additive' ? 'إضافة دفعة جديدة' : 'إضافة دفعة'}
        </button>
      )}
    </Section>
  );
}

```

## FILE: resources/js/pages/documents/CommercialDocumentModal/DocumentTotalsSection.tsx
```
import React from 'react';
import { Section, TotalCard, Toggle } from '../components/DocumentUIPrimitives';
import type { DocumentTotals, DocumentFormState } from '../types/document.types';
import type { PartyBalanceInfo } from '../hooks/useDocumentForm';
import { fmtDZD } from '../utils/document.utils';

interface DocumentTotalsSectionProps {
  totals: DocumentTotals;
  payments: Array<unknown>;
  partyBalance: PartyBalanceInfo | null;
  form: DocumentFormState;
  selectedParty: { name?: string } | null;
  isPurchase: boolean;
  isEdit: boolean;
  isReadOnly: boolean;
  set: (field: string, value: unknown) => void;
  stampEnabled?: boolean;
}

export default function DocumentTotalsSection({
  totals, payments,
  partyBalance, form, selectedParty,
  isPurchase, isEdit, isReadOnly, set,
  stampEnabled = true,
}: DocumentTotalsSectionProps) {
  return (
    <Section title="الإجماليات" icon="ti-calculator">
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <TotalCard label="إجمالي HT" value={`${fmtDZD(totals.ht)} دج`} />
        <TotalCard
          label="الخصم الإجمالي"
          value={`${fmtDZD(totals.discount)} دج`}
          color="var(--red)" muted={totals.discount === 0}
        />
        <TotalCard label="TVA" value={`${fmtDZD(totals.tva)} دج`} />
        <TotalCard label="إجمالي TTC" value={`${fmtDZD(totals.ttc)} دج`} bg="var(--bg3)" />
        {totals.stamp > 0 && (
          <TotalCard
            label="الطابع الجبائي" value={`${fmtDZD(totals.stamp)} دج`}
            bg="var(--goldb)" color="var(--gold)" labelColor="var(--gold)"
          />
        )}
        <TotalCard
          label="المبلغ المستحق" value={`${fmtDZD(totals.netToPay)} دج`}
          bg="var(--em)" color="white" labelColor="rgba(255,255,255,.75)" large
        />
        {payments.length > 0 && (
          <>
            <TotalCard
              label="المدفوع" value={`${fmtDZD(totals.totalPaid)} دج`}
              color="var(--green)" bg="var(--greenb)" labelColor="var(--green)"
            />
            <TotalCard
              label="المتبقي" value={`${fmtDZD(totals.remaining)} دج`}
              color={totals.remaining > 0.01 ? 'var(--red)' : 'var(--green)'}
              bg={totals.remaining > 0.01 ? 'var(--redb)' : 'var(--greenb)'}
              labelColor={totals.remaining > 0.01 ? 'var(--red)' : 'var(--green)'}
            />
          </>
        )}
      </div>

      {partyBalance && form.party_id && totals.netToPay > 0 && (
        <div style={{
          padding: '8px 12px', borderRadius: 'var(--r2)',
          background: 'var(--bg3)', border: '1px solid var(--b2)',
          fontSize: 11.5, color: 'var(--t3)', marginBottom: 10,
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        }}>
          <i className="ti ti-calculator" style={{ color: 'var(--t4)' }} />
          <span>رصيد {selectedParty?.name ?? 'المتعامل'} الحالي:</span>
          <b style={{ color: partyBalance.balance_type === 'debit' ? 'var(--green)' : 'var(--red)' }}>
            {fmtDZD(partyBalance.current_balance)} دج
            ({partyBalance.balance_type === 'debit' ? 'مدين لنا' : 'نحن مدينون'})
          </b>
          <span style={{ color: 'var(--t4)' }}>·</span>
          <span>بعد هذا المستند سيصبح:</span>
          <b style={{ color: 'var(--em)' }}>
            {fmtDZD(
              isPurchase
                ? partyBalance.signed_balance - (totals.netToPay - totals.totalPaid)
                : partyBalance.signed_balance + (totals.netToPay - totals.totalPaid),
            )} دج
          </b>
        </div>
      )}

      {stampEnabled && (
        <Toggle
          checked={form.apply_stamp}
          onChange={(v: boolean) => set('apply_stamp', v)}
          label="الطابع الجبائي"
          subLabel="1% من TTC — بحد أقصى 2,500 دج — للفواتير ≥ 30,000 دج"
          disabled={isReadOnly}
        />
      )}
    </Section>
  );
}

```

## FILE: resources/js/pages/documents/CommercialDocumentModal/index.tsx
```
import React, { useState, useMemo, useRef, useEffect, useCallback, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiPost, apiPut, apiGet, apiDelete } from '@/lib/api/core/client';
import { tenantKeys } from '@/lib/api/core/queryKeys';
import { useActiveSlug, useActiveCompany } from '@/lib/store/appStore';
import { settingsApi } from '@/lib/api/endpoints/settings';
import { useFiscalYear } from '@/context/FiscalYearContext';
import type { DocumentType } from '@/lib/api/core/types';
import { DocumentDataBuilder } from '@/pages/settings/print-settings/types/data';
import { usePrintTemplatesList, mapCompany } from '@/pages/settings/print-settings/runtime';
import { resolveTemplateById } from '@/pages/settings/print-settings/runtime/TemplateResolver';
import type { PrintTemplate } from '@/pages/settings/print-settings/types';

const TemplatePrintModal = React.lazy(() => import('@/pages/settings/print-settings/components/shared/TemplatePrintModal'));

import { useDocumentLookups }  from '../hooks/useDocumentLookups';
import { useDocumentForm }     from '../hooks/useDocumentForm';
import type { PartyChangeResult } from '../hooks/useDocumentForm';
import { useDocumentChain, useConvertDocument } from '../hooks/useDocumentChain';
import { useCreditCheck }      from '../hooks/useCreditCheck';
import { useCustomerInsights } from '../hooks/useCustomerInsights';
import { DocumentChainPanel }  from '../components/DocumentChainPanel';
import { ReturnDocumentModal } from '../components/ReturnDocumentModal';
import { BulkImportModal } from '../components/BulkImportModal';
import { ShippingInfoSection } from '../components/ShippingInfoSection';
import { PaymentTermsTable }   from '../components/PaymentTermsTable';
import { useProductSuggestions } from '../hooks/useProductSuggestions';
import { useAdvancePayments } from '../hooks/useAdvancePayments';
import type { Tab } from '../components/DocumentUIPrimitives';
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal';
import { AlertBanner, Section } from '../components/DocumentUIPrimitives';
import {
  PURCHASE_CODES, CONVERSION_MAP, RETURNABLE_CODES, SHIPPING_CODES,
} from '../types/document.types';
import type { ColKey } from '../types/document.types';
import {
  fmtDZD, loadVisibleCols, saveVisibleCols,
  toNum,
} from '../utils/document.utils';

import DocumentHeaderSection from './DocumentHeaderSection';
import DocumentInfoSection from './DocumentInfoSection';
import DocumentLinesSection from './DocumentLinesSection';
import DocumentPaymentsSection from './DocumentPaymentsSection';
import DocumentTotalsSection from './DocumentTotalsSection';
import DocumentFooter from './DocumentFooter';

// ─── Props ─────────────────────────────────────────────────────────────────────

interface CommercialDocumentModalProps {
  open:               boolean;
  documentType:       DocumentType | null;
  existingDocument?:  Record<string, unknown>;
  onClose:            () => void;
  onSaved:            () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CommercialDocumentModal({
  open,
  documentType,
  existingDocument,
  onClose,
  onSaved,
}: CommercialDocumentModalProps) {

  const slug           = useActiveSlug();
  const qc             = useQueryClient();
  const navigate       = useNavigate();
  const { selectedYear } = useFiscalYear() as { selectedYear?: { id: number; name: string } };

  const docCode    = documentType?.code ?? '';
  const isPurchase = PURCHASE_CODES.has(docCode);
  const isEdit     = !!existingDocument;

  // ─── Settings defaults ───────────────────────────────────────────────────
  const { data: settingsDict } = useQuery({
    queryKey: [slug, 'settings-dict'],
    queryFn: () => settingsApi.list(),
    enabled: !!slug,
    staleTime: 10 * 60_000,
  });

  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(
    () => loadVisibleCols(slug ?? 'default'),
  );
  const handleColsChange = (cols: Set<ColKey>) => {
    setVisibleCols(cols);
    saveVisibleCols(slug ?? 'default', cols);
  };

  const [lineMode, setLineMode] = useState<'table' | 'card'>('table');

  const initialDefaultsApplied = useRef(false);
  useEffect(() => {
    if (!settingsDict || initialDefaultsApplied.current) return;
    initialDefaultsApplied.current = true;

    const storedCols = (() => {
      try { return localStorage.getItem(`doc_visible_cols_${slug ?? 'default'}`); } catch {}
      return null;
    })();
    if (!storedCols) {
      const defaultCols = settingsDict.documents_default_visible_cols?.value as string[] | undefined;
      if (defaultCols?.length) {
        setVisibleCols(new Set(defaultCols as ColKey[]));
      }
    }

    const storedMode = (() => {
      try { return localStorage.getItem(`doc_line_mode_${slug ?? 'default'}`); } catch {}
      return null;
    })();
    if (!storedMode) {
      const defaultMode = settingsDict.documents_default_line_mode?.value as string | undefined;
      if (defaultMode === 'card' || defaultMode === 'table') {
        setLineMode(defaultMode);
      }
    }
  }, [settingsDict, slug]);

  // ─── Lookups ──────────────────────────────────────────────────────────────

  const lookups = useDocumentLookups({
    open,
    isPurchase,
    needsParty:  true,
    warehouseId:  null,
    fiscalYearId: selectedYear?.id ?? null,
  });

  // ── القيم الافتراضية من Settings (أولوية) مع الرجوع إلى اللوك أب ──────
  const settingsWarehouseId = useMemo(() => {
    const v = settingsDict?.default_warehouse_id?.value;
    if (v) {
      const found = lookups.warehouses.find((w: any) => w.id === Number(v));
      if (found) return String(found.id);
    }
    return lookups.defaultWarehouseId;
  }, [settingsDict, lookups.warehouses, lookups.defaultWarehouseId]);

  const settingsCurrencyId = useMemo(() => {
    const v = settingsDict?.default_currency_id?.value;
    if (v) {
      const found = lookups.currencies.find((c: any) => c.id === Number(v));
      if (found) return String(found.id);
    }
    return lookups.baseCurrencyId;
  }, [settingsDict, lookups.currencies, lookups.baseCurrencyId]);

  const settingsPriceLevelId = useMemo(() => {
    const v = settingsDict?.default_price_level_id?.value;
    if (v !== null && v !== undefined && v !== '' && Number(v) > 0) {
      return String(Number(v));
    }
    const defaultPl = (lookups.priceLevels as any[])?.find((pl: any) => pl.is_default);
    if (defaultPl) return String(defaultPl.id);
    const firstPl = (lookups.priceLevels as any[])?.[0];
    if (firstPl) return String(firstPl.id);
    return '';
  }, [settingsDict, lookups.priceLevels]);

  const settingsApplyStamp = useMemo(() => {
    const v = settingsDict?.default_apply_stamp?.value;
    return v === true || v === 'true';
  }, [settingsDict]);

  const lookupsReady = isEdit
    ? true
    : (settingsWarehouseId !== '' && settingsCurrencyId !== '' && settingsPriceLevelId !== '');

  // ─── Form ─────────────────────────────────────────────────────────────────

  const {
    form, errors, lineErr, apiErr, setApiErr,
    set, handlePartyChange, handlePriceLevelChange, priceLevelId,
    addLine, addLineWithProduct, removeLine, duplicateLine, updateLine,
    paymentMode: pmMode,
    payments,
    bulkAddLines,
    addPayment, addPaymentWithValues, removePayment, updatePayment,
    partyBalance, isLoadingBalance,
    totals, validate, buildPayload,
    updateStockData,
    needsParty, affectsStock, stockDir,
    isReadOnly, isLinesReadOnly,
    lineWarnings,
    priceLevelSwitchMsg,
    clearPriceLevelSwitchMsg,
  } = useDocumentForm({
    documentType,
    existingDocument,
    defaultTvaRate:     lookups.defaultTvaRate,
    defaultWarehouseId: settingsWarehouseId,
    baseCurrencyId:     settingsCurrencyId,
    defaultPriceLevelId: settingsPriceLevelId,
    defaultApplyStamp:   settingsApplyStamp,
    stampEnabled:        settingsApplyStamp,
    selectedYearId:     selectedYear?.id ? String(selectedYear.id) : '',
    paymentModes:       lookups.paymentModes,
    parties:            lookups.parties,
    products:           lookups.products,
    stockData:          {},
    isPurchase,
    open,
    priceLevels:        lookups.priceLevels,
  });

  // ─── حالة المستند ─────────────────────────────────────────────────────────

  const docStatusName = String(
    (existingDocument?.document_status as Record<string, unknown> | undefined)?.name
    ?? existingDocument?.status
    ?? '',
  ).toLowerCase();

  const isLocked    = !!(existingDocument?.is_locked);
  const isCancelled = docStatusName === 'cancelled' || docStatusName === 'returned';
  const VALIDATED_STATUSES = new Set(['validated', 'paid', 'partially_paid', 'overdue']);
  const isValidated = !isLocked && !isCancelled && VALIDATED_STATUSES.has(docStatusName);

  // ─── Stock query ──────────────────────────────────────────────────────────

  const warehouseIdNum = form.warehouse_id ? parseInt(form.warehouse_id) : null;
  const { data: stockData = {} } = useQuery<Record<number, number>>({
    queryKey: [slug, 'warehouse-stock', warehouseIdNum, selectedYear?.id],
    queryFn:  () =>
      apiGet<unknown[]>('/inventory/stock-at', {
        warehouse_id:   warehouseIdNum,
        fiscal_year_id: selectedYear?.id,
      }).then((rows) =>
        Object.fromEntries(
          (rows as Array<{ id: number; current_stock: number }>)
            .map((r) => [r.id, r.current_stock ?? 0]),
        ),
      ),
    enabled:   !!slug && !!warehouseIdNum && !isPurchase,
    staleTime: 2 * 60_000,
  });

  useEffect(() => { updateStockData(stockData); }, [stockData, updateStockData]);

  // ─── Document number ──────────────────────────────────────────────────────

  const [docNumber,         setDocNumber]         = useState('');
  const [docNumberErr,      setDocNumberErr]       = useState('');
  const [checkingDocNumber, setCheckingDocNumber]  = useState(false);

  useEffect(() => {
    setDocNumber(isEdit && existingDocument?.document_number
      ? String(existingDocument.document_number)
      : '');
  }, [isEdit, existingDocument?.document_number, open]);

  const checkDocNumberMut = useMutation({
    mutationFn: async (number: string) => {
      if (!slug || !documentType?.id || !number) return { exists: false };
      return apiGet<{ exists: boolean }>('/documents/check-number', {
        document_number:  number,
        document_type_id: documentType.id,
        exclude_id:       isEdit ? existingDocument?.id : undefined,
      });
    },
  });

  const handleDocNumberChange = async (newNum: string) => {
    setDocNumber(newNum);
    setDocNumberErr('');
    if (!newNum.trim()) { setDocNumberErr('رقم المستند إلزامي'); return; }
    setCheckingDocNumber(true);
    try {
      const result = await checkDocNumberMut.mutateAsync(newNum);
      if (result.exists) setDocNumberErr('رقم المستند موجود بالفعل');
    } catch { /* ignore */ }
    finally { setCheckingDocNumber(false); }
  };

  // ─── تحذير تغيير المتعامل ─────────────────────────────────────────────────

  const [partyChangeWarning, setPartyChangeWarning] = useState<{
    message:   string;
    blockType: PartyChangeResult['blockType'];
  } | null>(null);

  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [extraTab, setExtraTab] = useState('shipping');

  // ─── Document chain ───────────────────────────────────────────────────────
  const { data: chain, isLoading: isLoadingChain } = useDocumentChain(
    isEdit ? Number(existingDocument?.id) : null,
  );
  const convertMutation = useConvertDocument();

  const { data: docTypes = [] } = useQuery({
    queryKey: [slug, 'document-types'],
    queryFn:  () => apiGet<DocumentType[]>('/document-types', { per_page: 500 })
      .then(r => (Array.isArray(r) ? r : (r as unknown as { data: DocumentType[] })?.data ?? [])),
    staleTime: 10 * 60_000,
    enabled:   !!slug,
  });

  const targetCodes  = CONVERSION_MAP[docCode] ?? [];
  const allowedTargets = useMemo(() =>
    targetCodes.map(code => {
      const dt = docTypes.find(d => d.code === code);
      return { code, name: dt?.name ?? code };
    }),
    [targetCodes, docTypes],
  );

  // ─── Credit check ─────────────────────────────────────────────────────────
  const { data: creditCheck, isLoading: isLoadingCredit } = useCreditCheck({
    partyId:    form.party_id ? parseInt(form.party_id) : null,
    amount:     totals.netToPay,
    date:       form.document_date,
    isPurchase,
    enabled:    open && needsParty && !isPurchase,
  });

  const { data: customerInsights, isLoading: isLoadingInsights } = useCustomerInsights(
    form.party_id ? parseInt(form.party_id) : null,
    !!open && needsParty && !!form.party_id,
  );

  const { data: productSuggestions, isLoading: isLoadingSuggestions } = useProductSuggestions(
    form.party_id ? parseInt(form.party_id) : null,
    isPurchase,
    !!open && needsParty && !!form.party_id && !isLinesReadOnly,
  );

  const { data: advancePayments, isLoading: isLoadingAdvances } = useAdvancePayments(
    form.party_id ? parseInt(form.party_id) : null,
    !!open && needsParty && !!form.party_id && (documentType?.affects_accounting ?? false),
  );

  const handlePartyChangeWithWarning = (id: string) => {
    setPartyChangeWarning(null);
    const result = handlePartyChange(id);
    if (result.blocked) {
      setPartyChangeWarning({
        message:   result.reason ?? 'لا يمكن تغيير المتعامل الآن',
        blockType: result.blockType,
      });
    }
  };

  // ─── Success state ────────────────────────────────────────────────────────

  const [successMsg, setSuccessMsg] = useState('');
  const successTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => { if (successTimer.current) clearTimeout(successTimer.current); }, []);

  // ─── Template-based printing ──────────────────────────────────────────────

  const companyInfo = mapCompany(useActiveCompany());

  const { data: printTemplates = [] } = usePrintTemplatesList(docCode);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const selectedTemplate = useMemo(() => {
    if (selectedTemplateId) return resolveTemplateById(printTemplates, selectedTemplateId);
    return printTemplates[0] || null;
  }, [selectedTemplateId, printTemplates]);

  const [printModalOpen, setPrintModalOpen] = useState(false);

  const handlePrint = useCallback(() => {
    if (!existingDocument || !companyInfo) return;
    setPrintModalOpen(true);
  }, [existingDocument, companyInfo]);

  // ─── Delete confirmation modal ────────────────────────────────────────────
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // تنظيف حالة الـ sub-modals عند الإغلاق — منع الوميض
  useEffect(() => {
    if (!open) {
      setShowDeleteModal(false);
      setShowReturnModal(false);
      setShowBulkImport(false);
    }
  }, [open]);

  // ── Auto-dismiss price level switch notification ──────────────────────────
  useEffect(() => {
    if (!priceLevelSwitchMsg) return;
    const t = setTimeout(clearPriceLevelSwitchMsg, 6000);
    return () => clearTimeout(t);
  }, [priceLevelSwitchMsg, clearPriceLevelSwitchMsg]);

  // ─── Smart Memory — حفظ مسودة تلقائي ──────────────────────────────────────
  const draftKey = `doc-draft-${slug ?? 'default'}-${documentType?.code ?? 'new'}`;
  useEffect(() => {
    if (!open || !form.lines.length) return;
    const interval = setInterval(() => {
      try {
        const draft = { ...form, _savedAt: Date.now() };
        localStorage.setItem(draftKey, btoa(unescape(encodeURIComponent(JSON.stringify(draft)))));
      } catch { /* localStorage full */ }
    }, 30_000);
    return () => clearInterval(interval);
  }, [open, form, draftKey]);

  const restoreDraft = () => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return null;
      const draft = JSON.parse(decodeURIComponent(escape(atob(raw))));
      if (!draft.lines?.length) return null;
      const elapsed = Date.now() - (draft._savedAt ?? 0);
      if (elapsed > 86_400_000) { localStorage.removeItem(draftKey); return null; }
      return draft;
    } catch { return null; }
  };

  const savedDraft = !isEdit && open && !form.lines.length ? restoreDraft() : null;

  // ─── Mutations ────────────────────────────────────────────────────────────

  const saveMut = useMutation({
    mutationFn: () => {
      const payload = buildPayload();

      const url = isEdit ? `/documents/${existingDocument!.id}` : '/documents';
      if (isEdit && docNumber) {
        (payload as Record<string, unknown>).document_number = docNumber;
      }
      return isEdit
        ? apiPut<Record<string, unknown>>(url, payload)
        : apiPost<Record<string, unknown>>(url, payload);
    },
    onSuccess: (savedDoc) => {
      if (slug) {
        qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
        if (affectsStock) {
          qc.invalidateQueries({ queryKey: tenantKeys.inventory.all(slug) });
        }
        if (form.party_id) {
          qc.invalidateQueries({ queryKey: [slug, 'party-balance', parseInt(form.party_id)] });
        }
      }
      const docNum = String((savedDoc as Record<string, unknown>)?.document_number ?? '—');
      setSuccessMsg(isEdit ? `تم تحديث المستند ${docNum}` : `تم إنشاء المستند ${docNum} ✓`);
      navigator.clipboard?.writeText(docNum).catch(() => {});
      successTimer.current = setTimeout(() => {
        setSuccessMsg('');
        onSaved();
        onClose();
      }, 3000);
    },
    onError: (e: unknown) => {
      const err = e as Record<string, unknown>;
      const errMsg = err?.message ?? 'حدث خطأ أثناء الحفظ';
      const validationErrors = (err as Record<string, unknown>)?.errors as Record<string, string[]> | undefined;
      if (validationErrors) {
        const firstMsg = Object.values(validationErrors).flat()[0];
        setApiErr(firstMsg ?? String(errMsg));
      } else {
        setApiErr(String(errMsg));
      }
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => apiDelete(`/documents/${existingDocument!.id}`),
    onSuccess: () => {
      if (slug) qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
      setSuccessMsg('تم حذف المستند بنجاح');
      successTimer.current = setTimeout(() => {
        setSuccessMsg(''); onSaved(); onClose();
      }, 1500);
    },
    onError: (e: unknown) => {
      const err = e as Record<string, unknown>;
      setApiErr(String(err?.message ?? 'لا يمكن حذف هذا المستند — استخدم الإلغاء بدلاً من الحذف'));
    },
  });

  const handleSave = () => {
    setApiErr('');
    if (isReadOnly) return;
    if (isEdit && !docNumber.trim()) {
      setDocNumberErr('رقم المستند إلزامي'); return;
    }
    if (docNumberErr) { setApiErr('رجاء التحقق من رقم المستند'); return; }
    if (creditCheck?.will_exceed) {
      if (!creditCheck.can_proceed) {
        setApiErr('تجاوز حد الائتمان — يتطلب موافقة المدير');
        return;
      }
      if (!window.confirm(`تجاوز حد الائتمان بـ ${fmtDZD(creditCheck.exceed_by)} دج — هل تريد المتابعة؟`)) return;
    }
    if (validate()) saveMut.mutate();
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const handleExport = (format: 'excel' | 'pdf' | 'json' | 'xml') => {
    const formData = {
      documentNumber: docNumber,
      documentDate: form.document_date,
      dueDate: form.due_date,
      party: lookups.parties.find(p => String(p.id) === form.party_id)?.name ?? '',
      notes: form.notes,
      lines: form.lines.map((l, i) => ({
        line: i + 1,
        product: l.description || l._product?.name || '',
        quantity: l.quantity * (l._packQty || 1),
        unitPrice: l.unit_price_ht,
        total: l.quantity * (l._packQty || 1) * l.unit_price_ht,
        tva: l.tva_rate,
      })),
      totals: {
        ht: totals.ht,
        tva: totals.tva,
        ttc: totals.ttc,
        stamp: totals.stamp,
        netToPay: totals.netToPay,
      },
    };

    if (format === 'excel') {
      void import('exceljs').then((ExcelJS) => {
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Document');
        ws.addRow(['البيان', 'الكمية', 'سعر الوحدة', 'الإجمالي', 'TVA']);
        formData.lines.forEach(l => ws.addRow([l.product, l.quantity, l.unitPrice, l.total, l.tva]));
        ws.addRow([]);
        ws.addRow(['Net HT', formData.totals.ht]);
        ws.addRow(['TVA', formData.totals.tva]);
        ws.addRow(['TTC', formData.totals.ttc]);
        wb.xlsx.writeBuffer().then(buf => {
          const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url;
          a.download = `${formData.documentNumber || 'document'}.xlsx`;
          a.click(); URL.revokeObjectURL(url);
        });
      });
    } else if (format === 'pdf') {
      window.print();
    } else if (format === 'json') {
      const blob = new Blob([JSON.stringify(formData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `${formData.documentNumber || 'document'}.json`;
      a.click(); URL.revokeObjectURL(url);
    } else if (format === 'xml') {
      const toXml = (obj: unknown, tag: string): string => {
        if (Array.isArray(obj)) return obj.map(v => toXml(v, tag)).join('\n');
        if (typeof obj === 'object' && obj !== null) {
          const children = Object.entries(obj as Record<string, unknown>)
            .map(([k, v]) => toXml(v, k)).join('\n');
          return `<${tag}>\n${children}\n</${tag}>`;
        }
        return `<${tag}>${String(obj)}</${tag}>`;
      };
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<document>\n${toXml(formData, 'data')}\n</document>`;
      const blob = new Blob([xml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `${formData.documentNumber || 'document'}.xml`;
      a.click(); URL.revokeObjectURL(url);
    }
  };

  const isPending = saveMut.isPending || deleteMut.isPending || checkingDocNumber;

  // ─── Memos ────────────────────────────────────────────────────────────────

  const isPartyExempt = lookups.parties.find(
    (p) => String(p.id) === form.party_id,
  )?.is_tva_exempt ?? false;

  const partyOptions = useMemo(() =>
    lookups.parties.map((p) => ({
      id:    p.id,
      label: p.name,
      sub:   [(p as Record<string, unknown>).code, (p as Record<string, unknown>).phone].filter(Boolean).join(' · '),
      badge: (p as Record<string, unknown>).is_tva_exempt ? 'معفى' : (p as Record<string, unknown>).price_level?.name,
    })),
    [lookups.parties],
  );

  const priceLevelOptions = useMemo(() =>
    lookups.priceLevels.map((pl) => ({
      id:    Number(pl.id),
      label: String(pl.name),
    })),
    [lookups.priceLevels],
  );

  const paymentModeOptions = useMemo(() =>
    lookups.paymentModes.map((pm) => ({
      id:                  pm.id,
      label:               pm.name,
      treasury_account_id: pm.treasury_account_id,
      requires_reference:  pm.requires_reference,
    })),
    [lookups.paymentModes],
  );

  const treasuryAccountMap = useMemo(
    () => new Map(lookups.treasuryAccounts.map((ta) => [ta.id, ta])),
    [lookups.treasuryAccounts],
  );

  const selectedParty = useMemo(
    () => lookups.parties.find((p) => String(p.id) === form.party_id),
    [lookups.parties, form.party_id],
  );

  const stockBadge = useMemo(() => {
    if (!affectsStock) return null;
    return stockDir > 0
      ? { text: 'يضيف مخزون', bg: 'var(--greenb)', color: 'var(--green)' }
      : { text: 'يخصم مخزون', bg: 'var(--redb)',   color: 'var(--red)'   };
  }, [affectsStock, stockDir]);

  const paymentsExceedWarning = useMemo(() => {
    const allPaid = payments.reduce((acc, p) => acc + toNum(p.amount), 0);
    if (allPaid > totals.netToPay + 0.01 && totals.netToPay > 0) {
      return `مجموع الدفعات (${fmtDZD(allPaid)} دج) يتجاوز المبلغ المستحق (${fmtDZD(totals.netToPay)} دج)`;
    }
    return null;
  }, [payments, totals.netToPay]);

  const balanceWarning = useMemo(() => {
    if (!partyBalance || partyBalance.current_balance <= 0) return null;
    if (partyBalance.balance_type !== 'debit') return null;
    if (totals.netToPay <= 0) return null;
    if (partyBalance.current_balance > totals.netToPay * 2) {
      return `رصيد ${selectedParty?.name ?? 'المتعامل'} المتراكم (${fmtDZD(partyBalance.current_balance)} دج) كبير — تأكد من تسوية الحسابات`;
    }
    return null;
  }, [partyBalance, totals.netToPay, selectedParty]);

  // ─── Guard ────────────────────────────────────────────────────────────────

  const modalContent = !lookupsReady ? (
    <div style={{
      width: '95vw', maxWidth: 1100, maxHeight: '93vh',
      background: 'var(--bg1)', borderRadius: 'var(--r3)',
      boxShadow: '0 24px 60px rgba(0,0,0,.3)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 12, padding: 48,
    }}>
      <i className="ti ti-loader-2" style={{
        fontSize: 32, color: 'var(--em)',
        animation: 'spin 0.8s linear infinite',
      }} />
      <span style={{ fontSize: 13, color: 'var(--t3)' }}>
        {documentType?.name ?? 'جاري التحميل'}...
      </span>
    </div>
  ) : (<>
      <div style={{
        width: '95vw', maxWidth: 1100, maxHeight: '93vh',
        display: 'flex', flexDirection: 'column',
        background: isCancelled ? 'var(--bg3)' : 'var(--bg1)',
        borderRadius: 'var(--r3)',
        boxShadow: '0 24px 60px rgba(0,0,0,.3)',
        overflow: 'hidden',
        opacity: isCancelled ? 0.8 : 1,
      }}>

        {/* ═══ HEADER ═══ */}
        <DocumentHeaderSection
          documentType={documentType}
          isEdit={isEdit}
          isCancelled={isCancelled}
          isLocked={isLocked}
          isValidated={isValidated}
          isPurchase={isPurchase}
          docCode={docCode}
          docNumber={docNumber}
          existingDocument={existingDocument}
          pmMode={pmMode}
          stockBadge={stockBadge}
          onClose={onClose}
          isPending={isPending}
        />

        {/* ═══ BODY ═══ */}
        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>

          {/* Alerts عامة */}
          {successMsg         && <AlertBanner type="success" message={successMsg} />}
          {apiErr             && <AlertBanner type="error"   message={apiErr} />}
          {priceLevelSwitchMsg && (
            <AlertBanner
              type="warning"
              message={`المنتج "${priceLevelSwitchMsg.productName}" ليس له سعر في فئة "${priceLevelSwitchMsg.from}"، تم التبديل إلى "${priceLevelSwitchMsg.to}".`}
            />
          )}
          {isCancelled        && <AlertBanner type="error"   message="هذا المستند ملغى — جميع الحقول معطلة." />}
          {isLocked && !isCancelled && (
            <AlertBanner type="warning" message="هذا المستند مقفل. لا يمكن تعديله حتى يتم فك القفل من قِبل المسؤول." />
          )}
          {pmMode === 'additive' && !isLocked && (
            <AlertBanner
              type="info"
              message="المستند معتمد — الأسطر محمية من التعديل. يمكنك فقط إضافة دفعات جديدة."
            />
          )}

          {/* سلسلة المستندات */}
          {isEdit && (
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
                onClose();
                navigate(`?document=${docId}`, { replace: true });
              }}
            />
          )}

          {/* تحذير تغيير المتعامل */}
          {partyChangeWarning && (
            <div style={{
              padding: '10px 14px', marginBottom: 14,
              borderRadius: 'var(--r2)',
              background: 'color-mix(in srgb, var(--orange) 10%, transparent)',
              border: '1px solid var(--orange)',
              fontSize: 12.5, color: 'var(--orange)',
              display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              <i className="ti ti-alert-triangle" style={{ marginTop: 1, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, marginBottom: 3 }}>
                  {partyChangeWarning.blockType === 'existing_payments' && 'دفعات مُسجَّلة في المستند'}
                  {partyChangeWarning.blockType === 'has_payments'      && 'دفعات في النموذج'}
                  {partyChangeWarning.blockType === 'price_level_change' && 'تعارض فئة السعر'}
                  {!partyChangeWarning.blockType                         && 'لا يمكن تغيير المتعامل'}
                </div>
                <div>{partyChangeWarning.message}</div>
              </div>
              <button
                onClick={() => setPartyChangeWarning(null)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--orange)', padding: 0, fontSize: 13, flexShrink: 0,
                }}
              >
                <i className="ti ti-x" />
              </button>
            </div>
          )}

          {/* ═══ SECTION 1: معلومات المستند ═══ */}
          <DocumentInfoSection
            form={form as unknown as Record<string, unknown>}
            errors={errors}
            set={set}
            isEdit={isEdit}
            isReadOnly={isReadOnly}
            isLinesReadOnly={isLinesReadOnly}
            isPurchase={isPurchase}
            needsParty={needsParty}
            docCode={docCode}
            docNumber={docNumber}
            docNumberErr={docNumberErr}
            checkingDocNumber={checkingDocNumber}
            handleDocNumberChange={handleDocNumberChange}
            handlePartyChangeWithWarning={handlePartyChangeWithWarning}
            partyOptions={partyOptions}
            priceLevelOptions={priceLevelOptions}
            handlePriceLevelChange={handlePriceLevelChange}
            lookups={{
              warehouses: lookups.warehouses,
              fiscalYears: lookups.fiscalYears,
              currencies: lookups.currencies,
              priceLevels: lookups.priceLevels,
            }}
            partyBalance={partyBalance}
            isLoadingBalance={isLoadingBalance}
            selectedParty={selectedParty}
            creditCheck={creditCheck as Record<string, unknown> | null}
            isLoadingCredit={isLoadingCredit}
            customerInsights={customerInsights as Record<string, unknown> | null}
            isLoadingInsights={isLoadingInsights}
            balanceWarning={balanceWarning}
            qc={qc}
            slug={slug}
            warehouseIdNum={warehouseIdNum}
          />

          {/* ═══ EXTRA TABS: الشحن والتسليم + شروط الدفع — مطوية افتراضياً ═══ */}
          {(() => {
            const extraTabs: Tab[] = [
              { key: 'payment-terms', label: 'شروط الدفع', icon: 'ti-coin' },
            ];
            if (SHIPPING_CODES.has(docCode)) {
              extraTabs.unshift({ key: 'shipping', label: 'الشحن والتسليم', icon: 'ti-truck-delivery' });
            }
            const single = extraTabs.length === 1 ? extraTabs[0] : null;

            return (
              <Section
                title={single ? single.label : 'الشحن وشروط الدفع'}
                icon={single ? single.icon : 'ti-truck-delivery'}
                collapsible
                defaultOpen={false}
              >
                {!single && (
                  <div style={{
                    display: 'flex', gap: 4, marginBottom: 14,
                    borderBottom: '1px solid var(--b1)',
                  }}>
                    {extraTabs.map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setExtraTab(tab.key)}
                        style={{
                          padding: '6px 14px', borderRadius: 'var(--r1) var(--r1) 0 0',
                          border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                          background: extraTab === tab.key ? 'var(--bg1)' : 'transparent',
                          color: extraTab === tab.key ? 'var(--em)' : 'var(--t3)',
                          borderBottom: extraTab === tab.key ? '2px solid var(--em)' : '2px solid transparent',
                          display: 'flex', alignItems: 'center', gap: 5,
                        }}
                      >
                        <i className={`ti ${tab.icon}`} style={{ fontSize: 13 }} />
                        {tab.label}
                      </button>
                    ))}
                  </div>
                )}
                {(single ? single.key : extraTab) === 'shipping' ? (
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
              </Section>
            );
          })()}

          {/* ═══ SECTION 2: الأسطر ═══ */}
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
            slug={slug}
            affectsStock={affectsStock}
            stockDir={stockDir}
            warehouses={lookups.warehouses}
          />

          {/* ═══ SECTION 3: الدفعات ═══ */}
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
            affectsAccounting={documentType?.affects_accounting ?? false}
        />

          {/* ═══ SECTION 4: الإجماليات ═══ */}
          <DocumentTotalsSection
            totals={totals}
            payments={payments}
            partyBalance={partyBalance}
            form={form}
            selectedParty={selectedParty}
            isPurchase={isPurchase}
            isEdit={isEdit}
            isReadOnly={isReadOnly}
            set={set}
            stampEnabled={settingsApplyStamp}
          />
        </div>

        {/* ═══ FOOTER ═══ */}
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
      {/* Bulk import */}
      <BulkImportModal
        open={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        products={lookups.products}
        onImport={(importedLines) => {
          bulkAddLines(importedLines);
        }}
      />

      {/* Modal المرتجع */}
      {showReturnModal && existingDocument && (
        <ReturnDocumentModal
          document={existingDocument}
          onCreated={(returnDoc) => {
            setShowReturnModal(false);
            const num = String((returnDoc as Record<string, unknown>).document_number ?? '');
            setSuccessMsg(`تم إنشاء المرتجع ${num} ✓`);
            if (slug) {
              qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
            }
            setTimeout(() => { setSuccessMsg(''); onSaved(); onClose(); }, 1800);
          }}
          onClose={() => setShowReturnModal(false)}
        />
      )}

      {/* تأكيد الحذف */}
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

      {/* طباعة حسب القالب */}
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
    </>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER — حاوية دائمة في DOM مع تحكم CSS بالظهور
  // ════════════════════════════════════════════════════════════════════════════

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      direction: 'rtl',
      pointerEvents: open ? 'auto' : 'none' as any,
      opacity: open ? 1 : 0,
      background: open ? 'rgba(0,0,0,.45)' : 'transparent',
      backdropFilter: open ? 'blur(3px)' : 'none',
      transition: 'opacity .25s, background .25s',
    }}>
      {modalContent}
    </div>
  );
}

```

## FILE: resources/js/pages/documents/CommercialDocumentModal/PartyBalanceBadge.tsx
```
import React from 'react';
import { fmtDZD } from '../utils/document.utils';
import type { PartyBalanceInfo } from '../hooks/useDocumentForm';

export default function PartyBalanceBadge({
  balance,
  isLoading,
  partyLabel,
}: {
  balance: PartyBalanceInfo | null;
  isLoading: boolean;
  partyLabel: string;
}) {
  if (isLoading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 10px', borderRadius: 'var(--r2)',
        background: 'var(--bg3)', border: '1px solid var(--b2)',
        fontSize: 11, color: 'var(--t4)', marginTop: 6,
      }}>
        <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite', fontSize: 12 }} />
        جاري تحميل رصيد {partyLabel}...
      </div>
    );
  }

  if (!balance) return null;

  const isDebit = balance.balance_type === 'debit';
  const color = isDebit ? 'var(--green)' : 'var(--red)';
  const bg = isDebit ? 'var(--greenb)' : 'var(--redb)';
  const icon = isDebit ? 'ti-trending-up' : 'ti-trending-down';
  const typeLabel = isDebit ? 'مدين لنا' : 'نحن مدينون';

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6, alignItems: 'center',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 10px', borderRadius: 'var(--r2)',
        background: bg, border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
        fontSize: 12,
      }}>
        <i className={`ti ${icon}`} style={{ color, fontSize: 13 }} />
        <span style={{ color: 'var(--t3)' }}>رصيد {partyLabel}:</span>
        <span style={{ fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>
          {fmtDZD(balance.current_balance)} دج
        </span>
        <span style={{
          padding: '1px 6px', borderRadius: 99, fontSize: 10, fontWeight: 700,
          background: color, color: 'white',
        }}>
          {typeLabel}
        </span>
      </div>

      <div style={{
        display: 'flex', gap: 8, fontSize: 10.5, color: 'var(--t4)', flexWrap: 'wrap',
      }}>
        <span>رصيد افتتاحي: <b>{fmtDZD(balance.opening_balance)}</b></span>
        <span>·</span>
        <span>مستندات: <b>{fmtDZD(balance.documents_balance)}</b></span>
        <span>·</span>
        <span>دفعات: <b>{fmtDZD(balance.payments_total)}</b></span>
      </div>
    </div>
  );
}

```

## FILE: resources/js/pages/documents/CommercialDocumentsPage.tsx
```
// ════════════════════════════════════════════════════════════════════════════
// pages/documents/CommercialDocumentsPage.tsx  —  v10.4
//
// ✅ جديد في v10.4:
//   • إزالة validateMut و deleteMut (المستند معتمد فور الإنشاء)
//   • إضافة unlockMut — فتح القفل متاح للمستندات غير المُصدَّرة
//   • cancelMut يرسل cancellation_reason
//   • getRowPermissions() — helper خارجي لحساب الصلاحيات
//   • عمود is_locked مرئي افتراضياً + نقر مزدوج للتبديل
//   • contextMenuItems: كتلة "table" للقفل/فتح الجماعي
//   • STATUS_CFG مُبسَّط: validated + cancelled فقط
//   • isExpandable: كل المستندات قابلة للتوسع
//
// ✅ محفوظ من v10.3:
//   • useColumnStatePersistence — مفتاح localStorage واحد
//   • smartFilterPatterns={ERP_FILTER_PATTERNS} مُفعَّل
//   • DataTableErrorBoundary يلف الجدول
// ════════════════════════════════════════════════════════════════════════════

import React, {
    useState,
    useCallback,
    useMemo,
    useEffect,
    useRef,
} from "react";
import { useParams } from "react-router-dom";
import {
    useQuery,
    useMutation,
    useQueryClient,
    keepPreviousData,
} from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api/core/client";
import { tenantKeys } from "@/lib/api/core/queryKeys";
import { useActiveSlug } from "@/lib/store/appStore";
import { useFiscalYear } from "@/context/FiscalYearContext";
import { DataTable, DataTableErrorBoundary } from "@/components/ui/DataTable";
import type {
    Column,
    MultiSortState,
    ConditionalFormat,
    ContextMenuItem,
    ContextMenuContext,
} from "@/components/ui/DataTable";
import { useColumnStatePersistence } from "@/components/ui/DataTable";
import CommercialDocumentModal from "./CommercialDocumentModal";
import QuickSaleModal from "./QuickSaleModal";
import { DeliveryProgressBar } from "./components/DeliveryProgressBar";
import ConvertDocumentModal from "./components/ConvertDocumentModal";
import BatchPrintModal from "./components/BatchPrintModal";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import type { DocumentType, CommercialDocument } from "@/lib/api/core/types";

// أنماط SmartFilter الخاصة بالمشروع (مفصولة عن library)
import { ERP_FILTER_PATTERNS } from "@/lib/datatable-patterns";

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

const SALE_CODES     = new Set(["FV", "BL", "DEV", "BCC", "AV"]);
const PURCHASE_CODES = new Set(["FA", "BR", "DDP", "BCF", "AA"]);

const STATUS_CFG = {
    draft:          { label: "مسودة",    color: "#6b7280", bg: "#f3f4f6", dot: "#9ca3af" },
    pending:        { label: "قيد الانتظار", color: "#f59e0b", bg: "#fffbeb", dot: "#fbbf24" },
    validated:      { label: "معتمد",    color: "#2563eb", bg: "#eff6ff", dot: "#3b82f6" },
    partially_paid: { label: "مدفوع جزئياً", color: "#8b5cf6", bg: "#f5f3ff", dot: "#a78bfa" },
    paid:           { label: "مدفوع",    color: "#16a34a", bg: "#f0fdf4", dot: "#22c55e" },
    overdue:        { label: "متأخر",    color: "#dc2626", bg: "#fef2f2", dot: "#fca5a5" },
    cancelled:      { label: "ملغي",     color: "#dc2626", bg: "#fef2f2", dot: "#fca5a5" },
    returned:       { label: "مرتجع",    color: "#8b5cf6", bg: "#f5f3ff", dot: "#a78bfa" },
} as const;

type StatusKey = keyof typeof STATUS_CFG;

// ════════════════════════════════════════════════════════════════════════════
// PURE HELPERS
// ════════════════════════════════════════════════════════════════════════════

function fmtDate(d?: string | null): string {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("ar-DZ", {
        year: "numeric", month: "2-digit", day: "2-digit",
    });
}

/** تاريخ + وقت كامل (ساعة:دقيقة:ثانية) — لأعمدة created_at / updated_at / validated_at */
function fmtDateTime(d?: string | null): string {
    if (!d) return "—";
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "—";
    const date = dt.toLocaleDateString("ar-DZ", { year: "numeric", month: "2-digit", day: "2-digit" });
    const time = dt.toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
    return `${date} ${time}`;
}

function fmtMoney(n?: number | string | null): string {
    const v = parseFloat(String(n ?? 0));
    if (isNaN(v)) return "—";
    return v.toLocaleString("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getDocStatus(doc: CommercialDocument): string {
    return (
        ((doc.document_status as Record<string, unknown> | undefined)?.name as string) ??
        ((doc as unknown as Record<string, unknown>).status as string) ??
        "draft"
    );
}

function getPartyName(doc: CommercialDocument): string {
    return ((doc.party as Record<string, unknown> | undefined)?.name as string) ?? "";
}

function getWarehouseName(doc: CommercialDocument): string {
    return ((doc.warehouse as Record<string, unknown> | undefined)?.name as string) ?? "";
}

// ════════════════════════════════════════════════════════════════════════════
// MICRO COMPONENTS
// ════════════════════════════════════════════════════════════════════════════

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CFG[status as StatusKey] ?? STATUS_CFG.draft;
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700,
            color: cfg.color, background: cfg.bg,
            border: `1px solid color-mix(in srgb, ${cfg.color} 22%, transparent)`,
            whiteSpace: "nowrap",
        }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
            {cfg.label}
        </span>
    );
}

function MoneyCell({ value, bold, accent }: { value?: number | string | null; bold?: boolean; accent?: string }) {
    const v = parseFloat(String(value ?? 0));
    if (isNaN(v) || v === 0) return <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
    return (
        <span style={{
            direction: "ltr", display: "inline-block",
            fontVariantNumeric: "tabular-nums",
            fontWeight: bold ? 800 : 400, color: accent ?? "var(--t2)",
        }}>
            {fmtMoney(v)}
            <span style={{ fontSize: 10, marginRight: 3, color: "var(--t4)" }}>دج</span>
        </span>
    );
}

/** Avatar بسيط + اسم — لعرض المستخدم في أعمدة created_by / validated_by */
function UserChip({ name, color = "var(--primary)" }: { name: string; color?: string }) {
    if (!name) return <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
                width: 22, height: 22, borderRadius: "50%",
                background: `color-mix(in srgb, ${color} 15%, transparent)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 800, color, flexShrink: 0,
            }}>
                {name.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: 12, color: "var(--t2)" }}>{name}</span>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// SUMMARY CARDS
// ════════════════════════════════════════════════════════════════════════════

function SummaryCards({ items = [], opColor }: { items: CommercialDocument[]; opColor: string }) {
    const stats = useMemo(() => ({
        count:    items.length,
        totalHt:  items.reduce((s, d) => s + (Number(d.total_ht) || 0), 0),
        totalTtc: items.reduce((s, d) => s + (Number(d.total_ttc) || 0), 0),
        unpaid:   items.filter(d => {
            const rem = Number((d as unknown as Record<string, unknown>).remaining_amount ?? 0);
            return rem > 0.001;
        }).length,
    }), [items]);

    const cards = [
        { icon: "ti-file-text",         label: "عدد المستندات", value: stats.count.toLocaleString("ar-DZ"),       accent: opColor },
        { icon: "ti-currency-dinar",     label: "HT (الصفحة)",   value: fmtMoney(stats.totalHt) + " دج",           accent: "var(--blue)", ltr: true },
        { icon: "ti-receipt",            label: "TTC (الصفحة)",  value: fmtMoney(stats.totalTtc) + " دج",          accent: opColor, ltr: true },
        { icon: "ti-clock-exclamation",  label: "غير مسدد",      value: stats.unpaid.toLocaleString("ar-DZ"),       accent: stats.unpaid > 0 ? "var(--red)" : "var(--t4)" },
    ] as const;

    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            {cards.map(c => (
                <div key={c.label} style={{
                    padding: "12px 16px", background: "var(--bg1)",
                    border: "1px solid var(--b1)", borderRadius: "var(--r2)",
                    borderTop: `3px solid ${c.accent}`,
                    display: "flex", alignItems: "center", gap: 12,
                }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        background: `color-mix(in srgb, ${c.accent} 12%, transparent)`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                        <i className={`ti ${c.icon}`} style={{ fontSize: 17, color: c.accent }} aria-hidden="true" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 10, color: "var(--t4)", fontWeight: 700, marginBottom: 2, whiteSpace: "nowrap" }}>
                            {c.label}
                        </div>
                        <div style={{
                            fontSize: 14, fontWeight: 800, color: "var(--t1)",
                            direction: (c as { ltr?: boolean }).ltr ? "ltr" : "rtl",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                            {c.value}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// EXPANDED LINES
// ════════════════════════════════════════════════════════════════════════════

function ExpandedLines({ doc }: { doc: CommercialDocument }) {
    const slug = useActiveSlug();
    const docCode = ((doc as unknown as Record<string, unknown>).documentType as Record<string, unknown> | undefined)?.code as string ?? '';

    const { data: full, isLoading } = useQuery({
        queryKey: [slug, "doc-lines", doc.id],
        queryFn: () =>
            apiGet<CommercialDocument>(`/documents/${doc.id}`, {
                include: "lines.product,lines.productVariant",
            }).then(r => ((r as unknown as Record<string, unknown>).data as CommercialDocument) ?? r),
        staleTime: 5 * 60_000,
        enabled: !!doc.id,
    });

    if (isLoading) return (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--t4)", fontSize: 12, padding: "4px 0" }}>
            <i className="ti ti-loader-2" style={{ animation: "cdp-spin .8s linear infinite", fontSize: 14 }} aria-hidden="true" />
            جارٍ تحميل الأسطر…
        </div>
    );

    const lines = ((full as unknown as Record<string, unknown>)?.lines as Record<string, unknown>[] | undefined) ?? [];
    if (lines.length === 0) return <div style={{ color: "var(--t4)", fontSize: 12 }}>لا توجد أسطر</div>;

    const TRACKS_DELIVERY = docCode === 'BCC';

    return (
        <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                    <tr style={{ background: "var(--bg3)" }}>
                        {["#", "المنتج", "الكمية"].concat(
                            TRACKS_DELIVERY ? ["التسليم"] : [],
                            ["سعر HT", "خصم", "TVA%", "الإجمالي TTC"]
                        ).map(h => (
                            <th key={h} style={{ padding: "5px 12px", textAlign: "right", fontWeight: 700, color: "var(--t4)", fontSize: 10, whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {lines.map((line, idx) => {
                        const name =
                            ((line.product as Record<string, unknown> | undefined)?.name as string) ??
                            (line.description as string) ?? "—";
                        const disc = parseFloat(String(line.discount_percentage ?? 0));
                        const qty = Number(line.quantity ?? 1);
                        const delivered = Number((line as Record<string, unknown>).delivered_quantity ?? 0);
                        const returned  = Number((line as Record<string, unknown>).returned_quantity ?? 0);
                        return (
                            <tr key={String(line.id ?? idx)} style={{ borderBottom: "1px solid var(--b1)" }}>
                                <td style={{ padding: "6px 12px", color: "var(--t4)" }}>{idx + 1}</td>
                                <td style={{ padding: "6px 12px", fontWeight: 600 }}>{name}</td>
                                <td style={{ padding: "6px 12px", textAlign: "left" }}>{String(line.quantity ?? "")}</td>
                                {TRACKS_DELIVERY && (
                                    <td style={{ padding: "6px 12px" }}>
                                        <DeliveryProgressBar
                                            quantity={qty}
                                            deliveredQuantity={delivered}
                                            returnedQuantity={returned}
                                        />
                                    </td>
                                )}
                                <td style={{ padding: "6px 12px", direction: "ltr", textAlign: "left" }}>
                                    <MoneyCell value={line.unit_price_ht as number} />
                                </td>
                                <td style={{ padding: "6px 12px", textAlign: "left" }}>
                                    {disc > 0 ? <span style={{ color: "var(--red)", fontWeight: 700 }}>-{disc}%</span> : <span style={{ color: "var(--t4)" }}>—</span>}
                                </td>
                                <td style={{ padding: "6px 12px", color: "var(--t4)", textAlign: "left" }}>{line.tva_rate}%</td>
                                <td style={{ padding: "6px 12px", direction: "ltr", textAlign: "left" }}>
                                    <MoneyCell value={line.total_ttc as number} bold accent="var(--em)" />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// TOAST
// ════════════════════════════════════════════════════════════════════════════

interface ToastItem { id: number; msg: string; type: "success" | "error" | "info" }

function useToast() {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const counterRef = useRef(0);

    const show = useCallback((msg: string, type: "success" | "error" | "info" = "success") => {
        const id = ++counterRef.current;
        setToasts(p => [...p, { id, msg, type }]);
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
    }, []);

    const ToastContainer = useCallback(() => (
        <div style={{ position: "fixed", bottom: 24, left: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
            {toasts.map(t => (
                <div key={t.id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 16px", borderRadius: 10,
                    background: t.type === "error" ? "color-mix(in srgb, var(--red) 15%, var(--bg1))" : t.type === "info" ? "color-mix(in srgb, var(--blue) 12%, var(--bg1))" : "color-mix(in srgb, var(--em) 12%, var(--bg1))",
                    border: `1px solid ${t.type === "error" ? "var(--red)" : t.type === "info" ? "var(--blue)" : "var(--em)"}`,
                    boxShadow: "0 8px 24px rgba(0,0,0,.14)", fontSize: 13, fontWeight: 600, color: "var(--t1)",
                    animation: "cdp-toast-in .2s ease",
                }}>
                    <i className={`ti ${t.type === "error" ? "ti-alert-circle" : t.type === "info" ? "ti-info-circle" : "ti-circle-check"}`}
                       style={{ color: t.type === "error" ? "var(--red)" : t.type === "info" ? "var(--blue)" : "var(--em)" }} aria-hidden="true" />
                    {t.msg}
                </div>
            ))}
        </div>
    ), [toasts]);

    return { show, ToastContainer };
}

// ════════════════════════════════════════════════════════════════════════════
// ROW ACTION BUTTON
// ════════════════════════════════════════════════════════════════════════════

const ActionBtn = React.memo(function ActionBtn({
    icon, title, onClick, color, disabled,
}: { icon: string; title: string; onClick: () => void; color?: string; disabled?: boolean }) {
    return (
        <button title={title} aria-label={title} disabled={disabled} onClick={onClick} style={{
            width: 28, height: 28, borderRadius: 6, border: "1px solid var(--b1)",
            background: "var(--bg2)", color: color ?? "var(--t3)", fontSize: 13,
            cursor: "pointer", display: "inline-flex", alignItems: "center",
            justifyContent: "center", transition: "all .15s", opacity: disabled ? 0.4 : 1,
        }}>
            <i className={`ti ${icon}`} aria-hidden="true" />
        </button>
    );
});

// ════════════════════════════════════════════════════════════════════════════
// ROW PERMISSIONS HELPER
// ════════════════════════════════════════════════════════════════════════════

function getRowPermissions(row: CommercialDocument, isReadOnly: boolean) {
    const isLocked    = !!row.is_locked;
    const isExported  = !!(row as unknown as Record<string, unknown>).is_exported_to_accounting;
    const status      = getDocStatus(row);
    const isCancelled = status === "cancelled";

    return {
        canEdit:   !isReadOnly && !isLocked && !isExported,
        canLock:   !isReadOnly && !isLocked && !isCancelled,
        canUnlock: !isReadOnly &&  isLocked && !isExported,
        canCancel: !isReadOnly && !isLocked && !isExported && !isCancelled,
        isLocked,
        isCancelled,
    };
}

// ════════════════════════════════════════════════════════════════════════════
// DOCUMENT VIEW MODAL (مختصر — يبقى كما هو تقريباً)
// ════════════════════════════════════════════════════════════════════════════

function DocumentViewModal({
    docId, docType, onClose, onEdit, isReadOnly,
}: { docId: number; docType: DocumentType | null; onClose: () => void; onEdit: () => void; isReadOnly: boolean }) {
    const slug    = useActiveSlug();
    const isPurch = PURCHASE_CODES.has(docType?.code ?? "");

    const { data, isLoading } = useQuery({
        queryKey: [slug, "doc-detail-full", docId],
        queryFn: () =>
            apiGet<CommercialDocument>(`/documents/${docId}`, {
                include: ["party","documentStatus","warehouse","fiscalYear","currency","documentType","lines.product","lines.productVariant","validatedBy","payments.paymentMode"].join(","),
            }).then(r => ((r as unknown as Record<string, unknown>).data as CommercialDocument) ?? r),
        staleTime: 2 * 60_000,
    });

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", h);
        return () => document.removeEventListener("keydown", h);
    }, [onClose]);

    const d      = data as unknown as Record<string, unknown> | undefined;
    const status = d ? getDocStatus(data as CommercialDocument) : "draft";

    return (
        <div role="dialog" aria-modal="true" aria-label={`تفاصيل ${docType?.name ?? "المستند"}`}
             style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,.45)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, direction: "rtl" }}
             onClick={onClose}>
            <div style={{ width: "100%", maxWidth: 920, maxHeight: "94vh", overflowY: "auto", overflowX: "hidden", background: "var(--bg1)", borderRadius: "var(--r3)", boxShadow: "0 24px 64px rgba(0,0,0,.22)", display: "flex", flexDirection: "column" }}
                 onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--b1)", background: "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10, flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: `color-mix(in srgb, ${isPurch ? "var(--purple)" : "var(--em)"} 12%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <i className={`ti ${isPurch ? "ti-shopping-cart" : "ti-file-invoice"}`} style={{ fontSize: 18, color: isPurch ? "var(--purple)" : "var(--em)" }} aria-hidden="true" />
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: 15, color: "var(--t1)" }}>
                                {docType?.name}
                                {d && <span style={{ marginRight: 8, color: isPurch ? "var(--purple)" : "var(--em)", fontFamily: "monospace" }}>{String(d.document_number ?? `#${d.id}`)}</span>}
                            </div>
                            {d && (
                                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
                                    <StatusBadge status={status} />
                                </div>
                            )}
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                        {!isReadOnly && d && !(d as Record<string, unknown>).is_locked && (
                            <button onClick={onEdit} style={{ height: 32, padding: "0 14px", borderRadius: 8, border: `1px solid color-mix(in srgb, var(--blue) 30%, transparent)`, background: "color-mix(in srgb, var(--blue) 8%, transparent)", color: "var(--blue)", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
                                <i className="ti ti-pencil" style={{ fontSize: 13 }} aria-hidden="true" />
                                تعديل
                            </button>
                        )}
                        <button onClick={onClose} aria-label="إغلاق" style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--b1)", background: "var(--bg2)", color: "var(--t3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <i className="ti ti-x" style={{ fontSize: 15 }} aria-hidden="true" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div style={{ padding: "20px 24px", flex: 1 }}>
                    {isLoading ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60, gap: 12, color: "var(--t4)" }}>
                            <i className="ti ti-loader-2" style={{ animation: "cdp-spin .8s linear infinite", fontSize: 20 }} aria-hidden="true" />
                            جارٍ تحميل التفاصيل…
                        </div>
                    ) : !d ? (
                        <div style={{ textAlign: "center", padding: 60, color: "var(--t4)" }}>المستند غير موجود</div>
                    ) : (
                        <>
                            {/* Meta Grid */}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
                                {[
                                    { label: "التاريخ",     value: fmtDate(d.document_date as string) },
                                    { label: "الاستحقاق",   value: fmtDate(d.due_date as string) },
                                    { label: isPurch ? "المورد" : "الزبون", value: getPartyName(data as CommercialDocument) || "—" },
                                    { label: "المستودع",    value: getWarehouseName(data as CommercialDocument) || "—" },
                                ].map(f => (
                                    <div key={f.label} style={{ background: "var(--bg2)", borderRadius: "var(--r2)", padding: "10px 14px" }}>
                                        <div style={{ fontSize: 10, color: "var(--t4)", fontWeight: 700, marginBottom: 4 }}>{f.label}</div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>{f.value}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Lines */}
                            <ExpandedLines doc={data as CommercialDocument} />

                            {/* Totals */}
                            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
                                <div style={{ width: 310, border: "1px solid var(--b1)", borderRadius: "var(--r2)", overflow: "hidden" }}>
                                    {([
                                        { label: "إجمالي HT",  value: d.total_ht,  dim: true },
                                        { label: "TVA",         value: d.total_tva, dim: true },
                                        parseFloat(String(d.total_discount ?? 0)) > 0 ? { label: "الخصم الإجمالي", value: d.total_discount, dim: false, red: true } : null,
                                        parseFloat(String(d.total_stamp ?? 0)) > 0 ? { label: "الطابع الجبائي", value: d.total_stamp, dim: true } : null,
                                    ] as ({ label: string; value: unknown; dim: boolean; red?: boolean } | null)[])
                                        .filter(Boolean)
                                        .map(row => {
                                            const r = row!;
                                            return (
                                                <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px", borderBottom: "1px solid var(--b1)", fontSize: 12, color: r.dim ? "var(--t4)" : "var(--t2)" }}>
                                                    <span>{r.label}</span>
                                                    <span style={{ fontWeight: 600, direction: "ltr", color: r.red ? "var(--red)" : "inherit" }}>
                                                        {fmtMoney(r.value as number)} دج
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    {/* Total TTC */}
                                    <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", background: "var(--bg2)", fontSize: 14, fontWeight: 800 }}>
                                        <span style={{ color: "var(--t1)" }}>الإجمالي TTC</span>
                                        <span style={{ direction: "ltr", color: "var(--em)" }}>{fmtMoney(d.total_ttc as number)} دج</span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN PAGE — DataTable v10.1
// ════════════════════════════════════════════════════════════════════════════

export default function CommercialDocumentsPage() {
    const { typeCode }                       = useParams<{ typeCode: string }>();
    const qc                                 = useQueryClient();
    const slug                               = useActiveSlug();
    const { selectedYear, isReadOnly }       = useFiscalYear() as { selectedYear?: { id: number; name: string }; isReadOnly?: boolean };
    const { show: showToast, ToastContainer } = useToast();

    // ── Modal state ───────────────────────────────────────────────────────────
    type ModalMode = "add" | "edit" | "view" | "quick" | null;
    const [modal, setModal]           = useState<ModalMode>(null);
    const [viewDocId, setViewDocId]   = useState<number | null>(null);
    const [convertDocId, setConvertDocId]     = useState<number | null>(null);
    const [convertSourceCode, setConvertSourceCode] = useState('');
    const [convertSourceDate, setConvertSourceDate] = useState('');
    const [editDocFull, setEditDocFull] = useState<CommercialDocument | null>(null);
    const [loadingEdit, setLoadingEdit] = useState(false);

    // ── Cancel modal state ────────────────────────────────────────────────────
    const [cancelModal, setCancelModal] = useState<{ id: number; reason: string } | null>(null);

    // ── Batch print ───────────────────────────────────────────────────────────
    const [batchPrintOpen, setBatchPrintOpen] = useState(false);
    const [batchDocs, setBatchDocs] = useState<CommercialDocument[]>([]);

    // ── Server-side state ─────────────────────────────────────────────────────
    const [page, setPage]               = useState(1);
    const [perPage, setPerPage]         = useState(15);
    const [serverFilters, setServerFilters] = useState<Record<string, string>>({});
    const [multiSort, setMultiSort]     = useState<MultiSortState>([]);

    const isPurch   = PURCHASE_CODES.has(typeCode ?? "");
    const isSalable = SALE_CODES.has(typeCode ?? "");
    const opColor   = isPurch ? "var(--purple)" : "var(--em)";

    // ── Column State Persistence — مفتاح واحد يحفظ: ترتيب + عرض + مخفي + مثبت + فلاتر ──
    const COL_STATE_KEY = `cdp-cols-state-${typeCode}-${slug ?? "default"}`;
    const { save: saveColState, reset: resetColState, initialSnapshot } = useColumnStatePersistence(COL_STATE_KEY);

    // columnOrder: يُقرأ من الـ snapshot المحفوظة
    const [columnOrder, setColumnOrder] = useState<string[] | undefined>(
        () => initialSnapshot?.columnOrder,
    );

    const handleColumnOrderChange = useCallback((order: string[]) => {
        setColumnOrder(order);
        saveColState({ columnOrder: order });
    }, [saveColState]);

    // ── Sort → server param ───────────────────────────────────────────────────
    const sortParam = useMemo(() => {
        if (!multiSort.length) return "id";
        return multiSort.map(s => `${s.dir === "desc" ? "-" : ""}${s.key}`).join(",");
    }, [multiSort]);

    // ── Filter change ─────────────────────────────────────────────────────────
    const handleFilterChange = useCallback((filters: Record<string, string>) => {
        const converted: Record<string, string> = {};

        // حقول النطاق (تاريخ / رقم) — DataTable يُرسل "min|max" → Backend يتوقع "min,max"
        const rangeFields = new Set([
            "document_date","due_date","total_ht","total_tva","total_ttc",
            "net_to_pay","total_discount","total_stamp","remaining_amount",
            "validated_at","created_at","updated_at",
        ]);

        // حقول العلاقات (dynamic-multiselect CSV) — Backend يُقسّمها بنفسه
        const csvRelationFields = new Set(["party.name","warehouse.name"]);

        for (const [key, val] of Object.entries(filters)) {
            // تخطى القيم الفارغة
            if (!val || val === "|") continue;

            if (rangeFields.has(key) && val.includes("|")) {
                // "min|max" → "min,max"
                const rangeVal = val.replaceAll("|", ",");
                if (rangeVal !== "," && rangeVal !== "") {
                    converted[key] = rangeVal;
                }
            } else if (csvRelationFields.has(key) && val.includes(",")) {
                // CSV من multiselect — نُرسله كما هو
                converted[key] = val;
            } else {
                converted[key] = val;
            }
        }
        setServerFilters(converted);
        setPage(1);
        const toSave = Object.fromEntries(
            Object.entries(converted).filter(([, v]) => v != null && v !== "")
        );
        saveColState({ activeFilters: toSave });
    }, [saveColState]);

    const invalidateDocs = useCallback(() => {
        if (slug) qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
    }, [qc, slug]);

    // ── Fetch document type ───────────────────────────────────────────────────
    const { data: docType } = useQuery<DocumentType | null>({
        queryKey: [slug, "document-type-by-code", typeCode],
        queryFn: () =>
            apiGet<{ data?: DocumentType[] }>("/document-types", { per_page: 500 }).then(res => {
                const list = Array.isArray(res) ? (res as DocumentType[]) : (((res as Record<string,unknown>).data as DocumentType[]) ?? []);
                return list.find(dt => dt.code === typeCode) ?? null;
            }),
        enabled: !!slug && !!typeCode,
        staleTime: 10 * 60_000,
    });

    // ── Fetch documents ───────────────────────────────────────────────────────
    const queryParams = useMemo(() => {
        // نبني الـ params بدون أي مفتاح قيمته undefined أو null
        // لأن بعض HTTP clients تُرسلها كـ "undefined" string → Backend يُرجع []
        const params: Record<string, unknown> = {
            include: "party,documentStatus,warehouse,validatedBy,user",
            sort: sortParam,
            per_page: perPage,
            page,
        };

        // نُضيف filter[document_type_id] فقط إذا كانت القيمة موجودة
        if (docType?.id != null)       params["filter[document_type_id]"] = docType.id;
        if (selectedYear?.id != null)  params["filter[fiscal_year_id]"]   = selectedYear.id;

        const filterMap: Record<string, string> = {
            search:                   "filter[search]",
            "party.name":             "filter[party.name]",
            "warehouse.name":         "filter[warehouse.name]",
            "document_status.name":   "filter[document_status.name]",
            document_date:            "filter[document_date]",
            due_date:                 "filter[due_date]",
            total_ht:                 "filter[total_ht]",
            total_tva:                "filter[total_tva]",
            total_ttc:                "filter[total_ttc]",
            net_to_pay:               "filter[net_to_pay]",
            total_discount:           "filter[total_discount]",
            total_stamp:              "filter[total_stamp]",
            remaining_amount:         "filter[remaining_amount]",
            reference:                "filter[reference]",
            notes:                    "filter[notes]",
            payment_terms:            "filter[payment_terms]",
            validated_at:             "filter[validated_at]",
            created_at:               "filter[created_at]",
            updated_at:               "filter[updated_at]",
            // ✅ إضافة: فلتر باسم المستخدم الذي اعتمد / أنشأ المستند
            validated_by:             "filter[validated_by]",
            created_by:               "filter[created_by]",
        };
        for (const [fk, pk] of Object.entries(filterMap)) {
            if (serverFilters[fk]) params[pk] = serverFilters[fk];
        }
        return params;
    }, [docType?.id, selectedYear?.id, serverFilters, sortParam, perPage, page]);

    const { data: docsRaw, isLoading, isFetching } = useQuery({
        queryKey: tenantKeys.documents.byType(slug ?? "", typeCode ?? "", queryParams),
        queryFn: () => {
            // TODO: احذف هذا الـ log بعد حل المشكلة
            if (process.env.NODE_ENV === "development") {
                console.debug("[CommercialDocumentsPage] sending params:", queryParams);
            }
            return apiGet<{ data: CommercialDocument[]; meta: Record<string, number> }>("/documents", queryParams);
        },
        enabled: !!slug && !!typeCode && !!selectedYear?.id && !!docType?.id,
        placeholderData: keepPreviousData,
        staleTime: 2 * 60_000,
    });

    const items = useMemo((): CommercialDocument[] => {
        if (!docsRaw) return [];
        if (Array.isArray(docsRaw)) return docsRaw as CommercialDocument[];
        const raw = docsRaw as unknown as Record<string, unknown>;
        // بنية مباشرة: { data: [...], meta: {...} }
        if (Array.isArray(raw.data)) return raw.data as CommercialDocument[];
        // بنية مُغلَّفة: { data: { data: [...], meta: {...} } }
        const nested = raw.data as Record<string, unknown> | undefined;
        if (nested && Array.isArray(nested.data)) return nested.data as CommercialDocument[];
        return [];
    }, [docsRaw]);

    // ── استخراج meta مع دعم كل بنى Laravel ──────────────────────────────────
    // Laravel يُرجع pagination في:
    //   • { data: [...], meta: { current_page, last_page, total, per_page } }  ← JsonResource::collection
    //   • { data: { data: [...], meta: {...} } }                                ← لو apiGet يُغلّف
    //   • { data: [...], current_page, last_page, total }                       ← paginator مباشر
    const meta = useMemo(() => {
        if (!docsRaw || Array.isArray(docsRaw)) return { total: 0, last_page: 1, current_page: 1, per_page: perPage };

        const raw    = docsRaw as unknown as Record<string, unknown>;
        // الأكثر شيوعاً: meta object على المستوى الأول
        const m      = (raw.meta ?? (raw.data as Record<string, unknown> | undefined)?.meta) as Record<string, number> | undefined;

        if (m && (m.total != null || m.last_page != null)) {
            return {
                total:        Number(m.total        ?? 0),
                last_page:    Number(m.last_page    ?? 1),
                current_page: Number(m.current_page ?? 1),
                per_page:     Number(m.per_page     ?? perPage),
            };
        }

        // fallback: pagination مباشرة على الـ root object (بعض الإعدادات)
        if (raw.total != null || raw.last_page != null) {
            return {
                total:        Number(raw.total        ?? 0),
                last_page:    Number(raw.last_page    ?? 1),
                current_page: Number(raw.current_page ?? 1),
                per_page:     Number(raw.per_page     ?? perPage),
            };
        }

        return { total: 0, last_page: 1, current_page: 1, per_page: perPage };
    }, [docsRaw, perPage]);

    // ── Mutations ─────────────────────────────────────────────────────────────
    const lockMut = useMutation({
        mutationFn: (id: number) => apiPost(`/documents/${id}/lock`),
        onSuccess: () => { showToast("تم قفل المستند"); invalidateDocs(); },
        onError:   () => showToast("فشل القفل", "error"),
    });
    const unlockMut = useMutation({
        mutationFn: (id: number) => apiPost(`/documents/${id}/unlock`),
        onSuccess: () => { showToast("تم فتح قفل المستند"); invalidateDocs(); },
        onError:   () => showToast("فشل فتح القفل", "error"),
    });
    const cancelMut = useMutation({
        mutationFn: ({ id, reason }: { id: number; reason: string }) =>
            apiPost(`/documents/${id}/cancel`, { cancellation_reason: reason }),
        onSuccess: () => { showToast("تم إلغاء المستند"); invalidateDocs(); },
        onError:   () => showToast("فشل الإلغاء", "error"),
    });

    // ── Edit modal ────────────────────────────────────────────────────────────
    const openEditModal = useCallback(async (doc: CommercialDocument) => {
        setLoadingEdit(true);
        try {
            const res  = await apiGet<CommercialDocument>(`/documents/${doc.id}`, {
                include: ["party","warehouse","documentType","fiscalYear","lines.product","lines.productVariant","payments.paymentMode"].join(","),
            });
            const full = ((res as unknown as Record<string,unknown>).data as CommercialDocument) ?? res;
            setEditDocFull(full);
            setModal("edit");
        } catch {
            showToast("فشل تحميل بيانات المستند", "error");
        } finally {
            setLoadingEdit(false);
        }
    }, [showToast]);

    const closeModal = useCallback(() => { setModal(null); setViewDocId(null); setEditDocFull(null); }, []);

    const handleMultiSortChange = useCallback((sorts: MultiSortState) => {
        setMultiSort(sorts);
        setPage(1);
    }, []);

    // ════════════════════════════════════════════════════════════════════════
    // COLUMN DEFINITIONS
    // ════════════════════════════════════════════════════════════════════════

    const allColumns = useMemo((): Column<CommercialDocument>[] => [
        {
            key: "document_number",
            header: "رقم المستند",
            exportHeader: "رقم المستند",
            sticky: "start",
            width: 145,
            sortable: true,
            filter: { type: "text" },
            searchable: true,
            disablePin: true,          // لا نسمح بـ pin مرة ثانية — هو sticky بالفعل
            accessor: r => String(r.document_number ?? r.id),
            render: row => (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {row.is_locked && <i className="ti ti-lock" style={{ fontSize: 10, color: "var(--t4)" }} aria-label="مقفل" />}
                    <span style={{ fontWeight: 800, color: opColor, fontSize: 12, fontFamily: "monospace", letterSpacing: "-.3px" }}>
                        {String(row.document_number ?? `#${row.id}`)}
                    </span>
                </div>
            ),
        },
        {
            key: "is_locked",
            header: "مقفل",
            exportHeader: "مقفل",
            width: 80,
            sortable: true,
            defaultHidden: false,
            filter: {
                type: "select" as const,
                options: [
                    { value: "1", label: "مقفل" },
                    { value: "0", label: "غير مقفل" },
                ],
            },
            accessor: (r: CommercialDocument) => r.is_locked ? "مقفل" : "—",
            render: (row: CommercialDocument) => {
                const locked     = !!row.is_locked;
                const isExported = !!(row as unknown as Record<string, unknown>).is_exported_to_accounting;
                return (
                    <span
                        title={
                            locked
                                ? isExported
                                    ? "مقفل ومُصدَّر — لا يمكن فتحه"
                                    : "مقفل — انقر مرتين لفتح القفل"
                                : "غير مقفل — انقر مرتين للقفل"
                        }
                        onDoubleClick={() => {
                            if (isReadOnly) return;
                            if (locked) {
                                if (isExported) { showToast("لا يمكن فتح قفل مستند مُصدَّر للمحاسبة", "error"); return; }
                                if (window.confirm("تأكيد فتح قفل هذا المستند؟")) unlockMut.mutate(row.id);
                            } else {
                                const status = getDocStatus(row);
                                if (status === "cancelled") { showToast("لا يمكن قفل مستند ملغى", "error"); return; }
                                if (window.confirm("تأكيد قفل هذا المستند؟ لن يمكن تعديله بعد القفل.")) lockMut.mutate(row.id);
                            }
                        }}
                        style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            cursor: isReadOnly ? "default" : "pointer",
                            padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700,
                            color:      locked ? "var(--orange)" : "var(--t4)",
                            background: locked ? "color-mix(in srgb, var(--orange) 10%, transparent)" : "transparent",
                            border:     locked ? "1px solid color-mix(in srgb, var(--orange) 25%, transparent)" : "none",
                            userSelect: "none",
                        }}
                    >
                        <i className={`ti ${locked ? "ti-lock" : "ti-lock-open"}`} style={{ fontSize: 12 }} aria-hidden="true" />
                        {locked ? "مقفل" : "—"}
                    </span>
                );
            },
        },
        {
            key: "document_date",
            header: "التاريخ",
            exportHeader: "التاريخ",
            width: 110,
            sortable: true,
            filter: { type: "date" },
            accessor: r => r.document_date,
            render: row => <span style={{ fontSize: 12, color: "var(--t3)" }}>{fmtDate(row.document_date)}</span>,
        },
        {
            key: "party.name",
            header: isPurch ? "المورد" : "الزبون",
            exportHeader: isPurch ? "المورد" : "الزبون",
            sortable: true,
            searchable: true,
            filter: { type: "dynamic-multiselect" },
            accessor: r => getPartyName(r),
            render: row => {
                const name = getPartyName(row);
                return name ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, background: `color-mix(in srgb, ${opColor} 14%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: opColor }}>
                            {name.charAt(0)}
                        </div>
                        <span style={{ fontWeight: 600, color: "var(--t1)", fontSize: 13 }}>{name}</span>
                    </div>
                ) : (
                    <span style={{ color: "var(--t4)", fontStyle: "italic", fontSize: 12 }}>نقدي</span>
                );
            },
        },
        {
            key: "warehouse.name",
            header: "المستودع",
            exportHeader: "المستودع",
            sortable: false,
            hideOnMobile: true,
            filter: { type: "dynamic-multiselect" },
            accessor: r => getWarehouseName(r),
            render: row => <span style={{ fontSize: 12, color: "var(--t3)" }}>{getWarehouseName(row) || "—"}</span>,
        },
        {
            key: "document_status.name",
            header: "الحالة",
            exportHeader: "الحالة",
            width: 135,
            sortable: true,
            filter: {
                type: "select",
                options: Object.entries(STATUS_CFG).map(([v, c]) => ({ value: v, label: c.label })),
            },
            accessor: r => getDocStatus(r),
            render: row => <StatusBadge status={getDocStatus(row)} />,
        },
        {
            key: "total_ht",
            header: "إجمالي HT",
            exportHeader: "إجمالي HT (دج)",
            width: 130,
            align: "end",
            sortable: true,
            hideOnMobile: true,
            filter: { type: "number" },
            accessor: r => Number(r.total_ht ?? 0),
            aggregate: "sum",
            aggregateFormat: v => `${fmtMoney(v)} دج`,
            render: row => <MoneyCell value={row.total_ht} />,
        },
        {
            key: "total_tva",
            header: "TVA",
            exportHeader: "TVA (دج)",
            width: 110,
            align: "end",
            sortable: true,
            defaultHidden: true,          // مخفي افتراضياً
            filter: { type: "number" },
            accessor: r => Number(r.total_tva ?? 0),
            aggregate: "sum",
            aggregateFormat: v => `${fmtMoney(v)} دج`,
            render: row => <MoneyCell value={row.total_tva} />,
        },
        {
            key: "total_ttc",
            header: "الإجمالي TTC",
            exportHeader: "الإجمالي TTC (دج)",
            width: 145,
            align: "end",
            sortable: true,
            filter: { type: "number" },
            accessor: r => Number(r.total_ttc ?? 0),
            aggregate: "sum",
            aggregateFormat: v => `${fmtMoney(v)} دج`,
            render: row => <MoneyCell value={row.total_ttc} bold />,
        },
        {
            key: "net_to_pay",
            header: "المستحق",
            exportHeader: "المستحق (دج)",
            width: 145,
            align: "end",
            sortable: true,
            hideOnMobile: true,
            filter: { type: "number" },
            accessor: r => Number((r as unknown as Record<string,unknown>).net_to_pay ?? r.total_ttc ?? 0),
            aggregate: "sum",
            aggregateFormat: v => `${fmtMoney(v)} دج`,
            render: row => {
                const ntp = Number((row as unknown as Record<string,unknown>).net_to_pay ?? row.total_ttc ?? 0);
                const rem = Number((row as unknown as Record<string,unknown>).remaining_amount ?? 0);
                const paid = ntp > 0 && rem <= 0.001;
                return <MoneyCell value={ntp} bold accent={paid ? "var(--em)" : rem > 0 ? "var(--red)" : "var(--t2)"} />;
            },
        },
        {
            key: "paid_amount",
            header: "المدفوع",
            exportHeader: "المبلغ المدفوع (دج)",
            width: 130,
            align: "end",
            sortable: true,
            filter: { type: "number" },
            accessor: r => Number((r as unknown as Record<string,unknown>).paid_amount ?? 0),
            aggregate: "sum",
            aggregateFormat: v => `${fmtMoney(v)} دج`,
            render: row => {
                const paid = Number((row as unknown as Record<string,unknown>).paid_amount ?? 0);
                return paid > 0
                    ? <MoneyCell value={paid} accent="var(--em)" />
                    : <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
            },
        },
        {
            key: "due_date",
            header: "الاستحقاق",
            exportHeader: "تاريخ الاستحقاق",
            width: 110,
            sortable: true,
            defaultHidden: true,          // مخفي افتراضياً
            filter: { type: "date" },
            accessor: r => r.due_date ?? "",
            render: row => {
                if (!row.due_date) return <span style={{ color: "var(--t4)" }}>—</span>;
                const overdue = new Date(row.due_date) < new Date();
                const status  = getDocStatus(row);
                const isLate  = overdue && status !== "paid" && status !== "cancelled";
                return (
                    <span style={{ fontSize: 12, fontWeight: isLate ? 700 : 400, color: isLate ? "var(--red)" : "var(--t3)", display: "flex", alignItems: "center", gap: 4 }}>
                        {isLate && <i className="ti ti-alert-triangle" style={{ fontSize: 11 }} aria-label="متأخر" />}
                        {fmtDate(row.due_date)}
                    </span>
                );
            },
        },

        // ════════════════════════════════════════════════════════════════════
        // أعمدة إضافية — مخفية افتراضياً (defaultHidden: true)
        // يُظهرها المستخدم حسب الحاجة عبر قائمة الأعمدة
        // ════════════════════════════════════════════════════════════════════

        // ── مالية ────────────────────────────────────────────────────────────

        {
            key: "total_discount",
            header: "الخصم",
            exportHeader: "الخصم الإجمالي (دج)",
            width: 120,
            align: "end" as const,
            sortable: true,
            defaultHidden: true,
            filter: { type: "number" as const },
            accessor: (r: CommercialDocument) => Number((r as unknown as Record<string,unknown>).total_discount ?? 0),
            aggregate: "sum" as const,
            aggregateFormat: (v: number) => `${fmtMoney(v)} دج`,
            render: (row: CommercialDocument) => {
                const v = Number((row as unknown as Record<string,unknown>).total_discount ?? 0);
                if (!v) return <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
                return <MoneyCell value={v} accent="var(--red)" />;
            },
        },
        {
            key: "total_stamp",
            header: "الطابع",
            exportHeader: "الطابع الجبائي (دج)",
            width: 110,
            align: "end" as const,
            sortable: true,
            defaultHidden: true,
            filter: { type: "number" as const },
            accessor: (r: CommercialDocument) => Number((r as unknown as Record<string,unknown>).total_stamp ?? 0),
            aggregate: "sum" as const,
            aggregateFormat: (v: number) => `${fmtMoney(v)} دج`,
            render: (row: CommercialDocument) => <MoneyCell value={(row as unknown as Record<string,unknown>).total_stamp as number} />,
        },
        {
            key: "remaining_amount",
            header: "المتبقي",
            exportHeader: "المبلغ المتبقي (دج)",
            width: 130,
            align: "end" as const,
            sortable: true,
            defaultHidden: true,
            filter: { type: "number" as const },
            accessor: (r: CommercialDocument) => Number((r as unknown as Record<string,unknown>).remaining_amount ?? 0),
            aggregate: "sum" as const,
            aggregateFormat: (v: number) => `${fmtMoney(v)} دج`,
            render: (row: CommercialDocument) => {
                const rem = Number((row as unknown as Record<string,unknown>).remaining_amount ?? 0);
                if (rem <= 0.001) return <span style={{ color: "var(--em)", fontSize: 12, fontWeight: 700 }}>مسدد ✓</span>;
                return <MoneyCell value={rem} accent="var(--red)" bold />;
            },
        },

        // ── مرجعية ───────────────────────────────────────────────────────────

        {
            key: "reference",
            header: "المرجع",
            exportHeader: "رقم المرجع (BL/BC)",
            width: 130,
            sortable: false,
            defaultHidden: true,
            filter: { type: "text" as const },
            searchable: true,
            accessor: (r: CommercialDocument) => String((r as unknown as Record<string,unknown>).reference ?? ""),
            render: (row: CommercialDocument) => {
                const ref = String((row as unknown as Record<string,unknown>).reference ?? "");
                return ref
                    ? <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--t3)", background: "var(--bg3)", padding: "2px 6px", borderRadius: 4 }}>{ref}</span>
                    : <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
            },
        },
        {
            key: "notes",
            header: "ملاحظات",
            exportHeader: "الملاحظات",
            width: 200,
            sortable: false,
            defaultHidden: true,
            filter: { type: "text" as const },
            searchable: true,
            accessor: (r: CommercialDocument) => String((r as unknown as Record<string,unknown>).notes ?? ""),
            render: (row: CommercialDocument) => {
                const notes = String((row as unknown as Record<string,unknown>).notes ?? "");
                return notes
                    ? <span style={{ fontSize: 12, color: "var(--t2)", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }} title={notes}>{notes}</span>
                    : <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
            },
        },
        {
            key: "payment_terms",
            header: "شروط الدفع",
            exportHeader: "شروط الدفع",
            width: 130,
            sortable: false,
            defaultHidden: true,
            filter: { type: "text" as const },
            accessor: (r: CommercialDocument) => String((r as unknown as Record<string,unknown>).payment_terms ?? ""),
            render: (row: CommercialDocument) => {
                const pt = String((row as unknown as Record<string,unknown>).payment_terms ?? "");
                return pt
                    ? <span style={{ fontSize: 12, color: "var(--t3)" }}>{pt}</span>
                    : <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
            },
        },

        // ── رقابة وتتبع ───────────────────────────────────────────────────────

        {
            key: "validated_at",
            header: "تاريخ الاعتماد",
            exportHeader: "تاريخ الاعتماد",
            width: 130,
            sortable: true,
            defaultHidden: true,
            filter: { type: "date" as const },
            accessor: (r: CommercialDocument) => String((r as unknown as Record<string,unknown>).validated_at ?? ""),
            render: (row: CommercialDocument) => {
                const d = (row as unknown as Record<string,unknown>).validated_at as string | null | undefined;
                return d
                    ? <span style={{ fontSize: 11, color: "var(--em)", fontVariantNumeric: "tabular-nums" }}>{fmtDateTime(d)}</span>
                    : <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
            },
        },
        {
            key: "validated_by",
            header: "اعتمد بواسطة",
            exportHeader: "اعتمد بواسطة",
            width: 150,
            sortable: false,
            defaultHidden: true,
            filter: { type: "text" as const },
            // validated_by في DB = integer FK — الـ Resource يُرسل العلاقة بـ camelCase
            accessor: (r: CommercialDocument) => {
                const vb = (r as unknown as Record<string,unknown>).validatedBy as Record<string,unknown> | null | undefined;
                return String(vb?.name ?? vb?.username ?? "");
            },
            render: (row: CommercialDocument) => {
                const vb = (row as unknown as Record<string,unknown>).validatedBy as Record<string,unknown> | null | undefined;
                const name = String(vb?.name ?? vb?.username ?? "");
                return name ? <UserChip name={name} color="var(--em)" /> : <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
            },
        },
        {
            key: "created_by",
            header: "أنشأه",
            exportHeader: "أنشأه",
            width: 150,
            sortable: false,
            defaultHidden: true,
            filter: { type: "text" as const },
            // المنشئ = user_id في DB → العلاقة هي user() وليس created_by
            accessor: (r: CommercialDocument) => {
                const u = (r as unknown as Record<string,unknown>).user as Record<string,unknown> | null | undefined;
                return String(u?.name ?? u?.username ?? "");
            },
            render: (row: CommercialDocument) => {
                const u = (row as unknown as Record<string,unknown>).user as Record<string,unknown> | null | undefined;
                const name = String(u?.name ?? u?.username ?? "");
                return name ? <UserChip name={name} color="var(--blue)" /> : <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
            },
        },
        {
            key: "created_at",
            header: "تاريخ الإنشاء",
            exportHeader: "تاريخ الإنشاء",
            width: 160,
            sortable: true,
            defaultHidden: true,
            filter: { type: "date" as const },
            accessor: (r: CommercialDocument) => String((r as unknown as Record<string,unknown>).created_at ?? ""),
            render: (row: CommercialDocument) => {
                const d = (row as unknown as Record<string,unknown>).created_at as string | null | undefined;
                return d
                    ? <span style={{ fontSize: 11, color: "var(--t4)", fontVariantNumeric: "tabular-nums" }}>{fmtDateTime(d)}</span>
                    : <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
            },
        },
        {
            key: "updated_at",
            header: "آخر تعديل",
            exportHeader: "آخر تعديل",
            width: 160,
            sortable: true,
            defaultHidden: true,
            filter: { type: "date" as const },
            accessor: (r: CommercialDocument) => String((r as unknown as Record<string,unknown>).updated_at ?? ""),
            render: (row: CommercialDocument) => {
                const d = (row as unknown as Record<string,unknown>).updated_at as string | null | undefined;
                return d
                    ? <span style={{ fontSize: 11, color: "var(--t4)", fontVariantNumeric: "tabular-nums" }}>{fmtDateTime(d)}</span>
                    : <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
            },
        },

        // ── التسليم (لأوامر الزبون BCC خاصة) ────────────────────────────────
        {
            key: "delivery_date",
            header: "تاريخ التسليم",
            exportHeader: "تاريخ التسليم",
            width: 120,
            sortable: true,
            defaultHidden: true,
            filter: { type: "date" as const },
            accessor: (r: CommercialDocument) => String((r as unknown as Record<string,unknown>).delivery_date ?? ""),
            render: (row: CommercialDocument) => {
                const d = (row as unknown as Record<string,unknown>).delivery_date as string | null | undefined;
                return d
                    ? <span style={{ fontSize: 12, color: "var(--t3)" }}>{fmtDate(d)}</span>
                    : <span style={{ color: "var(--t4)", fontSize: 12 }}>—</span>;
            },
        },
    ], [isPurch, opColor]);

    // ── إدارة الأعمدة المخفية — مُفوَّضة بالكامل لـ DataTable الداخلي ──────────
    // DataTable يتولى: قائمة الأعمدة + toggle + عرض القائمة
    // هنا نحتفظ فقط بـ state للاستخدام في headerActions و contextMenu

    const initialHiddenKeys = useMemo(
        () => initialSnapshot?.hiddenColumns ?? allColumns.filter(c => c.defaultHidden).map(c => c.key),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [], // يُحسب مرة واحدة عند الـ mount فقط
    );

    const [hiddenColumnKeys, setHiddenColumnKeys] = useState<string[]>(initialHiddenKeys);

    // onHiddenColumnsChange الجديدة: تستقبل القائمة الكاملة دائماً (allHidden)
    // سواء كان toggle فردي أو batch (إخفاء الكل / تطبيق view)
    const handleHiddenColumnsChange = useCallback(
        (_key: string, _willBeHidden: boolean, allHidden: string[]) => {
            setHiddenColumnKeys(allHidden);
            saveColState({ hiddenColumns: allHidden });
        },
        [saveColState],
    );

    // Set سريع للبحث في contextMenu
    const hiddenColumnsSet = useMemo(() => new Set(hiddenColumnKeys), [hiddenColumnKeys]);

    // ════════════════════════════════════════════════════════════════════════
    // CONDITIONAL FORMATTING
    // ════════════════════════════════════════════════════════════════════════

    const conditionalFormatting = useMemo<ConditionalFormat<CommercialDocument>[]>(() => [
        {
            colKey: "*",
            condition: (_value, row) => {
                const status  = getDocStatus(row);
                const dueDate = row.due_date;
                return !!(dueDate && new Date(dueDate) < new Date() && status !== "paid" && status !== "cancelled");
            },
            className: "cdp-row-overdue",
            style: { background: "color-mix(in srgb, var(--red) 6%, var(--bg1))" },
        },
        {
            colKey: "net_to_pay",
            condition: (_value, row) => {
                const rem = Number((row as unknown as Record<string, unknown>).remaining_amount ?? 0);
                return rem > 0 && rem < (row.total_ttc ?? 0);
            },
            style: { fontWeight: 700 },
        },
        {
            // تلوين خفيف للمستندات المسودة
            colKey: "*",
            condition: (_value, row) => getDocStatus(row) === "draft",
            style: { opacity: 0.85 },
        },
    ], []);

    // ════════════════════════════════════════════════════════════════════════
    // CONTEXT MENU ITEMS
    // ════════════════════════════════════════════════════════════════════════

    const contextMenuItems = useCallback((ctx: ContextMenuContext): ContextMenuItem[] => {
        const menuItems: ContextMenuItem[] = [];

        // ─── خلية ───────────────────────────────────────────────────────────
        if (ctx.type === "cell") {
            const row    = ctx.row as CommercialDocument | undefined;
            const colKey = ctx.colKey;
            const value  = row && colKey ? (row as unknown as Record<string, unknown>)[colKey] : undefined;

            menuItems.push(
                {
                    label: "نسخ القيمة",
                    icon: "copy",
                    onClick: () => {
                        const cellEl = document.querySelector(`[data-row-index="${ctx.rowIndex}"][data-col-key="${colKey}"]`);
                        const text   = cellEl?.textContent?.trim() ?? String(value ?? "");
                        if (text) { navigator.clipboard.writeText(text); showToast("تم نسخ القيمة", "info"); }
                    },
                },
                { label: "", divider: true, onClick: () => {} },
                {
                    label: "فلتر بنفس القيمة",
                    icon: "filter",
                    disabled: !colKey || value === undefined,
                    onClick: () => {
                        if (colKey && value !== undefined) {
                            setServerFilters(prev => ({ ...prev, [colKey]: String(value) }));
                            setPage(1);
                            showToast(`تم تطبيق فلتر على: ${colKey}`, "info");
                        }
                    },
                },
                {
                    label: "عرض التفاصيل",
                    icon: "eye",
                    disabled: !row,
                    onClick: () => { if (row) { setViewDocId(row.id); setModal("view"); } },
                },
                {
                    label: "تحويل",
                    icon: "arrows-exchange",
                    disabled: !row || getDocStatus(row) === 'cancelled',
                    onClick: () => {
                        if (!row) return;
                        const docType = (row as unknown as Record<string, unknown>).document_type as Record<string, unknown> | undefined;
                        const code = String(docType?.code ?? '');
                        setConvertSourceCode(code);
                        setConvertSourceDate(String(row.document_date ?? ''));
                        setConvertDocId(row.id);
                    },
                },
            );
        }

        // ─── صف ─────────────────────────────────────────────────────────────
        if (ctx.type === "row") {
            const row = ctx.row as CommercialDocument | undefined;
            const { canEdit, canLock, canUnlock, canCancel } = row
                ? getRowPermissions(row, !!isReadOnly)
                : { canEdit: false, canLock: false, canUnlock: false, canCancel: false };

            menuItems.push(
                {
                    label: "نسخ رقم المستند",
                    icon: "copy",
                    disabled: !row?.document_number,
                    onClick: () => {
                        if (row?.document_number) {
                            navigator.clipboard.writeText(String(row.document_number));
                            showToast("تم نسخ رقم المستند", "info");
                        }
                    },
                },
                {
                    label: "عرض التفاصيل",
                    icon: "eye",
                    disabled: !row,
                    onClick: () => { if (row) { setViewDocId(row.id); setModal("view"); } },
                },
                {
                    label: "تحويل",
                    icon: "arrows-exchange",
                    disabled: !row || getDocStatus(row) === 'cancelled',
                    onClick: () => {
                        if (!row) return;
                        const docType = (row as unknown as Record<string, unknown>).document_type as Record<string, unknown> | undefined;
                        const code = String(docType?.code ?? '');
                        setConvertSourceCode(code);
                        setConvertSourceDate(String(row.document_date ?? ''));
                        setConvertDocId(row.id);
                    },
                },
            );

            const editActions: ContextMenuItem[] = [];

            if (canEdit) {
                editActions.push({
                    label: "تعديل المستند",
                    icon: "pencil",
                    onClick: () => { if (row) openEditModal(row); },
                });
            }
            if (canLock) {
                editActions.push({
                    label: "قفل المستند",
                    icon: "lock",
                    onClick: () => {
                        if (row && window.confirm("تأكيد قفل هذا المستند؟")) lockMut.mutate(row.id);
                    },
                });
            }
            if (canUnlock) {
                editActions.push({
                    label: "فتح قفل المستند",
                    icon: "lock-open",
                    onClick: () => {
                        if (row && window.confirm("تأكيد فتح قفل هذا المستند؟")) unlockMut.mutate(row.id);
                    },
                });
            }
            if (canCancel) {
                editActions.push({
                    label: "إلغاء المستند",
                    icon: "ban",
                    onClick: () => {
                        if (!row) return;
                        setCancelModal({ id: row.id, reason: '' });
                    },
                });
            }

            if (editActions.length > 0) {
                menuItems.push({ label: "", divider: true, onClick: () => {} }, ...editActions);
            }
        }

        // ─── رأس العمود ─────────────────────────────────────────────────────
        if (ctx.type === "header") {
            const colKey   = ctx.colKey;
            const isHidden = colKey ? hiddenColumnsSet.has(colKey) : false;
            menuItems.push({
                label:    isHidden ? "إظهار العمود" : "إخفاء العمود",
                icon:     isHidden ? "eye" : "eye-off",
                disabled: !colKey,
                onClick: () => {
                    if (colKey) {
                        handleHiddenColumnsChange(colKey, !hiddenColumnsSet.has(colKey), hiddenColumnKeys);
                        showToast(isHidden ? "تم إظهار العمود" : "تم إخفاء العمود", "info");
                    }
                },
            });
        }

        // ─── جدول — قفل/فتح جماعي للصفحة الحالية ──────────────────────────
        if (ctx.type === "table" && !isReadOnly) {
            const lockable   = items.filter(r => getRowPermissions(r, false).canLock);
            const unlockable = items.filter(r => getRowPermissions(r, false).canUnlock);

            if (lockable.length > 0) {
                menuItems.push({
                    label: `قفل الكل (${lockable.length} مستند)`,
                    icon: "lock",
                    onClick: () => {
                        if (!window.confirm(`تأكيد قفل ${lockable.length} مستند في هذه الصفحة؟`)) return;
                        lockable.reduce(
                            (chain, doc) => chain.then(() => lockMut.mutateAsync(doc.id).catch(() => null)),
                            Promise.resolve(null as unknown),
                        ).then(() => showToast(`تم قفل ${lockable.length} مستند`, "success"));
                    },
                });
            }

            if (unlockable.length > 0) {
                menuItems.push({
                    label: `فتح قفل الكل (${unlockable.length} مستند)`,
                    icon: "lock-open",
                    onClick: () => {
                        if (!window.confirm(`تأكيد فتح قفل ${unlockable.length} مستند في هذه الصفحة؟`)) return;
                        unlockable.reduce(
                            (chain, doc) => chain.then(() => unlockMut.mutateAsync(doc.id).catch(() => null)),
                            Promise.resolve(null as unknown),
                        ).then(() => showToast(`تم فتح قفل ${unlockable.length} مستند`, "success"));
                    },
                });
            }
        }

        return menuItems;
    }, [hiddenColumnsSet, hiddenColumnKeys, handleHiddenColumnsChange, isReadOnly, openEditModal, lockMut, unlockMut, cancelMut, items, showToast]);

    // ════════════════════════════════════════════════════════════════════════
    // SMART FILTER CALLBACK
    // ════════════════════════════════════════════════════════════════════════

    const handleSmartFilterApply = useCallback((query: string, result: { success: boolean; filters: Record<string, string> }) => {
        if (result.success && Object.keys(result.filters).length > 0) {
            setServerFilters(prev => ({ ...prev, ...result.filters }));
            setPage(1);
            const count = Object.keys(result.filters).length;
            showToast(`✓ ${count} فلتر من: "${query}"`, "success");
        } else if (result.success) {
            // تطابق نمط بدون فلاتر (مثل sort فقط)
            showToast(`✓ فُرِّز حسب: "${query}"`, "info");
        } else {
            showToast(`لم يُتعرف على: "${query}"`, "info");
        }
    }, [showToast]);

    // ════════════════════════════════════════════════════════════════════════
    // ROW ACTIONS
    // ════════════════════════════════════════════════════════════════════════

    const rowActions = useCallback((row: CommercialDocument) => {
        const { canEdit, canLock, canUnlock, canCancel } = getRowPermissions(row, !!isReadOnly);

        const handleCancel = () => {
            setCancelModal({ id: row.id, reason: '' });
        };

        return (
            <div style={{ display: "flex", gap: 3, justifyContent: "center" }}>
                {/* عرض — دائماً متاح */}
                <ActionBtn icon="ti-eye" title="عرض" onClick={() => { setViewDocId(row.id); setModal("view"); }} />

                {/* تعديل — !is_locked && !is_exported */}
                {canEdit && (
                    <ActionBtn
                        icon={loadingEdit ? "ti-loader-2" : "ti-pencil"}
                        title="تعديل" color="var(--blue)" disabled={loadingEdit}
                        onClick={() => openEditModal(row)}
                    />
                )}

                {/* قفل — غير مقفل + غير ملغى */}
                {canLock && (
                    <ActionBtn
                        icon="ti-lock" title="قفل المستند" color="var(--orange)"
                        disabled={lockMut.isPending}
                        onClick={() => {
                            if (window.confirm("تأكيد قفل هذا المستند؟ لن يمكن تعديله بعد القفل."))
                                lockMut.mutate(row.id);
                        }}
                    />
                )}

                {/* فتح القفل — مقفل + غير مُصدَّر */}
                {canUnlock && (
                    <ActionBtn
                        icon="ti-lock-open" title="فتح القفل" color="var(--blue)"
                        disabled={unlockMut.isPending}
                        onClick={() => {
                            if (window.confirm("تأكيد فتح قفل هذا المستند؟"))
                                unlockMut.mutate(row.id);
                        }}
                    />
                )}

                {/* إلغاء */}
                {canCancel && (
                    <ActionBtn
                        icon="ti-ban" title="إلغاء" color="var(--red)"
                        disabled={cancelMut.isPending}
                        onClick={handleCancel}
                    />
                )}
            </div>
        );
    }, [isReadOnly, loadingEdit, openEditModal, lockMut, unlockMut, cancelMut]);

    // ════════════════════════════════════════════════════════════════════════
    // HEADER ACTIONS
    // ════════════════════════════════════════════════════════════════════════

    const headerActions = useMemo(() => (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {isFetching && !isLoading && (
                <i className="ti ti-loader-2" aria-hidden="true" style={{ fontSize: 15, color: "var(--t4)", animation: "cdp-spin .8s linear infinite" }} />
            )}
            {isReadOnly && (
                <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: "color-mix(in srgb, var(--orange) 12%, transparent)", color: "var(--orange)", display: "flex", alignItems: "center", gap: 4 }}>
                    <i className="ti ti-lock" style={{ fontSize: 10 }} aria-hidden="true" />
                    للقراءة فقط
                </span>
            )}
            {/* مؤشر الأعمدة المخفية */}
            {hiddenColumnKeys.length > 0 && (
                <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: "color-mix(in srgb, var(--blue) 10%, transparent)", color: "var(--blue)", display: "flex", alignItems: "center", gap: 4 }}>
                    <i className="ti ti-eye-off" style={{ fontSize: 10 }} aria-hidden="true" />
                    {hiddenColumnKeys.length} مخفي
                </span>
            )}
            {/* زر إعادة ضبط layout — يظهر فقط عند وجود snapshot محفوظ */}
            {initialSnapshot && (
                <button
                    title="إعادة ضبط تخطيط الأعمدة (الترتيب، العرض، المخفي، الفلاتر)"
                    onClick={() => {
                        if (window.confirm("إعادة ضبط تخطيط الجدول للإعدادات الافتراضية؟")) {
                            resetColState();
                            window.location.reload();
                        }
                    }}
                    style={{ height: 28, width: 28, borderRadius: 7, border: "1px solid var(--b2)", background: "var(--bg2)", color: "var(--t4)", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s" }}
                    aria-label="إعادة ضبط تخطيط الجدول"
                >
                    <i className="ti ti-layout-columns" aria-hidden="true" />
                </button>
            )}
            {isSalable && !isReadOnly && (
                <button onClick={() => setModal("quick")} style={{ height: 32, padding: "0 14px", borderRadius: 8, border: `1px solid color-mix(in srgb, ${opColor} 35%, transparent)`, background: `color-mix(in srgb, ${opColor} 8%, transparent)`, color: opColor, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
                    <i className="ti ti-bolt" style={{ fontSize: 14 }} aria-hidden="true" />
                    بيع سريع
                </button>
            )}
            {!isReadOnly && (
                <button onClick={() => setModal("add")} style={{ height: 32, padding: "0 16px", borderRadius: 8, border: "none", background: opColor, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: `0 2px 8px color-mix(in srgb, ${opColor} 30%, transparent)`, fontFamily: "inherit" }}>
                    <i className="ti ti-plus" style={{ fontSize: 15 }} aria-hidden="true" />
                    مستند جديد
                </button>
            )}
        </div>
    ), [isFetching, isLoading, isReadOnly, isSalable, opColor, hiddenColumnKeys.length, initialSnapshot, resetColState]);

    // ── Page title ────────────────────────────────────────────────────────────
    const tableTitle = useMemo(() => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: `color-mix(in srgb, ${opColor} 14%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className={`ti ${isPurch ? "ti-shopping-cart" : "ti-file-invoice"}`} style={{ fontSize: 16, color: opColor }} aria-hidden="true" />
            </div>
            <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: "var(--t1)", lineHeight: 1.2 }}>{docType?.name ?? typeCode}</div>
                {selectedYear && <div style={{ fontSize: 10, color: "var(--t4)", marginTop: 1 }}>{selectedYear.name}</div>}
            </div>
        </div>
    ), [docType?.name, typeCode, isPurch, opColor, selectedYear]);

    // ── Callbacks ─────────────────────────────────────────────────────────────
    const isExpandable  = useCallback((_row: CommercialDocument) => true, []);
    const renderExpanded = useCallback((row: CommercialDocument) => <ExpandedLines doc={row} />, []);
    const rowClassName = useCallback((row: CommercialDocument): string | undefined => {
        const status = getDocStatus(row);
        // cdp-row-overdue يُطبَّق عبر conditionalFormatting فقط (لا ازدواج)
        if (status === "cancelled") return "cdp-row-cancelled";
        return undefined;
    }, []);

    // ════════════════════════════════════════════════════════════════════════
    // RENDER
    // ════════════════════════════════════════════════════════════════════════

    return (
        <>
            <style>{`
                @keyframes cdp-spin    { to { transform: rotate(360deg); } }
                @keyframes cdp-toast-in {
                    from { transform: translateY(10px); opacity: 0; }
                    to   { transform: translateY(0);    opacity: 1; }
                }
                .cdp-row-cancelled td { opacity: .55; }
                .cdp-row-overdue td:first-child { border-right: 3px solid var(--red) !important; }
            `}</style>

            <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14, minHeight: 0, flex: 1, direction: "rtl", fontFamily: "Tajawal, sans-serif" }}>

                {/* Summary cards */}
                {items.length > 0 && <SummaryCards items={items} opColor={opColor} />}

                {/* DataTable v10.2 — محاطة بـ ErrorBoundary لمنع أي خطأ من إسقاط الصفحة */}
                <div style={{ background: "var(--bg1)", border: "1px solid var(--b1)", borderRadius: "var(--r3)", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.06)", flex: 1 }}>
                    <DataTableErrorBoundary>
                    <DataTable<CommercialDocument>
                        data={items}
                        columns={allColumns}
                        columnDefs={allColumns}
                        hiddenColumnKeys={hiddenColumnKeys}         // الأعمدة المخفية الأولية
                        onHiddenColumnsChange={handleHiddenColumnsChange}  // callback لحفظ التغييرات
                        rowKey={r => r.id}
                        loading={isLoading}

                        // ── Reorder + Sort + URL ────────────────────────
                        columnReorder={true}
                        initialColumnOrder={columnOrder}
                        onColumnOrderChange={handleColumnOrderChange}
                        multiSort={true}
                        onMultiSortChange={handleMultiSortChange}
                        urlState={{
                            enabled: true,
                            prefix: `commercial_${typeCode}`,
                            filters: true, sort: true, page: true, search: true,
                        }}

                        // ── Virtual scroll: فقط عند تعطيل pagination وتحميل كمية كبيرة ──
                        virtual={items.length > 100 ? { rowHeight: 40, containerHeight: 600, overscan: 8 } : undefined}

                        // ── تنسيق شرطي ─────────────────────────────────
                        conditionalFormatting={conditionalFormatting}

                        // ── لوحة المفاتيح ✅ مُفعَّل الآن مع RTL fix ──
                        keyboardNav={true}

                        // ── Batch edit: معطل (no-server-side mutations) ─
                        batchEdit={false}

                        // ── Column pinning ─────────────────────────────
                        pinnedColumns={{ start: ["document_number"] }}

                        // ── Pagination server-side ─────────────────────
                        pagination={{
                            page: Number(meta.current_page ?? 1),
                            perPage,
                            total:    Number(meta.total    ?? 0),
                            lastPage: Number(meta.last_page ?? 1),
                            onPage:    setPage,
                            onPerPage: n => { setPerPage(n); setPage(1); },
                        }}
                        onFilterChange={handleFilterChange}
                        onSearchChange={q => {
                            setServerFilters(prev => { const n = { ...prev }; q ? (n.search = q) : delete n.search; return n; });
                            setPage(1);
                        }}
                        allData={items as unknown as Record<string, unknown>[]}

                        // ── Selection + Batch Print ──────────────────────
                        selectable
                        bulkActions={(selectedRows: CommercialDocument[], clearSelection: () => void) => (
                            <button
                                onClick={() => { setBatchDocs(selectedRows as CommercialDocument[]); setBatchPrintOpen(true); }}
                                className="dt-bulk-btn"
                                type="button"
                            >
                                <i className="ti ti-printer" />
                                طباعة بالجملة ({selectedRows.length})
                            </button>
                        )}

                        // ── الميزات الأساسية ────────────────────────────
                        searchable
                        searchPlaceholder="بحث برقم المستند أو اسم المتعامل…"
                        showAggregates
                        aggregateLabel="إجمالي الصفحة"
                        expandable
                        renderExpanded={renderExpanded}
                        isExpandable={isExpandable}
                        rowActions={rowActions}
                        headerActions={headerActions}
                        title={tableTitle}
                        exportable
                        exportName={`${typeCode}_${selectedYear?.name ?? ""}`}
                        onRowClick={row => { setViewDocId(row.id); setModal("view"); }}
                        rowClassName={rowClassName}
                        emptyText={
                            !selectedYear  ? "الرجاء اختيار سنة مالية" :
                            !docType       ? "جارٍ تحميل نوع المستند…" :
                                            "لا توجد مستندات"
                        }

                        // ── 🆕 Excel Export ─────────────────────────────
                        enableExcelExport={true}
                        excelExportOptions={{
                            fileName: `${typeCode}_${selectedYear?.name ?? ""}_export`,
                            includeAggregates:    true,
                            includeHiddenColumns: false,
                            title: docType?.name ?? typeCode,
                        }}

                        // ── 🆕 Smart Filter عربي — مع أنماط ERP الجزائري ──
                        enableSmartFilter={true}
                        smartFilterPatterns={ERP_FILTER_PATTERNS}
                        onSmartFilterApply={handleSmartFilterApply}

                        // ── 🆕 Saved Views ──────────────────────────────
                        enableSavedViews={true}
                        savedViewsConfig={{
                            tableKey: `commercial_${typeCode}_${slug ?? "default"}`,
                            maxViews: 10,
                        }}

                        // ── 🆕 Context Menu — يستخدم ctx.row المُصلح ────
                        enableContextMenu={true}
                        contextMenuItems={contextMenuItems}
                    />
                    </DataTableErrorBoundary>
                </div>
            </div>

            {/* ── Modals ───────────────────────────────────────────────────── */}
            {(modal === "add" || modal === "edit") && (
                <CommercialDocumentModal
                    open
                    documentType={docType ?? null}
                    existingDocument={modal === "edit" ? (editDocFull ?? undefined) : undefined}
                    onClose={closeModal}
                    onSaved={() => {
                        closeModal();
                        invalidateDocs();
                        showToast(modal === "add" ? "تم إنشاء المستند بنجاح" : "تم تحديث المستند بنجاح");
                    }}
                />
            )}

            {modal === "quick" && (
                <QuickSaleModal
                    open
                    onClose={closeModal}
                    onSaved={(state: Record<string, unknown>) => {
                        closeModal();
                        invalidateDocs();
                        showToast(`تم إنشاء ${String(state.document_number ?? "المستند")} بنجاح`);
                    }}
                />
            )}

            {modal === "view" && viewDocId != null && (
                <DocumentViewModal
                    docId={viewDocId}
                    docType={docType ?? null}
                    onClose={closeModal}
                    onEdit={() => {
                        const doc = items.find(d => d.id === viewDocId);
                        if (doc) { closeModal(); openEditModal(doc); }
                    }}
                    isReadOnly={!!isReadOnly}
                />
            )}

            {convertDocId != null && (
                <ConvertDocumentModal
                    isOpen
                    onClose={() => setConvertDocId(null)}
                    onDone={() => { invalidateDocs(); showToast('تم تحويل المستند بنجاح', 'success'); }}
                    documentId={convertDocId}
                    sourceCode={convertSourceCode}
                    sourceDate={convertSourceDate}
                />
            )}

            {/* إلغاء المستند — مودال مع textarea */}
            {cancelModal && (
                <Modal
                    open={true}
                    onClose={() => setCancelModal(null)}
                    size="sm"
                    title="إلغاء المستند"
                    footer={
                        <>
                            <Button onClick={() => setCancelModal(null)} disabled={cancelMut.isPending}>
                                إلغاء
                            </Button>
                            <Button
                                variant="danger"
                                icon={<i className="ti ti-ban" />}
                                onClick={() => {
                                    if (!cancelModal.reason.trim()) return;
                                    cancelMut.mutate({ id: cancelModal.id, reason: cancelModal.reason.trim() });
                                    setCancelModal(null);
                                }}
                                disabled={cancelMut.isPending || !cancelModal.reason.trim()}
                            >
                                {cancelMut.isPending ? 'جاري الإلغاء...' : 'تأكيد الإلغاء'}
                            </Button>
                        </>
                    }
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 0' }}>
                        <div style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.6 }}>
                            سيتم إلغاء هذا المستند. لا يمكن التراجع عن هذا الإجراء.
                        </div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)' }}>
                            سبب الإلغاء <span style={{ color: 'var(--red)' }}>*</span>
                        </label>
                        <textarea
                            autoFocus
                            style={{
                                width: '100%', minHeight: 80, resize: 'vertical',
                                padding: '8px 10px', borderRadius: 'var(--r2)',
                                border: `1px solid ${cancelModal.reason.trim() ? 'var(--b3)' : 'var(--red)'}`,
                                background: 'var(--bg1)', color: 'var(--t1)',
                                fontSize: 13, fontFamily: 'inherit', outline: 'none',
                            }}
                            value={cancelModal.reason}
                            onChange={(e) => setCancelModal({ ...cancelModal, reason: e.target.value })}
                            placeholder="اذكر سبب الإلغاء..."
                        />
                    </div>
                </Modal>
            )}

            <BatchPrintModal
                open={batchPrintOpen}
                onClose={() => setBatchPrintOpen(false)}
                documents={batchDocs}
            />

            <ToastContainer />
        </>
    );
}

```

## FILE: resources/js/pages/documents/components/AdvancePaymentsPanel.tsx
```
import React from 'react';
import { fmtDZD } from '../utils/document.utils';
import type { AdvancePayment } from '../hooks/useAdvancePayments';

interface AdvancePaymentsPanelProps {
  advances:    AdvancePayment[] | undefined;
  isLoading:   boolean;
  onApply:     (advance: AdvancePayment) => void;
  disabled?:   boolean;
}

export function AdvancePaymentsPanel({
  advances, isLoading, onApply, disabled,
}: AdvancePaymentsPanelProps) {
  const [collapsed, setCollapsed] = React.useState(false);

  if (isLoading) {
    return (
      <div style={{
        marginTop: 10, padding: '10px 12px', borderRadius: 'var(--r2)',
        background: 'var(--bg3)', border: '1px solid var(--b2)',
        display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--t4)',
      }}>
        <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite', fontSize: 13 }} />
        جاري تحميل الدفعات المتاحة...
      </div>
    );
  }

  if (!advances || advances.length === 0) return null;

  const totalUnapplied = advances.reduce((s, a) => s + a.unapplied_amount, 0);

  return (
    <div style={{
      marginTop: 10, borderRadius: 'var(--r2)',
      border: '1px solid var(--b2)', overflow: 'hidden',
    }}>
      <button
        onClick={() => setCollapsed((v) => !v)}
        style={{
          width: '100%', padding: '8px 12px', display: 'flex',
          alignItems: 'center', gap: 6, cursor: 'pointer',
          background: 'var(--bg3)', border: 'none',
          color: 'var(--t2)', fontSize: 12, fontWeight: 700,
          fontFamily: 'inherit', textAlign: 'right',
        }}
      >
        <i className="ti ti-coin" style={{ fontSize: 12, color: 'var(--green)' }} />
        <span style={{ flex: 1 }}>دفعات متاحة للتطبيق</span>
        <span style={{
          padding: '1px 6px', borderRadius: 99, fontSize: 10,
          background: 'var(--greenb)', color: 'var(--green)', fontWeight: 700,
        }}>
          {fmtDZD(totalUnapplied)} دج
        </span>
        <i className={`ti ti-chevron-${collapsed ? 'down' : 'up'}`} style={{ fontSize: 10, color: 'var(--t4)' }} />
      </button>
      {!collapsed && (
        <div style={{ padding: '6px 8px', background: 'var(--bg1)' }}>
          {advances.map((adv) => (
            <div key={adv.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 8px', borderRadius: 'var(--r1)',
              opacity: disabled ? 0.6 : 1,
            }}>
              <i className="ti ti-currency-dollar" style={{ fontSize: 11, color: 'var(--green)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12, fontWeight: 600, color: 'var(--t2)',
                  display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
                }}>
                  <span>{adv.payment_number ?? `دفعة #${adv.id}`}</span>
                  <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--t4)' }}>
                    {adv.payment_mode_name}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--t4)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span>{adv.payment_date}</span>
                  {adv.reference && <span>مرجع: {adv.reference}</span>}
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                    المبلغ الأصلي: {fmtDZD(adv.amount)} دج
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'left', flexShrink: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', fontVariantNumeric: 'tabular-nums' }}>
                  {fmtDZD(adv.unapplied_amount)} دج
                </div>
                <button
                  onClick={() => { if (!disabled) onApply(adv); }}
                  disabled={disabled}
                  style={{
                    marginTop: 2, padding: '2px 8px', borderRadius: 'var(--r1)',
                    border: '1px solid var(--green)', background: 'transparent',
                    color: 'var(--green)', cursor: disabled ? 'not-allowed' : 'pointer',
                    fontSize: 10, fontWeight: 700, fontFamily: 'inherit',
                    whiteSpace: 'nowrap', transition: 'all .12s',
                  }}
                  onMouseEnter={(e) => {
                    if (!disabled) {
                      e.currentTarget.style.background = 'var(--green)';
                      e.currentTarget.style.color = 'white';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!disabled) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--green)';
                    }
                  }}
                >
                  <i className="ti ti-arrow-left" style={{ marginLeft: 3, fontSize: 9 }} />
                  تطبيق
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

```

## FILE: resources/js/pages/documents/components/AlertBell.tsx
```
import React, { useState, useRef, useEffect } from 'react';
import { useAlerts } from '../hooks/useAlerts';

export function AlertBell() {
  const { alerts, unreadCount, isLoading, markAsRead, markAllAsRead, refresh } = useAlerts();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const severityColor = (s: string) => {
    switch (s) {
      case 'critical': return 'var(--red)';
      case 'high':     return 'var(--orange)';
      case 'medium':   return 'var(--blue)';
      default:         return 'var(--t4)';
    }
  };

  const typeIcon = (t: string) => {
    switch (t) {
      case 'overdue_invoice': return 'ti-alert-circle';
      case 'upcoming_check':  return 'ti-checks';
      case 'low_stock':       return 'ti-package-off';
      case 'credit_exceeded': return 'ti-credit-card-off';
      default:                return 'ti-bell';
    }
  };

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => { setOpen(!open); if (!open) refresh(); }}
        style={{
          position: 'relative', padding: '6px 10px', borderRadius: 'var(--r2)',
          border: '1px solid var(--b2)', background: 'var(--bg2)',
          color: 'var(--t2)', cursor: 'pointer', fontSize: 16,
          display: 'flex', alignItems: 'center', gap: 4,
        }}
      >
        <i className="ti ti-bell" />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: 'var(--red)', color: 'white',
            borderRadius: '50%', width: 18, height: 18,
            fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4,
          width: 360, maxHeight: 420, overflowY: 'auto',
          background: 'var(--bg1)', border: '1px solid var(--b2)',
          borderRadius: 'var(--r2)', boxShadow: '0 8px 24px rgba(0,0,0,.15)',
          zIndex: 1000, padding: 8,
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '4px 6px 8px', borderBottom: '1px solid var(--b2)', marginBottom: 4,
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)' }}>
              التنبيهات
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              {unreadCount > 0 && (
                <button
                  onClick={() => { markAllAsRead(); }}
                  style={{
                    padding: '3px 8px', borderRadius: 'var(--r1)',
                    border: '1px solid var(--b3)', background: 'transparent',
                    color: 'var(--t3)', cursor: 'pointer', fontSize: 10,
                  }}
                >
                  تعيين الكل مقروء
                </button>
              )}
            </div>
          </div>

          {isLoading && (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--t4)', fontSize: 12 }}>
              جاري التحميل...
            </div>
          )}

          {!isLoading && alerts.length === 0 && (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--t4)', fontSize: 12 }}>
              لا توجد تنبيهات
            </div>
          )}

          {alerts.map((alert) => (
            <div
              key={alert.id}
              onClick={() => { if (!alert.is_read) markAsRead(alert.id); }}
              style={{
                padding: '8px 10px', borderRadius: 'var(--r1)',
                background: alert.is_read ? 'transparent' : 'color-mix(in srgb, var(--blue) 4%, transparent)',
                cursor: 'pointer', marginBottom: 2,
                borderLeft: `3px solid ${severityColor(alert.severity)}`,
                transition: 'background .12s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg3)'; }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = alert.is_read ? 'transparent' : 'color-mix(in srgb, var(--blue) 4%, transparent)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <i className={`ti ${typeIcon(alert.type)}`} style={{ fontSize: 12, color: severityColor(alert.severity) }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)' }}>
                  {alert.title}
                </span>
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--t3)', lineHeight: 1.4 }}>
                {alert.body}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

```

## FILE: resources/js/pages/documents/components/BankReconciliationPage.tsx
```
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';
import { fmtDZD } from '../utils/document.utils';

interface UnreconciledPayment {
  id:              number;
  payment_number:  string;
  payment_date:    string;
  amount:          number;
  party_name:      string;
  payment_mode:    string;
  treasury_account: string | null;
  reference:       string | null;
  bank_reference:  string | null;
}

export function BankReconciliationPage() {
  const slug    = useActiveSlug();
  const client  = useQueryClient();
  const [tab, setTab] = useState<'unreconciled' | 'reconciled'>('unreconciled');
  const [bankRefInput, setBankRefInput] = useState<Record<number, string>>({});

  const unreconciledQuery = useQuery<UnreconciledPayment[]>({
    queryKey: [slug, 'reconciliation', 'unreconciled'],
    queryFn: () => apiGet('/reconciliation/unreconciled'),
    enabled: !!slug,
  });

  const reconciledQuery = useQuery<UnreconciledPayment[]>({
    queryKey: [slug, 'reconciliation', 'reconciled'],
    queryFn: () => apiGet('/reconciliation/reconciled'),
    enabled: !!slug,
  });

  const reconcileMutation = useMutation({
    mutationFn: (data: { payment_id: number; bank_reference: string }) =>
      apiPost('/reconciliation/reconcile', data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: [slug, 'reconciliation'] });
    },
  });

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 20px', borderRadius: 'var(--r2)',
    border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
    background: active ? 'var(--emb)' : 'transparent',
    color: active ? 'var(--em)' : 'var(--t3)',
    fontFamily: 'inherit',
  });

  const inputStyle: React.CSSProperties = {
    padding: '6px 10px', borderRadius: 'var(--r1)',
    border: '1px solid var(--b3)', background: 'var(--bg1)',
    color: 'var(--t1)', fontSize: 12, fontFamily: 'inherit',
    width: 140, outline: 'none',
  };

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: 'var(--t1)' }}>
        المطابقة البنكية
      </h2>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        <button style={tabStyle(tab === 'unreconciled')} onClick={() => setTab('unreconciled')}>
          غير مطابقة ({unreconciledQuery.data?.length ?? 0})
        </button>
        <button style={tabStyle(tab === 'reconciled')} onClick={() => setTab('reconciled')}>
          مطابقة ({reconciledQuery.data?.length ?? 0})
        </button>
      </div>

      {tab === 'unreconciled' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {unreconciledQuery.isLoading && <div style={{ color: 'var(--t4)', fontSize: 13 }}>جاري التحميل...</div>}
          {unreconciledQuery.data?.length === 0 && (
            <div style={{ color: 'var(--t4)', fontSize: 13 }}>لا توجد مدفوعات غير مطابقة</div>
          )}
          {unreconciledQuery.data?.map((p) => (
            <div
              key={p.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 'var(--r2)',
                background: 'var(--bg2)', border: '1px solid var(--b2)',
              }}
            >
              <div style={{ flex: 2, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--t1)' }}>
                  {p.party_name}
                </div>
                <div style={{ fontSize: 10, color: 'var(--t4)', display: 'flex', gap: 8 }}>
                  <span>{p.payment_number}</span>
                  <span>{p.payment_date}</span>
                  <span>{p.payment_mode}</span>
                  {p.reference && <span>مرجع: {p.reference}</span>}
                </div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--t1)', whiteSpace: 'nowrap' }}>
                {fmtDZD(p.amount)}
              </div>
              <input
                type="text"
                placeholder="مرجع البنك..."
                value={bankRefInput[p.id] ?? ''}
                onChange={(e) => setBankRefInput((prev) => ({ ...prev, [p.id]: e.target.value }))}
                style={inputStyle}
              />
              <button
                disabled={!bankRefInput[p.id]?.trim() || reconcileMutation.isPending}
                onClick={() => {
                  const ref = bankRefInput[p.id]?.trim();
                  if (ref) {
                    reconcileMutation.mutate({ payment_id: p.id, bank_reference: ref });
                    setBankRefInput((prev) => ({ ...prev, [p.id]: '' }));
                  }
                }}
                style={{
                  padding: '6px 14px', borderRadius: 'var(--r1)',
                  border: '1px solid var(--em)', background: 'var(--emb)',
                  color: 'var(--em)', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                  fontFamily: 'inherit', whiteSpace: 'nowrap',
                }}
              >
                تطابق
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'reconciled' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {reconciledQuery.data?.length === 0 && (
            <div style={{ color: 'var(--t4)', fontSize: 13 }}>لا توجد مطابقات سابقة</div>
          )}
          {reconciledQuery.data?.map((p) => (
            <div
              key={p.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 'var(--r2)',
                background: 'var(--bg2)', border: '1px solid var(--b2)',
                opacity: 0.8,
              }}
            >
              <div style={{ flex: 2, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--t1)' }}>
                  {p.party_name}
                </div>
                <div style={{ fontSize: 10, color: 'var(--t4)', display: 'flex', gap: 8 }}>
                  <span>{p.payment_number}</span>
                  <span>{p.payment_date}</span>
                  <span style={{ color: 'var(--em)' }}>✓ مطابق</span>
                </div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--t1)', whiteSpace: 'nowrap' }}>
                {fmtDZD(p.amount)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'monospace' }}>
                {p.bank_reference}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

```

## FILE: resources/js/pages/documents/components/BarcodeInput.tsx
```
import React, { useRef, useEffect, useState } from 'react';
import { inputStyle } from './DocumentUIPrimitives';

interface BarcodeInputProps {
  products: Array<{ id: number; name: string; barcode?: string | null; ref?: string | null }>;
  onProductFound: (productId: number) => void;
  disabled?: boolean;
}

export function BarcodeInput({ products, onProductFound, disabled }: BarcodeInputProps) {
  const [value, setValue] = useState('');
  const [notFound, setNotFound] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [disabled]);

  const handleChange = (raw: string) => {
    const code = raw.trim();
    setValue(code);
    setNotFound(false);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (code.length < 2) return;

    timeoutRef.current = setTimeout(() => {
      const product = products.find(
        (p) => p.barcode === code || p.ref === code || String(p.id) === code,
      );
      if (product) {
        onProductFound(product.id);
        setValue('');
      } else {
        setNotFound(true);
        setTimeout(() => setNotFound(false), 2000);
      }
    }, 300);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
      <i className="ti ti-scan" style={{ fontSize: 16, color: 'var(--t4)' }} />
      <input
        ref={inputRef}
        type="text"
        value={value}
        disabled={disabled}
        placeholder="مسح باركود أو إدخال رمز المنتج..."
        onChange={(e) => handleChange(e.target.value)}
        style={{
          ...inputStyle(notFound),
          width: 220,
          fontSize: 12,
          direction: 'ltr',
        }}
      />
      {notFound && (
        <span style={{ fontSize: 11, color: 'var(--red)', whiteSpace: 'nowrap' }}>
          لم يُعثر على المنتج
        </span>
      )}
    </div>
  );
}

```

## FILE: resources/js/pages/documents/components/BatchPrintModal.tsx
```
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { apiGet } from '@/lib/api/core/client';
import { useActiveSlug, useActiveCompany } from '@/lib/store/appStore';
import { usePrintTemplatesList, renderPipelineToPopup, mapCompany } from '@/pages/settings/print-settings/runtime';
import { resolveTemplateById, resolveTemplate } from '@/pages/settings/print-settings/runtime/TemplateResolver';
import type { CompanyInfo } from '@/pages/settings/print-settings/types/data';
import type { PrintTemplate } from '@/pages/settings/print-settings/types';
import type { CommercialDocument } from '@/lib/api/core/types';

// ─── Styles ─────────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
  zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const modalStyle: React.CSSProperties = {
  width: '90vw', maxWidth: 700, maxHeight: '90vh',
  background: '#fff', borderRadius: 8, overflow: 'hidden',
  display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
};

const headerStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '12px 16px', borderBottom: '1px solid #e2e8f0',
};

const bodyStyle: React.CSSProperties = {
  flex: 1, overflow: 'auto', padding: 16,
};

const listItemStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '8px 12px', borderBottom: '1px solid #f0f1f3',
  fontSize: 13,
};

const footerStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  gap: 8, padding: '12px 16px', borderTop: '1px solid #e2e8f0',
};

const progressBarOuter: React.CSSProperties = {
  width: '100%', height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', marginBottom: 12,
};

const progressBarInner: React.CSSProperties = {
  height: '100%', background: '#2563eb', borderRadius: 3, transition: 'width 0.3s ease',
};

function printDocument(_docNum: string, data: Record<string, unknown>, tpl: PrintTemplate, company: CompanyInfo): Promise<void> {
  return new Promise((resolve) => {
    const source = { type: 'api-document' as const, doc: data };
    const win = renderPipelineToPopup(source, tpl, company);
    if (!win) { resolve(); return; }
    win.onafterprint = () => { resolve(); };
    setTimeout(resolve, 3000);
  });
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  documents: CommercialDocument[];
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function BatchPrintModal({ open, onClose, documents: docs }: Props) {
  const slug = useActiveSlug();
  const companyInfo = mapCompany(useActiveCompany());

  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [printResults, setPrintResults] = useState<{ num: string; ok: boolean }[]>([]);
  const cancelledRef = useRef(false);

  const docTypeCodes = useMemo(() => {
    const codes = new Set<string>();
    docs.forEach(d => {
      const code = (d.document_type as Record<string, unknown> | undefined)?.code as string ?? 'FV';
      codes.add(code);
    });
    return Array.from(codes);
  }, [docs]);

  const { data: allTemplates = [] } = usePrintTemplatesList();

  const templates = useMemo(() => {
    if (allTemplates.length === 0) return [];
    return allTemplates.filter(t => t.is_active && docTypeCodes.includes(t.doc_type_code));
  }, [allTemplates, docTypeCodes]);

  const handlePrintAll = useCallback(async () => {
    if (!slug || !companyInfo || isPrinting || docs.length === 0) return;
    cancelledRef.current = false;
    setIsPrinting(true);
    setPrintResults([]);
    setProgress({ current: 0, total: docs.length });

    for (let i = 0; i < docs.length; i++) {
      if (cancelledRef.current) break;
      const doc = docs[i];
      setProgress({ current: i + 1, total: docs.length });

      try {
        const res = await apiGet<{ data: CommercialDocument }>(`/documents/${doc.id}`, { include: 'party,documentStatus,warehouse,lines,payments,totals' });
        const fullDoc = res.data;

        const code = ((fullDoc.document_type as Record<string, unknown> | undefined)?.code as string) ?? 'FV';
        const tpl = selectedTemplateId
          ? resolveTemplateById(templates, selectedTemplateId)
          : resolveTemplate(templates, code);

        const safeTpl = tpl ?? null;

        const docNum = (fullDoc as any).document_number ?? String(fullDoc.id);
        if (!safeTpl) {
          setPrintResults(prev => [...prev, { num: docNum, ok: false }]);
          continue;
        }
        await printDocument(docNum, fullDoc as unknown as Record<string, unknown>, safeTpl, companyInfo);

        setPrintResults(prev => [...prev, { num: docNum, ok: true }]);
      } catch {
        const docNum = (doc as any).document_number ?? String(doc.id);
        setPrintResults(prev => [...prev, { num: docNum, ok: false }]);
      }
    }

    setIsPrinting(false);
  }, [slug, companyInfo, docs, isPrinting, selectedTemplateId, templates]);

  const handleCancel = useCallback(() => {
    if (isPrinting) {
      cancelledRef.current = true;
      return;
    }
    onClose();
  }, [isPrinting, onClose]);

  if (!open) return null;

  const successCount = printResults.filter(r => r.ok).length;
  const failCount = printResults.filter(r => !r.ok).length;
  const done = !isPrinting && printResults.length > 0;
  const progressPct = progress.total > 0 ? ((printResults.length) / progress.total) * 100 : 0;

  return (
    <div style={overlayStyle} onClick={handleCancel}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={headerStyle}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
            <i className="ti ti-printer" style={{ marginLeft: 8 }} />
            طباعة بالجملة
            <span style={{ fontSize: 13, fontWeight: 400, marginRight: 8, color: '#666' }}>
              ({docs.length} مستند{docs.length !== 1 ? '' : ''})
            </span>
          </h3>
          {!isPrinting && (
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#666', padding: '0 4px', lineHeight: 1 }}>
              ✕
            </button>
          )}
        </div>

        <div style={bodyStyle}>
          {isPrinting && (
            <div style={progressBarOuter}>
              <div style={{ ...progressBarInner, width: `${progressPct}%` }} />
            </div>
          )}

          {isPrinting && (
            <p style={{ fontSize: 13, color: '#2563eb', marginBottom: 12 }}>
              <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite', marginLeft: 6 }} />
              جاري طباعة {progress.current} من {progress.total}…
            </p>
          )}

          {done && (
            <p style={{ fontSize: 13, color: failCount > 0 ? '#dc2626' : '#16a34a', marginBottom: 12 }}>
              <i className={`ti ${failCount > 0 ? 'ti-alert-circle' : 'ti-check-circle'}`} style={{ marginLeft: 6 }} />
              تمت الطباعة: {successCount} بنجاح{failCount > 0 ? `، ${failCount} فشل` : ''}
            </p>
          )}

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
              القالب
            </label>
            <select
              value={selectedTemplateId ?? ''}
              onChange={e => setSelectedTemplateId(e.target.value ? Number(e.target.value) : null)}
              disabled={isPrinting}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0',
                fontSize: 13, background: '#fff',
              }}
            >
              <option value="">القالب الافتراضي لكل نوع</option>
              {templates.map(t => (
                <option key={t.id} value={t.id ?? ''}>
                  {t.name ?? `${t.doc_type_code} — ${t.paper_size}`}
                </option>
              ))}
            </select>
          </div>

          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#333' }}>
            قائمة المستندات ({docs.length})
          </div>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
            {docs.map((doc, i) => {
              const docNum = (doc as any).document_number ?? `#${doc.id}`;
              const partyName = ((doc.party as Record<string, unknown> | undefined)?.name as string) ?? '';
              const result = printResults.find(r => r.num === docNum);
              return (
                <div key={doc.id ?? i} style={listItemStyle}>
                  <span style={{ color: '#999', minWidth: 24 }}>{i + 1}.</span>
                  <span style={{ fontWeight: 600, flex: 1 }}>{docNum}</span>
                  <span style={{ color: '#666', flex: 1 }}>{partyName}</span>
                  {result && (
                    <span style={{ color: result.ok ? '#16a34a' : '#dc2626' }}>
                      <i className={`ti ${result.ok ? 'ti-check' : 'ti-x'}`} />
                    </span>
                  )}
                  {isPrinting && !result && (
                    <span style={{ color: '#2563eb' }}>
                      <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div style={footerStyle}>
          <span style={{ fontSize: 13, color: '#666' }}>
            {done
              ? `تمت طباعة ${successCount} من ${docs.length} مستند`
              : isPrinting
                ? `جاري طباعة ${progress.current} من ${progress.total}…`
                : `جاهز لطباعة ${docs.length} مستند${docs.length !== 1 ? (docs.length < 11 ? '' : '') : ''}`}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleCancel}
              style={{
                padding: '8px 20px', border: '1px solid #e2e8f0', borderRadius: 6,
                background: '#fff', color: '#333', fontSize: 14, cursor: 'pointer',
              }}
            >
              {isPrinting ? 'إيقاف' : 'إلغاء'}
            </button>
            {!done && (
              <button
                onClick={handlePrintAll}
                disabled={isPrinting}
                style={{
                  padding: '8px 20px', border: 'none', borderRadius: 6,
                  background: isPrinting ? '#94a3b8' : '#2563eb',
                  color: '#fff', fontSize: 14, fontWeight: 600, cursor: isPrinting ? 'not-allowed' : 'pointer',
                }}
              >
                {isPrinting ? 'جارٍ الطباعة…' : 'طباعة الكل'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

```

## FILE: resources/js/pages/documents/components/BulkImportModal.tsx
```
import React, { useState, useCallback, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import type { LineItem, Product } from '../types/document.types';

interface ParsedRow {
  product_ref?: string;
  product_name?: string;
  quantity: number;
  unit_price_ht?: number;
  packaging_label?: string;
  line_note?: string;
  _match?: Product | null;
  _errors?: string;
}

interface BulkImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (lines: Array<Partial<LineItem>>) => void;
  products?: Product[];
}

const COLUMN_MAP: Record<string, keyof ParsedRow> = {
  'المنتج': 'product_name',
  'المرجع': 'product_ref',
  'الكمية': 'quantity',
  'السعر': 'unit_price_ht',
  'التعبئة': 'packaging_label',
  'ملاحظة': 'line_note',
};

export function BulkImportModal({ open, onClose, onImport, products }: BulkImportModalProps) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const productsIndex = useMemo(() => {
    const idx = new Map<string, Product>();
    if (!products) return idx;
    for (const p of products) {
      if (p.ref) idx.set(p.ref.toLowerCase(), p);
      if (p.barcode) idx.set(p.barcode.toLowerCase(), p);
    }
    return idx;
  }, [products]);

  const matchProduct = useCallback((row: ParsedRow): Product | null => {
    if (row.product_ref) {
      const byRef = productsIndex.get(row.product_ref.toLowerCase());
      if (byRef) return byRef;
    }
    if (row.product_name && products) {
      const name = row.product_name.toLowerCase().trim();
      const byName = products.find(p => p.name.toLowerCase().trim() === name);
      if (byName) return byName;
      const byPartial = products.find(p =>
        p.name.toLowerCase().trim().includes(name) || name.includes(p.name.toLowerCase().trim()),
      );
      if (byPartial) return byPartial;
    }
    return null;
  }, [products, productsIndex]);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

      const parsed: ParsedRow[] = json.map((row, i) => {
        const out: ParsedRow = { quantity: 0 };
        for (const [header, value] of Object.entries(row)) {
          const key = COLUMN_MAP[header.trim()] ?? guessColumn(header.trim());
          if (key === 'quantity') out.quantity = parseFloat(String(value)) || 0;
          else if (key === 'unit_price_ht') out.unit_price_ht = parseFloat(String(value)) || 0;
          else if (key) (out as any)[key] = String(value).trim();
        }
        if (!out.quantity) out._errors = 'الكمية مطلوبة';
        return out;
      });

      const matched = parsed.filter(r => r.quantity > 0 || r.product_ref || r.product_name);
      setRows(matched.map(r => ({ ...r, _match: matchProduct(r) })));
    };
    reader.readAsArrayBuffer(file);
  }, [products, productsIndex, matchProduct]);

  const matchedCount = rows.filter(r => r._match).length;
  const unmatchedCount = rows.length - matchedCount;
  const allMatched = rows.length > 0 && unmatchedCount === 0;

  const handleConfirm = useCallback(() => {
    const lines: Array<Partial<LineItem>> = rows.map(r => {
      const match = r._match;
      return {
        product_id: String(match!.id),
        description: r.product_name ?? match?.name ?? r.product_ref ?? '',
        quantity: r.quantity,
        unit_price_ht: r.unit_price_ht ?? (match?.default_selling_price_ht ? Number(match.default_selling_price_ht) : 0),
        price_per_pack: r.unit_price_ht ?? (match?.default_selling_price_ht ? Number(match.default_selling_price_ht) : 0),
        discount_mode: 'percent' as const,
        discount_percentage: 0,
        discount_amount_fixed: 0,
        tva_rate: match?.tva?.rate ?? 0,
        packaging_id: '',
        stock_lot_id: '',
        _packQty: 1,
        line_note: r.line_note,
      };
    });
    onImport(lines);
    setRows([]);
    setFileName('');
    onClose();
  }, [rows, onImport, onClose]);

  const handleClose = useCallback(() => {
    setRows([]);
    setFileName('');
    onClose();
  }, [onClose]);

  return (
    <Modal isOpen={open} onClose={handleClose} title="استيراد من Excel" style={{ maxWidth: 700 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 13, color: 'var(--t3)' }}>
          ارفع ملف Excel يحتوي على أعمدة: المنتج / المرجع، الكمية، السعر (اختياري)
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFile}
            style={{ display: 'none' }}
          />
          <Button size="sm" variant="outline" icon={<i className="ti ti-upload" />}
            onClick={() => fileRef.current?.click()}>
            اختيار ملف
          </Button>
          {fileName && <span style={{ fontSize: 12, color: 'var(--em)' }}>{fileName}</span>}
        </div>

        {rows.length > 0 && (
          <>
            <div style={{ fontSize: 12, color: 'var(--t4)', display: 'flex', gap: 10, alignItems: 'center' }}>
              <span>تم التعرف على {rows.length} سطر</span>
              {unmatchedCount > 0 && (
                <span style={{ color: 'var(--orange)' }}>
                  ({matchedCount} مطابق، {unmatchedCount} غير مطابق)
                </span>
              )}
              {allMatched && (
                <span style={{ color: 'var(--green)' }}>✓ الكل مطابق</span>
              )}
            </div>
            <div className="tw" style={{ maxHeight: 300, overflow: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>المنتج</th>
                    <th>الكمية</th>
                    <th>السعر</th>
                    <th>الحالة</th>
                    <th>ملاحظة</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} style={r._errors ? { background: 'var(--redb)' } : !r._match ? { background: 'var(--orangeb, #fff3e0)' } : undefined}>
                      <td>{i + 1}</td>
                      <td>{r.product_name ?? r.product_ref ?? '—'}</td>
                      <td>{r.quantity}</td>
                      <td>{r.unit_price_ht?.toLocaleString('fr-DZ') ?? '—'}</td>
                      <td>
                        {r._match
                          ? <span style={{ color: 'var(--green)', fontSize: 11 }}>✓ {r._match.name}</span>
                          : <span style={{ color: 'var(--orange)', fontSize: 11 }}>⚠ بدون مطابقة</span>
                        }
                      </td>
                      <td style={{ color: 'var(--t4)', fontSize: 12 }}>{r.line_note ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {unmatchedCount > 0 && (
              <div style={{ fontSize: 12, color: 'var(--red)', padding: '6px 10px', background: 'var(--redb)', borderRadius: 'var(--r1)' }}>
                ⚠ {unmatchedCount} منتج غير متطابق — يجب تطابق جميع المنتجات قبل الاستيراد. تأكد من صحة الاسم أو المرجع.
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button size="sm" variant="outline" onClick={handleClose}>إلغاء</Button>
              <Button size="sm" variant="primary" onClick={handleConfirm} disabled={!allMatched}>
                إضافة {rows.length} سطر
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function guessColumn(header: string): keyof ParsedRow | null {
  const h = header.toLowerCase().trim();
  if (/منتج|produit|product|item|article|سلعة|صنف/i.test(h)) return 'product_name';
  if (/مرجع|ref|code|sku|كود/i.test(h)) return 'product_ref';
  if (/كمية|qty|quantity|quantite|عدد/i.test(h)) return 'quantity';
  if (/سعر|prix|price|unit|ثمن/i.test(h)) return 'unit_price_ht';
  if (/تعبئة|pack|emballage/i.test(h)) return 'packaging_label';
  if (/ملاحظة|note|observ|remarq/i.test(h)) return 'line_note';
  return null;
}

```

## FILE: resources/js/pages/documents/components/CheckFormFields.tsx
```
import React from 'react';

interface CheckFormFieldsProps {
  checkNumber?: string;
  checkBank?:   string;
  checkDueDate?: string;
  onChange:     (fields: { check_number?: string; check_bank?: string; check_due_date?: string }) => void;
}

export function CheckFormFields({
  checkNumber = '',
  checkBank = '',
  checkDueDate = '',
  onChange,
}: CheckFormFieldsProps) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: 8,
      marginTop: 8,
      padding: '10px 12px',
      borderRadius: 'var(--r2)',
      background: 'color-mix(in srgb, var(--purple) 6%, var(--bg2))',
      border: '1px solid color-mix(in srgb, var(--purple) 20%, transparent)',
    }}>
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--purple)', marginBottom: 4 }}>
          <i className="ti ti-numbers" style={{ marginLeft: 4, fontSize: 10 }} />
          رقم الشيك
        </div>
        <input
          type="text"
          style={{
            width: '100%', padding: '6px 10px', borderRadius: 'var(--r2)',
            border: '1px solid var(--b3)',
            background: 'var(--bg1)', color: 'var(--t1)',
            fontSize: 12, fontFamily: 'Tajawal, sans-serif',
            outline: 'none', boxSizing: 'border-box',
          }}
          value={checkNumber}
          onChange={(e) => onChange({ check_number: e.target.value })}
          placeholder="رقم الشيك"
        />
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--purple)', marginBottom: 4 }}>
          <i className="ti ti-building-bank" style={{ marginLeft: 4, fontSize: 10 }} />
          البنك
        </div>
        <input
          type="text"
          style={{
            width: '100%', padding: '6px 10px', borderRadius: 'var(--r2)',
            border: '1px solid var(--b3)',
            background: 'var(--bg1)', color: 'var(--t1)',
            fontSize: 12, fontFamily: 'Tajawal, sans-serif',
            outline: 'none', boxSizing: 'border-box',
          }}
          value={checkBank}
          onChange={(e) => onChange({ check_bank: e.target.value })}
          placeholder="اسم البنك"
        />
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--purple)', marginBottom: 4 }}>
          <i className="ti ti-calendar-due" style={{ marginLeft: 4, fontSize: 10 }} />
          تاريخ الاستحقاق
        </div>
        <input
          type="date"
          style={{
            width: '100%', padding: '6px 10px', borderRadius: 'var(--r2)',
            border: '1px solid var(--b3)',
            background: 'var(--bg1)', color: 'var(--t1)',
            fontSize: 12, fontFamily: 'Tajawal, sans-serif',
            outline: 'none', boxSizing: 'border-box',
          }}
          value={checkDueDate}
          onChange={(e) => onChange({ check_due_date: e.target.value })}
        />
      </div>
    </div>
  );
}

```

## FILE: resources/js/pages/documents/components/ConvertDocumentModal.tsx
```
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';
import { tenantKeys } from '@/lib/api/core/queryKeys';
import Modal from '@/components/ui/Modal';
import { useConvertDocument } from '../hooks/useDocumentChain';

interface ConvertDocumentModalProps {
  isOpen:    boolean;
  onClose:   () => void;
  onDone:    () => void;
  documentId: number;
  sourceCode: string;
  sourceDate: string;
}

export default function ConvertDocumentModal({
  isOpen, onClose, onDone,
  documentId, sourceCode, sourceDate,
}: ConvertDocumentModalProps) {
  const slug  = useActiveSlug();
  const convertMut = useConvertDocument();

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [targetCode, setTargetCode]   = useState('');
  const [docDate, setDocDate]         = useState(todayStr);
  const [error, setError]             = useState('');

  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef  = useRef<HTMLButtonElement>(null);

  const { data: allowedTypes = [] } = useQuery({
    queryKey: tenantKeys.conversions.allowedTargets(slug, sourceCode),
    queryFn:  () => apiGet<{ code: string; name: string }[]>(`/document-type-conversions/${sourceCode}/allowed-targets`),
    staleTime: 10 * 60_000,
    enabled: !!sourceCode,
  });

  useEffect(() => {
    if (isOpen) {
      setTargetCode(allowedTypes[0]?.code ?? '');
      setDocDate(todayStr);
      setError('');
    }
  }, [isOpen, todayStr, allowedTypes]);

  const handleConvert = useCallback(() => {
    if (!targetCode) { setError('اختر نوع المستند'); return; }
    if (!docDate)    { setError('اختر التاريخ'); return; }
    setError('');

    console.log('[ConvertModal] sending date:', docDate);

    convertMut.mutate(
      { documentId, targetTypeCode: targetCode, documentDate: docDate },
      {
        onSuccess: () => { onDone(); onClose(); },
        onError:   (e: unknown) => setError(String((e as Record<string, unknown>)?.message ?? 'فشل التحويل')),
      },
    );
  }, [targetCode, docDate, documentId, convertMut, onDone, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'Tab') {
      e.preventDefault();
      const focusable = document.querySelectorAll<HTMLElement>(
        '#convert-modal input, #convert-modal select, #convert-modal button:not([disabled])'
      );
      const arr = Array.from(focusable);
      const idx = arr.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey) {
        arr[(idx - 1 + arr.length) % arr.length]?.focus();
      } else {
        arr[(idx + 1) % arr.length]?.focus();
      }
    }
    if ((e.key === 'Enter' || e.key === ' ') && document.activeElement === confirmRef.current) {
      e.preventDefault();
      handleConvert();
    }
  }, [onClose, handleConvert]);

  const isLoading = convertMut.isPending;

  return (
    <Modal open={isOpen} onClose={onClose} title="تحويل المستند">
      <div id="convert-modal" style={{ padding: '0 4px' }} onKeyDown={handleKeyDown}>
        {error && (
          <div style={{
            padding: '8px 12px', borderRadius: 'var(--r2)', marginBottom: 12,
            background: 'var(--redb)', border: '1px solid var(--red)',
            color: 'var(--red)', fontSize: 12, fontWeight: 600,
          }}>{error}</div>
        )}

        {/* قائمة أنواع المستندات المسموح التحويل إليها */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', marginBottom: 6 }}>
            تحويل إلى
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {allowedTypes.map(t => (
              <button
                key={t.code}
                type="button"
                onClick={() => setTargetCode(t.code)}
                onFocus={(e) => { (e.currentTarget as HTMLElement).style.outline = '2px solid var(--em)'; (e.currentTarget as HTMLElement).style.outlineOffset = '1px'; }}
                onBlur={(e) => { (e.currentTarget as HTMLElement).style.outline = 'none'; }}
                style={{
                  padding: '8px 16px', borderRadius: 'var(--r2)', cursor: 'pointer',
                  border: targetCode === t.code ? '2px solid var(--em)' : '1px solid var(--b3)',
                  background: targetCode === t.code ? 'color-mix(in srgb, var(--em) 10%, transparent)' : 'var(--bg2)',
                  color: targetCode === t.code ? 'var(--em)' : 'var(--t2)',
                  fontSize: 13, fontWeight: targetCode === t.code ? 700 : 500,
                  transition: 'all .1s',
                }}
              >
                {t.code} · {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* حقل التاريخ */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', marginBottom: 4, display: 'block' }}>
            تاريخ المستند الجديد
          </label>
          <input
            type="date"
            value={docDate}
            onChange={(e) => setDocDate(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 'var(--r2)',
              border: '1px solid var(--b3)', background: 'var(--bg1)', color: 'var(--t1)',
              fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none',
              boxSizing: 'border-box',
            }}
            autoFocus
          />
        </div>

        {/* الفوتر */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--b1)', paddingTop: 14 }}>
          <button
            ref={cancelRef}
            type="button"
            onClick={onClose}
            disabled={isLoading}
            style={{
              padding: '8px 18px', borderRadius: 'var(--r2)',
              border: '1px solid var(--b2)', background: 'var(--bg1)',
              color: 'var(--t2)', cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 600,
            }}
          >
            إلغاء
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={handleConvert}
            disabled={isLoading || !targetCode}
            style={{
              padding: '8px 24px', borderRadius: 'var(--r2)',
              border: 'none', background: 'var(--em)', color: '#fff',
              cursor: isLoading || !targetCode ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 700,
              opacity: isLoading ? 0.7 : 1,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {isLoading ? (
              <>
                <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
                جاري التحويل…
              </>
            ) : 'تحويل'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

```

## FILE: resources/js/pages/documents/components/CreditCheckBar.tsx
```
import React from 'react';
import { fmtDZD } from '../utils/document.utils';
import type { CreditCheckResult } from '../hooks/useCreditCheck';

interface CreditCheckBarProps {
  creditCheck:  CreditCheckResult | null | undefined;
  isLoading:    boolean;
  partyName?:   string;
}

export function CreditCheckBar({ creditCheck, isLoading, partyName }: CreditCheckBarProps) {
  if (isLoading) return null;
  if (!creditCheck) return null;

  if (!creditCheck.credit_limit) {
    if (creditCheck.overdue_invoices.count === 0) return null;
  }

  const usagePercent = creditCheck.credit_limit > 0
    ? Math.min(100, (creditCheck.used_credit / creditCheck.credit_limit) * 100)
    : 0;

  const barColor = creditCheck.will_exceed
    ? 'var(--red)'
    : usagePercent > 80
      ? 'var(--orange)'
      : 'var(--green)';

  return (
    <div style={{
      marginTop: 8, padding: '8px 12px',
      borderRadius: 'var(--r2)',
      background: creditCheck.will_exceed
        ? 'color-mix(in srgb, var(--red) 8%, transparent)'
        : 'var(--bg3)',
      border: creditCheck.will_exceed
        ? '1px solid color-mix(in srgb, var(--red) 30%, transparent)'
        : '1px solid var(--b2)',
    }}>
      {creditCheck.credit_limit > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
            <span style={{ color: 'var(--t3)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <i className="ti ti-credit-card" style={{ fontSize: 12 }} />
              حد الائتمان: <b style={{ color: 'var(--t1)' }}>{fmtDZD(creditCheck.credit_limit)} دج</b>
            </span>
            <span style={{
              color: barColor, fontWeight: 700, fontSize: 11,
            }}>
              {creditCheck.will_exceed
                ? `تجاوز بـ ${fmtDZD(creditCheck.exceed_by)} دج`
                : `متاح: ${fmtDZD(creditCheck.available_credit ?? 0)} دج`}
            </span>
          </div>

          <div style={{
            height: 5, borderRadius: 99, background: 'var(--b2)',
            overflow: 'hidden', marginBottom: 6,
          }}>
            <div style={{
              height: '100%',
              width: `${Math.min(100, usagePercent)}%`,
              background: barColor,
              borderRadius: 99,
              transition: 'width .3s',
            }} />
          </div>

          <div style={{ display: 'flex', gap: 12, fontSize: 10, color: 'var(--t4)' }}>
            <span>مستخدم: {fmtDZD(creditCheck.used_credit)} دج</span>
            {creditCheck.credit_days > 0 && (
              <span>مدة الائتمان: {creditCheck.credit_days} يوم</span>
            )}
            {creditCheck.suggested_due_date && (
              <span>الاستحقاق المقترح: {creditCheck.suggested_due_date}</span>
            )}
          </div>
        </>
      )}

      {creditCheck.overdue_invoices.count > 0 && (
        <div style={{
          marginTop: creditCheck.credit_limit > 0 ? 8 : 0,
          padding: '5px 8px', borderRadius: 'var(--r1)',
          background: 'color-mix(in srgb, var(--orange) 10%, transparent)',
          border: '1px solid var(--orange)',
          fontSize: 11, color: 'var(--orange)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 12, flexShrink: 0 }} />
          {partyName ?? 'الزبون'} لديه{' '}
          <b>{creditCheck.overdue_invoices.count}</b> فاتورة متأخرة
          بقيمة <b>{fmtDZD(creditCheck.overdue_invoices.total_amount)} دج</b>
        </div>
      )}

      {creditCheck.will_exceed && (
        <div style={{
          marginTop: 6, fontSize: 11, color: 'var(--red)',
          fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <i className="ti ti-ban" style={{ fontSize: 12 }} />
          هذا المستند سيتجاوز حد الائتمان — يتطلب موافقة المدير
        </div>
      )}
    </div>
  );
}

```

## FILE: resources/js/pages/documents/components/CustomerInsightPanel.tsx
```
import React from 'react';
import { fmtDZD } from '../utils/document.utils';
import type { CustomerInsightsData } from '../hooks/useCustomerInsights';

interface CustomerInsightPanelProps {
  insights:  CustomerInsightsData | null | undefined;
  isLoading: boolean;
}

export function CustomerInsightPanel({ insights, isLoading }: CustomerInsightPanelProps) {
  if (isLoading) {
    return (
      <div style={{
        padding: '12px 14px', borderRadius: 'var(--r2)',
        background: 'var(--bg3)', border: '1px solid var(--b2)',
        marginTop: 8, display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 12, color: 'var(--t4)',
      }}>
        <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite', fontSize: 13 }} />
        جاري تحميل تحليلات المتعامل...
      </div>
    );
  }

  if (!insights || !insights.party_id) return null;

  const {
    last_documents, document_count,
    monthly_avg_invoice, avg_payment_days, top_products,
  } = insights;

  const docLen = last_documents?.length ?? 0;

  return (
    <CollapsiblePanel title="تحليلات المتعامل" icon="ti-chart-bar" defaultOpen={false}>
      {/* الإحصائيات */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <StatChip label="عدد المستندات" value={String(document_count)} icon="ti-file-description" />
        {monthly_avg_invoice !== null && (
          <StatChip label="متوسط شهري" value={`${fmtDZD(monthly_avg_invoice)} دج`} icon="ti-calculator" />
        )}
        {avg_payment_days !== null && (
          <StatChip
            label="متوسط السداد"
            value={`${avg_payment_days > 0 ? '+' : ''}${avg_payment_days} يوم`}
            icon="ti-clock"
            color={avg_payment_days > 0 ? 'var(--red)' : 'var(--green)'}
          />
        )}
      </div>

      {/* آخر المستندات */}
      {docLen > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{
            fontSize: 10.5, fontWeight: 700, color: 'var(--t4)', marginBottom: 6,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <i className="ti ti-history" style={{ fontSize: 10 }} />
            آخر المستندات
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {last_documents.map((doc) => {
              const isOverdue = doc.status === 'overdue';
              const isUnpaid  = doc.remaining_amount > 0.01 && !isOverdue;
              return (
                <div key={doc.id} style={{
                  padding: '6px 8px', borderRadius: 'var(--r1)',
                  background: 'var(--bg2)', border: '1px solid var(--b1)',
                  fontSize: 11, display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', gap: 6,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <i className="ti ti-file" style={{ fontSize: 10, color: 'var(--t4)', flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {doc.document_number}
                    </span>
                    <span style={{ color: 'var(--t4)', fontSize: 10 }}>{doc.type_name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {fmtDZD(doc.net_to_pay)} دج
                    </span>
                    {isOverdue && (
                      <span style={{
                        padding: '1px 5px', borderRadius: 99, fontSize: 9,
                        background: 'var(--redb)', color: 'var(--red)', fontWeight: 700,
                      }}>
                        متأخر
                      </span>
                    )}
                    {isUnpaid && (
                      <span style={{
                        padding: '1px 5px', borderRadius: 99, fontSize: 9,
                        background: 'var(--orangeb)', color: 'var(--orange)', fontWeight: 700,
                      }}>
                        غير مسدد
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* المنتجات الأكثر شراء */}
      {top_products && top_products.length > 0 && (
        <div>
          <div style={{
            fontSize: 10.5, fontWeight: 700, color: 'var(--t4)', marginBottom: 6,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <i className="ti ti-star" style={{ fontSize: 10 }} />
            المنتجات الأكثر شراءً
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {top_products.map((p, i) => (
              <div key={p.id} style={{
                padding: '5px 8px', borderRadius: 'var(--r1)',
                background: 'var(--bg2)', border: '1px solid var(--b1)',
                fontSize: 11, display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', gap: 6,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: i === 0 ? 'var(--gold)' : 'var(--bg3)',
                    color: i === 0 ? 'white' : 'var(--t4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 800, flexShrink: 0,
                  }}>
                    {i + 1}
                  </span>
                  <span style={{ fontWeight: 600, color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </span>
                  {p.ref && <span style={{ color: 'var(--t4)', fontSize: 10, flexShrink: 0 }}>({p.ref})</span>}
                </div>
                <span style={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0, color: 'var(--t3)' }}>
                  {p.total_qty} وحدة · {fmtDZD(p.total_amount)} دج
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </CollapsiblePanel>
  );
}

function StatChip({ label, value, icon, color }: {
  label: string; value: string; icon: string; color?: string;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5, flex: '1 0 auto',
      padding: '5px 10px', borderRadius: 'var(--r1)',
      background: 'var(--bg3)', border: '1px solid var(--b2)',
      fontSize: 11,
    }}>
      <i className={`ti ${icon}`} style={{ fontSize: 11, color: color ?? 'var(--t4)' }} />
      <span style={{ color: 'var(--t4)' }}>{label}:</span>
      <span style={{ fontWeight: 700, color: color ?? 'var(--t2)', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
    </div>
  );
}

function CollapsiblePanel({ title, icon, defaultOpen, children }: {
  title: string; icon: string; defaultOpen: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div style={{
      marginTop: 8, borderRadius: 'var(--r2)',
      border: '1px solid var(--b2)', overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%', padding: '8px 12px', display: 'flex',
          alignItems: 'center', gap: 6, cursor: 'pointer',
          background: 'var(--bg3)', border: 'none',
          color: 'var(--t2)', fontSize: 12, fontWeight: 700,
          fontFamily: 'inherit', textAlign: 'right',
        }}
      >
        <i className={`ti ${icon}`} style={{ fontSize: 12, color: 'var(--t4)' }} />
        <span style={{ flex: 1 }}>{title}</span>
        <i className={`ti ti-chevron-${open ? 'up' : 'down'}`} style={{ fontSize: 10, color: 'var(--t4)' }} />
      </button>
      {open && (
        <div style={{ padding: '10px 12px', background: 'var(--bg1)' }}>
          {children}
        </div>
      )}
    </div>
  );
}

```

## FILE: resources/js/pages/documents/components/DeliveryProgressBar.tsx
```
import React from 'react';

interface DeliveryProgressBarProps {
  quantity:           number;
  deliveredQuantity:  number;
  returnedQuantity:   number;
}

export function DeliveryProgressBar({
  quantity,
  deliveredQuantity,
  returnedQuantity,
}: DeliveryProgressBarProps) {
  const remaining = quantity - deliveredQuantity - returnedQuantity;
  const deliveredPct = quantity > 0 ? Math.min(100, (deliveredQuantity / quantity) * 100) : 0;
  const returnedPct  = quantity > 0 ? Math.min(100, (returnedQuantity  / quantity) * 100) : 0;

  const isFullyDelivered = remaining <= 0;

  return (
    <div style={{ minWidth: 160 }}>
      <div style={{
        height: 6, borderRadius: 99, background: 'var(--b2)',
        overflow: 'hidden', position: 'relative',
      }}>
        <div style={{
          height: '100%', borderRadius: 99,
          width: `${deliveredPct}%`,
          background: 'var(--em)',
          transition: 'width .3s',
          position: 'absolute', right: 0, top: 0,
        }} />
        <div style={{
          height: '100%', borderRadius: 99,
          width: `${returnedPct}%`,
          background: 'var(--purple)',
          transition: 'width .3s',
          position: 'absolute', right: 0, top: 0,
          opacity: 0.6,
        }} />
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: 10, color: 'var(--t4)', marginTop: 2,
      }}>
        <span>
          {deliveredQuantity > 0 && (
            <span style={{ color: 'var(--em)', fontWeight: 600 }}>
              {deliveredQuantity}
            </span>
          )}
          {returnedQuantity > 0 && (
            <span style={{ color: 'var(--purple)', fontWeight: 600, marginRight: 4 }}>
              (مرتجع {returnedQuantity})
            </span>
          )}
          <span style={{ marginRight: 4 }}>
            / {quantity}
          </span>
        </span>
        <span style={{
          fontWeight: 700,
          color: isFullyDelivered ? 'var(--green)' : 'var(--orange)',
        }}>
          {isFullyDelivered ? 'مُسلَّم كلياً' : `${Math.round(100 - (remaining / quantity) * 100)}%`}
        </span>
      </div>
    </div>
  );
}

```

## FILE: resources/js/pages/documents/components/DocumentChainPanel.tsx
```
import React, { useState } from 'react';
import { fmtDZD, fmtDate } from '../utils/document.utils';
import { STATUS_CONFIG } from '../types/document.types';
import type { DocumentChain, ChainNode } from '../hooks/useDocumentChain';

interface TargetType {
  code: string;
  name: string;
}

interface DocumentChainPanelProps {
  chain:           DocumentChain | null | undefined;
  isLoading:       boolean;
  currentId:       number;
  allowedTargets:  TargetType[];
  onConvert:       (targetCode: string) => void;
  onNavigate:      (documentId: number) => void;
  isReadOnly:      boolean;
}

function ChainNodeCard({
  node, isCurrent, onNavigate,
}: { node: ChainNode; isCurrent: boolean; onNavigate: (id: number) => void }) {
  const statusCfg = STATUS_CONFIG[node.status] ?? { label: node.status_label, color: 'var(--t4)', bg: 'var(--bg3)' };

  return (
    <div
      onClick={() => !isCurrent && onNavigate(node.id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 10px', borderRadius: 'var(--r2)',
        border: isCurrent
          ? '1px solid var(--em)'
          : '1px solid var(--b2)',
        background: isCurrent ? 'var(--emb)' : 'var(--bg2)',
        cursor: isCurrent ? 'default' : 'pointer',
        transition: 'all .15s',
        minWidth: 0,
        opacity: node.is_cancellation ? 0.65 : 1,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontWeight: 700, fontSize: 12,
            color: isCurrent ? 'var(--em)' : 'var(--t1)',
          }}>
            {node.document_number}
          </span>
          <span style={{
            padding: '1px 5px', borderRadius: 99, fontSize: 9, fontWeight: 700,
            background: statusCfg.bg, color: statusCfg.color,
          }}>
            {node.status_label}
          </span>
          {node.is_cancellation && (
            <span style={{ fontSize: 9, color: 'var(--red)' }}>مرتجع</span>
          )}
        </div>
        <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 1 }}>
          {node.document_type} · {node.type_name} · {fmtDate(node.document_date)} · {fmtDZD(node.net_to_pay)} دج
        </div>
      </div>
      {!isCurrent && (
        <i className="ti ti-external-link" style={{ fontSize: 11, color: 'var(--t4)', flexShrink: 0 }} />
      )}
    </div>
  );
}

function NodeWithChildren({
  node, isCurrent, onNavigate,
}: { node: ChainNode; isCurrent: boolean; onNavigate: (id: number) => void }) {
  return (
    <div>
      <ChainNodeCard node={node} isCurrent={isCurrent} onNavigate={onNavigate} />
      {node.children && node.children.length > 0 && (
        <div style={{ marginTop: 4, marginRight: 16, borderRight: '2px solid var(--b2)', paddingRight: 8 }}>
          {node.children.map(child => (
            <div key={child.id} style={{ marginTop: 4 }}>
              <NodeWithChildren node={child} isCurrent={isCurrent && child.id === -1} onNavigate={onNavigate} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DocumentChainPanel({
  chain, isLoading, currentId, allowedTargets, onConvert, onNavigate, isReadOnly,
}: DocumentChainPanelProps) {
  const [showConvert, setShowConvert] = useState(false);

  if (isLoading) {
    return (
      <div style={{ padding: '8px 0', fontSize: 11, color: 'var(--t4)', display: 'flex', gap: 6, alignItems: 'center' }}>
        <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
        جاري تحميل سلسلة المستندات...
      </div>
    );
  }

  if (!chain) return null;

  const hasRelations = chain.ancestors.length > 0 || chain.descendants.length > 0;

  return (
    <div style={{
      marginBottom: 14, padding: '10px 14px',
      background: 'var(--bg2)', borderRadius: 'var(--r2)',
      border: '1px solid var(--b2)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: hasRelations ? 10 : 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--t3)' }}>
          <i className="ti ti-link" style={{ fontSize: 12 }} />
          سلسلة المستندات
          {hasRelations && (
            <span style={{
              padding: '1px 6px', borderRadius: 99, fontSize: 10,
              background: 'var(--bg3)', color: 'var(--t4)',
            }}>
              {chain.ancestors.length + chain.descendants.length} مستند مرتبط
            </span>
          )}
        </div>

        {!isReadOnly && allowedTargets.length > 0 && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowConvert(!showConvert)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 10px', borderRadius: 'var(--r2)',
                border: '1px solid var(--blue)', background: 'var(--blueb)',
                color: 'var(--blue)', cursor: 'pointer', fontSize: 11, fontWeight: 700,
              }}
            >
              <i className="ti ti-arrows-exchange" style={{ fontSize: 12 }} />
              تحويل إلى...
              <i className={`ti ti-chevron-${showConvert ? 'up' : 'down'}`} style={{ fontSize: 10 }} />
            </button>

            {showConvert && (
              <div style={{
                position: 'absolute', left: 0, top: '100%', marginTop: 4,
                background: 'var(--bg1)', border: '1px solid var(--b2)',
                borderRadius: 'var(--r2)', boxShadow: '0 4px 16px rgba(0,0,0,.2)',
                zIndex: 100, minWidth: 160, overflow: 'hidden',
              }}>
                {allowedTargets.map(t => (
                  <button
                    key={t.code}
                    onClick={() => { setShowConvert(false); onConvert(t.code); }}
                    style={{
                      width: '100%', padding: '8px 12px', textAlign: 'right',
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 12, color: 'var(--t1)',
                      borderBottom: '1px solid var(--b1)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    {t.code} · {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {hasRelations && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {chain.ancestors.map((ancestor, i) => (
            <div key={ancestor.id}>
              <ChainNodeCard node={ancestor} isCurrent={false} onNavigate={onNavigate} />
              <div style={{ marginRight: 16, borderRight: '2px solid var(--b2)', height: 6 }} />
            </div>
          ))}

          <ChainNodeCard node={chain.current} isCurrent onNavigate={onNavigate} />

          {chain.descendants.length > 0 && (
            <div style={{ marginRight: 16, borderRight: '2px solid var(--b2)', paddingRight: 8, marginTop: 4 }}>
              {chain.descendants.map(desc => (
                <div key={desc.id} style={{ marginTop: 4 }}>
                  <NodeWithChildren node={desc} isCurrent={false} onNavigate={onNavigate} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!hasRelations && (
        <div style={{ fontSize: 11, color: 'var(--t4)' }}>
          لا توجد مستندات مرتبطة
        </div>
      )}
    </div>
  );
}

```

## FILE: resources/js/pages/documents/components/DocumentLineRow.tsx
```
import React, { memo } from 'react';
import { calcLineTotal, fmtDZD, toNum } from '../utils/document.utils';
import { ProductSearch } from './ProductSearch';
import { cellStyle } from './DocumentUIPrimitives';
import type { LineItem, Product, ColKey } from '../types/document.types';
import type { LineStockValidation } from '../utils/document.utils';
import type { ComputeLineWarning } from '../hooks/useComputeLine';

interface WarehouseOption {
  id:   number;
  name: string;
}

interface DocumentLineRowProps {
  line:           LineItem;
  idx:            number;
  visibleCols:    Set<ColKey>;
  isPurchase:     boolean;
  disabled:       boolean;
  products:       Product[];
  stockData:      Record<number, number>;
  stockValidation: LineStockValidation;
  onUpdate:       (idx: number, patch: Partial<LineItem>, product?: Product | null) => void;
  onRemove:       (idx: number) => void;
  onDuplicate:    (idx: number) => void;
  isTvaExempt?:   boolean;
  lineWarnings?:  ComputeLineWarning[];
  warehouses?:    WarehouseOption[];
}

function CellInput({
  value, onChange, type = 'number', min, step, disabled, highlight, width,
}: {
  value:      number | string;
  onChange:   (v: string) => void;
  type?:      string;
  min?:       number;
  step?:      number;
  disabled?:  boolean;
  highlight?: boolean;
  width?:     number;
}) {
  return (
    <input
      type={type}
      value={value}
      min={min}
      step={step}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...cellStyle(highlight), width: width ?? '100%' }}
    />
  );
}

export const DocumentLineRow = memo(function DocumentLineRow({
  line, idx, visibleCols, isPurchase, disabled, products, stockData,
  stockValidation, onUpdate, onRemove, onDuplicate, isTvaExempt, lineWarnings, warehouses,
}: DocumentLineRowProps) {

  const { baseQty, gross, discountAmt, discPct, ht, tva: lineTva, ttc } = calcLineTotal(line);

  const prodFromList = products.find((p) => String(p.id) === line.product_id);
  const prod         = prodFromList ?? line._product;
  const packagings   = prod?.packagings ?? [];
  const lots         = prod?.has_lots
    ? (prod?.lots ?? []).filter((lt) => lt.remaining_quantity > 0)
    : [];

  const hasStockWarning = !stockValidation.ok;
  const computeWarnings = line._warnings ?? lineWarnings ?? [];
  const activeComputeWarnings = computeWarnings.filter(
    (w) => w.level !== 'info',
  );
  let lowMarginRow = false;
  if (!isPurchase && prod) {
    const cp = toNum(prod.current_cost_price) || toNum(prod.purchase_price_ht);
    if (cp > 0 && line.unit_price_ht > 0) {
      const threshold = prod.min_margin_percentage ?? 5;
      lowMarginRow = ((line.unit_price_ht - cp) / line.unit_price_ht) * 100 < threshold;
    }
  }
  const rowBg = lowMarginRow
    ? `color-mix(in srgb, var(--red) 15%, transparent)`
    : hasStockWarning || activeComputeWarnings.length > 0
      ? `color-mix(in srgb, ${stockValidation.blocking ? 'var(--red)' : 'var(--orange)'} 5%, transparent)`
      : undefined;

  const col = (key: ColKey) => visibleCols.has(key);

  return (
    <>
      <tr style={{
        borderBottom: '1px solid var(--b1)',
        background:   rowBg,
        transition:   'background .15s',
      }}>
        {col('idx') && (
          <td style={{ padding: '4px 6px', textAlign: 'center',
            color: 'var(--t4)', fontSize: 11 }}>
            {idx + 1}
          </td>
        )}

        {col('product') && (
          <td style={{ padding: '3px 4px' }}>
            <ProductSearch
              products={products}
              value={line.product_id}
              onChange={(id, p) => onUpdate(idx, { product_id: id }, p)}
              disabled={disabled}
              error={!line.product_id}
              isPurchase={isPurchase}
              stockData={stockData}
            />
          </td>
        )}

        {col('packaging') && (
          <td style={{ padding: '3px 4px' }}>
            {packagings.length > 0 ? (
              <select
                style={{ ...cellStyle(), cursor: 'pointer' }}
                value={line.packaging_id}
                disabled={disabled}
                onChange={(e) => onUpdate(idx, { packaging_id: e.target.value })}
              >
                <option value="">— —</option>
                {packagings.map((pk) => (
                  <option key={pk.id} value={String(pk.id)}>
                    {pk.label} ({pk.quantity})
                    {pk.is_default ? ' ★' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <span style={{ fontSize: 11, color: 'var(--t4)', padding: '0 6px' }}>—</span>
            )}
          </td>
        )}

        {col('lot') && (
          <td style={{ padding: '3px 4px' }}>
            {isPurchase ? (
              <CellInput
                type="text"
                value={line.lot_number_new ?? ''}
                onChange={(v) => onUpdate(idx, { lot_number_new: v })}
                disabled={disabled}
              />
            ) : (
              prod?.has_lots ? (
                <select
                  style={{ ...cellStyle(), cursor: 'pointer' }}
                  value={line.stock_lot_id}
                  disabled={disabled}
                  onChange={(e) => onUpdate(idx, { stock_lot_id: e.target.value })}
                >
                  <option value="">— اختر —</option>
                  {lots.map((lt) => (
                    <option key={lt.id} value={String(lt.id)}>
                      {lt.lot_number} ({lt.remaining_quantity})
                      {lt.expiration_date ? ` exp:${lt.expiration_date.slice(0, 7)}` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <span style={{ fontSize: 11, color: 'var(--t4)', padding: '0 6px' }}>—</span>
              )
            )}
          </td>
        )}

        {col('warehouse') && (
          <td style={{ padding: '3px 4px' }}>
            <select
              style={{ ...cellStyle(), cursor: 'pointer', fontSize: 10 }}
              value={line.warehouse_id ?? ''}
              disabled={disabled}
              onChange={(e) => onUpdate(idx, { warehouse_id: e.target.value || undefined })}
            >
              <option value="">— تلقائي —</option>
              {(warehouses ?? []).map((w) => (
                <option key={w.id} value={String(w.id)}>{w.name}</option>
              ))}
            </select>
          </td>
        )}

        {col('quantity') && (
          <td style={{ padding: '3px 4px' }}>
            <CellInput
              value={line.quantity}
              min={0.001}
              step={1}
              onChange={(v) => onUpdate(idx, { quantity: toNum(v) })}
              disabled={disabled}
              highlight={hasStockWarning && !stockValidation.blocking}
            />
          </td>
        )}

        {col('unit') && (
          <td style={{ padding: '3px 6px', textAlign: 'center',
            fontSize: 11, color: 'var(--t4)' }}>
            {prod?.unit?.symbol ?? '—'}
          </td>
        )}

        {col('unit_price') && (
          <td style={{ padding: '3px 4px' }}>
            <CellInput
              value={line.unit_price_ht}
              min={0}
              step={0.01}
              onChange={(v) => onUpdate(idx, { unit_price_ht: toNum(v) })}
              disabled={disabled}
            />
          </td>
        )}

        {col('pack_price') && (
          <td style={{ padding: '3px 4px' }}>
            <CellInput
              value={line.price_per_pack}
              min={0}
              step={0.01}
              onChange={(v) => onUpdate(idx, { price_per_pack: toNum(v) })}
              disabled={disabled || line._packQty <= 1}
            />
          </td>
        )}

        {col('orig_price') && (
          <td style={{ padding: '3px 6px', textAlign: 'left', direction: 'ltr',
            fontSize: 11, color: 'var(--t4)' }}>
            {fmtDZD(gross)}
          </td>
        )}

        {col('discount') && (
          <td style={{ padding: '3px 4px' }}>
            <div style={{ display: 'flex', gap: 2 }}>
              <select
                style={{ ...cellStyle(), width: 40, padding: '5px 2px', fontSize: 10 }}
                value={line.discount_mode}
                disabled={disabled}
                onChange={(e) => {
                  const newMode = e.target.value as 'percent' | 'fixed';
                  onUpdate(idx, newMode === 'fixed'
                    ? { discount_mode: 'fixed',   discount_percentage:   0 }
                    : { discount_mode: 'percent', discount_amount_fixed: 0 }
                  );
                }}
              >
                <option value="percent">%</option>
                <option value="fixed">دج</option>
              </select>
              <CellInput
                value={line.discount_mode === 'percent'
                  ? line.discount_percentage
                  : line.discount_amount_fixed}
                min={0}
                step={0.01}
                onChange={(v) => onUpdate(idx, line.discount_mode === 'percent'
                  ? { discount_percentage:   toNum(v), discount_amount_fixed: 0 }
                  : { discount_amount_fixed: toNum(v), discount_percentage:   0 }
                )}
                disabled={disabled}
              />
            </div>
          </td>
        )}

        {col('price_after') && (
          <td style={{ padding: '3px 6px', textAlign: 'left', direction: 'ltr',
            fontSize: 11, color: discountAmt > 0 ? 'var(--em)' : 'var(--t3)' }}>
            {fmtDZD(ht)}
          </td>
        )}

        {col('tva') && (
          <td style={{ padding: '3px 4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <CellInput
                value={line.tva_rate}
                min={0}
                step={1}
                onChange={(v) => onUpdate(idx, { tva_rate: toNum(v) })}
                disabled={disabled || isTvaExempt}
                width={isTvaExempt ? 40 : 60}
              />
              {isTvaExempt && (
                <span style={{
                  padding: '1px 5px', borderRadius: 99, fontSize: 9, fontWeight: 700,
                  background: 'color-mix(in srgb, var(--green) 12%, transparent)',
                  color: 'var(--green)', whiteSpace: 'nowrap',
                }}>
                  <i className="ti ti-circle-check" style={{ marginLeft: 2, fontSize: 8 }} />
                  معفى
                </span>
              )}
            </div>
          </td>
        )}

        {col('total_ht') && (
          <td style={{ padding: '3px 6px', textAlign: 'left', direction: 'ltr',
            fontSize: 11, color: 'var(--t2)' }}>
            {fmtDZD(ht)}
          </td>
        )}

        {col('total_ttc') && (
          <td style={{ padding: '3px 6px', textAlign: 'left', direction: 'ltr',
            fontSize: 12, fontWeight: 700, color: 'var(--em)' }}>
            {fmtDZD(ttc)}
          </td>
        )}

        {col('cost') && (
          <td style={{ padding: '3px 6px', textAlign: 'center', fontSize: 11, whiteSpace: 'nowrap' }}>
            {(() => {
              if (isPurchase || !prod) return <span style={{ color: 'var(--t4)' }}>—</span>;
              const costPrice = toNum(prod.current_cost_price) || toNum(prod.purchase_price_ht);
              if (!costPrice) return <span style={{ color: 'var(--t4)' }}>—</span>;
              return <span style={{ fontWeight: 600, color: 'var(--t2)' }}>{fmtDZD(costPrice)}</span>;
            })()}
          </td>
        )}

        {col('margin') && (
          <td style={{ padding: '3px 6px', textAlign: 'center', fontSize: 11, whiteSpace: 'nowrap' }}>
            {(() => {
              if (isPurchase || !prod) return <span style={{ color: 'var(--t4)' }}>—</span>;
              const costPrice = toNum(prod.current_cost_price) || toNum(prod.purchase_price_ht);
              if (!costPrice || !line.unit_price_ht) return <span style={{ color: 'var(--t4)' }}>—</span>;
              const unitMargin = line.unit_price_ht - costPrice;
              const marginPct = (unitMargin / line.unit_price_ht) * 100;
              const totalMargin = unitMargin * baseQty;
              const marginThreshold = prod?.min_margin_percentage ?? 5;
              const color  = marginPct < marginThreshold ? 'var(--red)' : marginPct < 10 ? 'var(--orange)' : 'var(--green)';
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
                  <span style={{ color, fontWeight: 700, fontSize: 12 }}>
                    {fmtDZD(unitMargin)} · {marginPct.toFixed(1)}%
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'monospace' }}>
                    {fmtDZD(totalMargin)}
                  </span>
                </div>
              );
            })()}
          </td>
        )}

        {col('line_note') && (
          <td style={{ padding: '3px 4px' }}>
            <input
              type="text"
              value={line.line_note ?? ''}
              placeholder="ملاحظة..."
              disabled={disabled}
              onChange={(e) => onUpdate(idx, { line_note: e.target.value })}
              style={{ ...cellStyle(), fontSize: 11 }}
            />
          </td>
        )}

        {col('actions') && (
          <td style={{ padding: '3px 4px', textAlign: 'center' }}>
            <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <button
                onClick={() => onDuplicate(idx)}
                disabled={disabled}
                title="تكرار السطر"
                style={{
                  width: 24, height: 24, borderRadius: 'var(--r1)',
                  border: '1px solid var(--b2)', background: 'var(--bg2)',
                  color: 'var(--t3)', cursor: disabled ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <i className="ti ti-copy" style={{ fontSize: 11 }} />
              </button>
              <button
                onClick={() => onRemove(idx)}
                disabled={disabled}
                title="حذف السطر"
                style={{
                  width: 24, height: 24, borderRadius: 'var(--r1)',
                  border: '1px solid color-mix(in srgb, var(--red) 30%, transparent)',
                  background: 'var(--redb)', color: 'var(--red)',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <i className="ti ti-trash" style={{ fontSize: 11 }} />
              </button>
            </div>
          </td>
        )}
      </tr>

      {/* تحذير المخزون — صف فرعي */}
      {hasStockWarning && (
        <tr style={{ background: rowBg }}>
          <td
            colSpan={visibleCols.size}
            style={{ padding: '3px 10px 6px', fontSize: 11,
              color: stockValidation.blocking ? 'var(--red)' : 'var(--orange)' }}
          >
            <i className={`ti ${stockValidation.blocking ? 'ti-alert-circle' : 'ti-alert-triangle'}`}
              style={{ marginLeft: 4 }} />
            {stockValidation.message}
          </td>
        </tr>
      )}

      {/* تحذيرات الحساب (compute) — صفوف فرعية */}
      {activeComputeWarnings.map((w, wi) => (
        <tr key={wi} style={{ background: rowBg }}>
          <td
            colSpan={visibleCols.size}
            style={{
              padding: '3px 10px 6px', fontSize: 11,
              color: w.level === 'error' ? 'var(--red)' : 'var(--orange)',
            }}
          >
            <i
              className={`ti ${w.level === 'error' ? 'ti-alert-circle' : 'ti-alert-triangle'}`}
              style={{ marginLeft: 4 }}
            />
            {w.message}
          </td>
        </tr>
      ))}
    </>
  );
});

```

## FILE: resources/js/pages/documents/components/DocumentUIPrimitives.tsx
```
// ════════════════════════════════════════════════════════════════════════════
// pages/documents/components/DocumentUIPrimitives.tsx
//
// مكونات UI بسيطة خالصة — لا حالة تجارية، لا API.
// قابلة للتصدير واستخدامها في أي مكان آخر.
// ════════════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ALL_COLUMNS, STATUS_CONFIG } from '../types/document.types';
import type { ColKey } from '../types/document.types';

// ─── Shared styles ────────────────────────────────────────────────────────────

export const inputStyle = (err?: boolean): React.CSSProperties => ({
  width:           '100%',
  boxSizing:       'border-box',
  padding:         '7px 10px',
  borderRadius:    'var(--r2)',
  border:          `1px solid ${err ? 'var(--red)' : 'var(--b3)'}`,
  background:      'var(--bg1)',
  color:           'var(--t1)',
  fontSize:        13,
  fontFamily:      'Tajawal, sans-serif',
  outline:         'none',
  transition:      'border-color .15s',
});

export const cellStyle = (highlight?: boolean): React.CSSProperties => ({
  width:        '100%',
  padding:      '5px 6px',
  borderRadius: 'var(--r1)',
  border:       `1px solid ${highlight ? 'var(--em)' : 'var(--b3)'}`,
  background:   highlight ? 'color-mix(in srgb, var(--em) 6%, var(--bg1))' : 'var(--bg1)',
  color:        'var(--t1)',
  fontSize:     12,
  fontFamily:   'Tajawal, sans-serif',
  outline:      'none',
  textAlign:    'center',
});

export const labelStyle: React.CSSProperties = {
  fontSize:        11,
  fontWeight:      700,
  color:           'var(--t3)',
  display:         'block',
  marginBottom:    4,
  textTransform:   'uppercase',
  letterSpacing:   0.4,
};

// ─── Label ────────────────────────────────────────────────────────────────────

export function Label({
  children,
  required,
}: {
  children:  React.ReactNode;
  required?: boolean;
}) {
  return (
    <label style={labelStyle}>
      {children}
      {required && <span style={{ color: 'var(--red)', marginRight: 3 }}>*</span>}
    </label>
  );
}

// ─── FieldError ───────────────────────────────────────────────────────────────

export function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <div style={{ color: 'var(--red)', fontSize: 11, marginTop: 3 }}>
      {msg}
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

export function Section({
  title, icon, badge, children, collapsible = false,
  defaultOpen = true, open: openProp, onOpenChange,
}: {
  title:        string;
  icon:         string;
  badge?:       React.ReactNode;
  children:     React.ReactNode;
  collapsible?: boolean;
  /** الحالة الابتدائية عند أول رسم — لا تُغيِّر أي استخدام حالي (افتراضياً true كما كان دائماً) */
  defaultOpen?: boolean;
  /** وضع "مُتحكَّم به" اختياري: مرّره من الأب لو احتجت فتح القسم تلقائياً لاحقاً
   *  (مثال: ظهور خطأ تحقق داخل قسم مطوي). عدم تمريره = نفس السلوك القديم تماماً. */
  open?:         boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;

  const toggle = () => {
    if (!collapsible) return;
    if (isControlled) onOpenChange?.(!open);
    else setInternalOpen(v => !v);
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          display:       'flex',
          alignItems:    'center',
          gap:           8,
          marginBottom:  open ? 12 : 0,
          paddingBottom: 8,
          borderBottom:  '1px solid var(--b1)',
          cursor:        collapsible ? 'pointer' : 'default',
        }}
        onClick={toggle}
      >
        <i className={`ti ${icon}`} style={{ color: 'var(--em)', fontSize: 15 }} />
        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--t2)',
          textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 }}>
          {title}
        </span>
        {badge}
        {collapsible && (
          <i className={`ti ti-chevron-${open ? 'up' : 'down'}`}
            style={{ fontSize: 12, color: 'var(--t4)' }} />
        )}
      </div>
      {open && children}
    </div>
  );
}

// ─── TotalCard ────────────────────────────────────────────────────────────────

export function TotalCard({
  label, value, bg, color, labelColor, large, muted,
}: {
  label:        string;
  value:        string;
  bg?:          string;
  color?:       string;
  labelColor?:  string;
  large?:       boolean;
  muted?:       boolean;
}) {
  return (
    <div style={{ padding: '10px 12px', background: bg ?? 'var(--bg2)',
      borderRadius: 'var(--r2)', opacity: muted ? 0.55 : 1 }}>
      <div style={{ fontSize: 11, color: labelColor ?? 'var(--t3)', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{
        fontSize: large ? 18 : 14, fontWeight: 700, color: color ?? 'var(--t1)',
        fontVariantNumeric: 'tabular-nums', direction: 'ltr', textAlign: 'right',
      }}>
        {value}
      </div>
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

export function Toggle({
  checked, onChange, label, subLabel, disabled,
}: {
  checked:   boolean;
  onChange:  (v: boolean) => void;
  label:     string;
  subLabel?: string;
  disabled?: boolean;
}) {
  return (
    <div
      onClick={() => !disabled && onChange(!checked)}
      style={{
        display:    'flex',
        alignItems: 'center',
        gap:        10,
        cursor:     disabled ? 'not-allowed' : 'pointer',
        padding:    '8px 12px',
        borderRadius: 'var(--r2)',
        background: checked ? 'color-mix(in srgb, var(--em) 10%, transparent)' : 'var(--bg3)',
        border:     `1px solid ${checked ? 'var(--em)' : 'var(--b2)'}`,
        transition: 'all .18s',
        userSelect: 'none',
        opacity:    disabled ? 0.5 : 1,
      }}
    >
      <div style={{
        width: 36, height: 20, borderRadius: 20, flexShrink: 0,
        background: checked ? 'var(--em)' : 'var(--b3)',
        position: 'relative', transition: 'background .18s',
      }}>
        <div style={{
          width: 14, height: 14, borderRadius: '50%', background: 'white',
          position: 'absolute', top: 3,
          right: checked ? 3 : 'auto',
          left:  checked ? 'auto' : 3,
          transition: 'all .18s',
          boxShadow: '0 1px 3px rgba(0,0,0,.2)',
        }} />
      </div>
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 600,
          color: checked ? 'var(--em)' : 'var(--t2)' }}>
          {label}
        </div>
        {subLabel && (
          <div style={{ fontSize: 10.5, color: 'var(--t4)' }}>{subLabel}</div>
        )}
      </div>
    </div>
  );
}

// ─── ComboBox ─────────────────────────────────────────────────────────────────

export interface ComboOption {
  id:          number;
  label:       string;
  sub?:        string;
  badge?:      string;
  badgeColor?: string;
}

interface ComboBoxProps {
  options:       ComboOption[];
  value:         string;
  onChange:      (id: string) => void;
  placeholder:   string;
  disabled?:     boolean;
  error?:        boolean;
  maxH?:         number;
  onAfterSelect?: () => void;
}

export function ComboBox({
  options, value, onChange, placeholder, disabled, error, maxH = 260, onAfterSelect,
}: ComboBoxProps) {
  const [open,       setOpen]       = useState(false);
  const [query,      setQuery]      = useState('');
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const ref          = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);
  const listRef      = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => String(o.id) === value);

  const filtered = useMemo(() => {
    if (!query.trim()) return options.slice(0, 80);
    const q = query.toLowerCase();
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || (o.sub ?? '').toLowerCase().includes(q),
    ).slice(0, 80);
  }, [options, query]);

  // Reset highlight when filtered list changes or dropdown closes
  useEffect(() => {
    if (!open) setHighlightIdx(-1);
    else if (filtered.length > 0) setHighlightIdx(0);
  }, [open, filtered.length]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIdx < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll<HTMLDivElement>('[data-combo-item]');
    items[highlightIdx]?.scrollIntoView({ block: 'nearest' });
  }, [highlightIdx]);

  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);

  const selectItem = (idx: number) => {
    const item = filtered[idx];
    if (!item) return;
    onChange(String(item.id));
    setOpen(false);
    setQuery('');
    onAfterSelect?.();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filtered.length === 0) return;
      const next = Math.min(highlightIdx + 1, filtered.length - 1);
      setHighlightIdx(next);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (highlightIdx <= 0) {
        setHighlightIdx(-1);
      } else {
        setHighlightIdx(highlightIdx - 1);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIdx >= 0 && highlightIdx < filtered.length) {
        selectItem(highlightIdx);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (disabled) return; setOpen((v) => !v); setTimeout(() => inputRef.current?.focus(), 50); }}
        style={{
          ...inputStyle(error),
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer', gap: 6, textAlign: 'right',
        }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis',
          whiteSpace: 'nowrap', color: selected ? 'var(--t1)' : 'var(--t4)' }}>
          {selected ? selected.label : placeholder}
        </span>
        {selected && !disabled && (
          <span
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
            style={{ color: 'var(--t4)', cursor: 'pointer', flexShrink: 0, fontSize: 11 }}
            title="مسح"
          >✕</span>
        )}
        <i className={`ti ti-chevron-${open ? 'up' : 'down'}`}
          style={{ fontSize: 11, color: 'var(--t4)', flexShrink: 0 }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          zIndex: 9999, background: 'var(--bg2)', border: '1px solid var(--b2)',
          borderRadius: 'var(--r2)', boxShadow: '0 8px 32px rgba(0,0,0,.22)',
          direction: 'rtl', overflow: 'hidden',
        }}>
          <div style={{ padding: '8px 8px 6px', borderBottom: '1px solid var(--b1)',
            background: 'var(--bg3)' }}>
            <div style={{ position: 'relative' }}>
              <i className="ti ti-search" style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--t4)', fontSize: 13, pointerEvents: 'none',
              }} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="ابحث..."
                style={{ ...inputStyle(), paddingRight: 28, fontSize: 12, background: 'var(--bg1)' }}
              />
            </div>
          </div>
          <div ref={listRef} style={{ maxHeight: maxH, overflowY: 'auto' }}>
            {filtered.length === 0
              ? <div style={{ padding: 16, textAlign: 'center', color: 'var(--t4)', fontSize: 12 }}>لا توجد نتائج</div>
              : filtered.map((o, i) => (
                <div
                  key={o.id}
                  data-combo-item
                  onClick={() => { selectItem(i); }}
                  onMouseEnter={(e) => { if (String(o.id) !== value) (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'; }}
                  onMouseLeave={(e) => { if (String(o.id) !== value) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  style={{
                    padding: '8px 12px', cursor: 'pointer',
                    background: highlightIdx === i
                      ? 'var(--emb)'
                      : String(o.id) === value ? 'var(--emb)' : 'transparent',
                    borderBottom: '1px solid var(--b1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                    outline: highlightIdx === i ? '2px solid var(--em)' : undefined,
                    outlineOffset: -2,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: 'var(--t1)',
                      fontWeight: String(o.id) === value ? 700 : 400,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {o.label}
                    </div>
                    {o.sub && (
                      <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 1 }}>
                        {o.sub}
                      </div>
                    )}
                  </div>
                  {o.badge && (
                    <span style={{
                      padding: '1px 7px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                      flexShrink: 0, background: o.badgeColor ?? 'var(--bg3)', color: 'var(--t3)',
                    }}>
                      {o.badge}
                    </span>
                  )}
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ColumnManager ────────────────────────────────────────────────────────────

export function ColumnManager({
  visible,
  onChange,
}: {
  visible:  Set<ColKey>;
  onChange: (c: Set<ColKey>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);

  const toggle = (key: ColKey) => {
    const col = ALL_COLUMNS.find((c) => c.key === key);
    if (col?.fixed) return;
    const next = new Set(visible);
    next.has(key) ? next.delete(key) : next.add(key);
    onChange(next);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="إدارة الأعمدة"
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 10px', borderRadius: 'var(--r2)',
          border: '1px solid var(--b2)', background: 'var(--bg2)',
          color: 'var(--t3)', cursor: 'pointer', fontSize: 11, fontWeight: 600,
        }}
      >
        <i className="ti ti-layout-columns" style={{ fontSize: 13 }} />
        الأعمدة
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0,
          width: 220, background: 'var(--bg2)', border: '1px solid var(--b2)',
          borderRadius: 'var(--r2)', boxShadow: '0 8px 24px rgba(0,0,0,.18)',
          zIndex: 9999, direction: 'rtl', overflow: 'hidden',
        }}>
          <div style={{
            padding: '8px 12px', fontSize: 10.5, fontWeight: 800,
            color: 'var(--t4)', textTransform: 'uppercase',
            borderBottom: '1px solid var(--b1)', background: 'var(--bg3)',
          }}>
            أظهر / أخفِ الأعمدة
          </div>
          {ALL_COLUMNS.filter((c) => !c.fixed).map((col) => (
            <div
              key={col.key}
              onClick={() => toggle(col.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', cursor: 'pointer',
                background: visible.has(col.key) ? 'var(--emb)' : 'transparent',
                borderBottom: '1px solid var(--b1)', transition: 'background .1s',
              }}
              onMouseEnter={(e) => { if (!visible.has(col.key)) (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'; }}
              onMouseLeave={(e) => { if (!visible.has(col.key)) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <i className={`ti ti-${visible.has(col.key) ? 'eye' : 'eye-off'}`}
                style={{ fontSize: 13, color: visible.has(col.key) ? 'var(--em)' : 'var(--t4)' }} />
              <span style={{ fontSize: 12.5, color: visible.has(col.key) ? 'var(--t1)' : 'var(--t3)' }}>
                {col.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: 'var(--t4)', bg: 'var(--bg3)' };
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      color: cfg.color, background: cfg.bg, whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  );
}

// ─── AlertBanner ──────────────────────────────────────────────────────────────

export function AlertBanner({
  type, message,
}: {
  type:    'error' | 'success' | 'warning' | 'info';
  message: string;
}) {
  const colors = {
    error:   { bg: 'var(--redb)',   border: 'var(--red)',   color: 'var(--red)',   icon: 'ti-alert-circle'    },
    success: { bg: 'var(--greenb)', border: 'var(--green)', color: 'var(--green)', icon: 'ti-check-circle'    },
    warning: { bg: 'var(--goldb)',  border: 'var(--gold)',  color: 'var(--gold)',  icon: 'ti-alert-triangle'  },
    info:    { bg: 'var(--bg3)',    border: 'var(--b2)',    color: 'var(--t3)',    icon: 'ti-info-circle'     },
  };
  const c = colors[type];
  return (
    <div style={{
      padding: '9px 14px', marginBottom: 14,
      borderRadius: 'var(--r2)',
      background: c.bg, border: `1px solid ${c.border}`, color: c.color,
      fontSize: 12.5, display: 'flex', gap: 7, alignItems: 'flex-start',
    }}>
      <i className={`ti ${c.icon}`} style={{ marginTop: 1 }} />
      <span>{message}</span>
    </div>
  );
}

// ─── Tabs ──────────────────────────────────────────────────────────────────────

export interface Tab {
  key:   string;
  label: string;
  icon:  string;
  badge?: number;
}

export function Tabs({
  tabs, activeKey, onChange, children, style,
}: {
  tabs:     Tab[];
  activeKey: string;
  onChange:  (key: string) => void;
  children?: React.ReactNode;
  style?:    React.CSSProperties;
}) {
  return (
    <div style={style}>
      <div style={{
        display: 'flex', gap: 2, borderBottom: '1px solid var(--b2)',
        marginBottom: 14, overflowX: 'auto',
      }}>
        {tabs.map((tab) => {
          const isActive = tab.key === activeKey;
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                borderRadius: 'var(--r1) var(--r1) 0 0',
                background: isActive ? 'var(--bg1)' : 'transparent',
                color: isActive ? 'var(--em)' : 'var(--t4)',
                borderBottom: isActive ? '2px solid var(--em)' : '2px solid transparent',
                transition: 'all .15s',
              }}
            >
              <i className={`ti ${tab.icon}`} style={{ fontSize: 13 }} />
              {tab.label}
              {tab.badge != null && (
                <span style={{
                  padding: '0 6px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                  background: isActive ? 'var(--emb)' : 'var(--bg3)',
                  color: isActive ? 'var(--em)' : 'var(--t4)',
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {children}
    </div>
  );
}

```

## FILE: resources/js/pages/documents/components/LineCard.tsx
```
import React from 'react';
import { fmtDZD, calcLineTotal, getProductStock, toNum } from '../utils/document.utils';
import { ProductSearch } from './ProductSearch';
import type { LineItem, Product } from '../types/document.types';
import type { LineStockValidation } from '../utils/document.utils';
import type { ComputeLineWarning } from '../hooks/useComputeLine';

interface LineCardProps {
  line:            LineItem;
  idx:             number;
  products:        Product[];
  isPurchase:      boolean;
  disabled:        boolean;
  stockData:       Record<number, number>;
  stockValidation: LineStockValidation;
  isTvaExempt?:    boolean;
  lineWarnings?:   ComputeLineWarning[];
  warehouses?:     Array<{ id: number; name: string }>;
  onUpdate:        (idx: number, patch: Partial<LineItem>, product?: Product | null) => void;
  onRemove:        (idx: number) => void;
  onDuplicate:     (idx: number) => void;
}

export function LineCard({
  line, idx, products, isPurchase, disabled, stockData, stockValidation,
  isTvaExempt, lineWarnings, warehouses,
  onUpdate, onRemove, onDuplicate,
}: LineCardProps) {
  const prod = products.find((p) => String(p.id) === line.product_id) ?? line._product;
  const { baseQty, gross, ht, tva, ttc, discountAmt, discPct } = calcLineTotal(line);
  const packagings = prod?.packagings ?? [];
  const selectedPack = line.packaging_id
    ? packagings.find((p) => String(p.id) === line.packaging_id)
    : null;

  const hasStockWarning = !stockValidation.ok;
  const computeWarnings = line._warnings ?? lineWarnings ?? [];
  const activeComputeWarnings = computeWarnings.filter((w) => w.level !== 'info');
  const hasWarning = hasStockWarning || activeComputeWarnings.length > 0;

  const stockQty = prod ? getProductStock(prod, stockData) : null;

  let stockBadge: { label: string; color: string } | null = null;
  if (!isPurchase && prod?.manages_stock && stockQty !== null && stockQty !== Infinity) {
    if (stockQty <= 0)
      stockBadge = { label: 'نفد', color: 'var(--red)' };
    else if (stockQty < 5)
      stockBadge = { label: `متاح: ${stockQty}`, color: 'var(--orange)' };
    else
      stockBadge = { label: `متاح: ${stockQty}`, color: 'var(--green)' };
  }

  let marginPct: number | null = null;
  let unitMargin = 0;
  let totalMargin = 0;
  let marginColor = 'var(--t4)';
  let costPrice = 0;
  if (!isPurchase && prod) {
    costPrice = toNum(prod.current_cost_price) || toNum(prod.purchase_price_ht);
    if (costPrice > 0 && line.unit_price_ht > 0) {
      unitMargin = line.unit_price_ht - costPrice;
      marginPct = (unitMargin / line.unit_price_ht) * 100;
      totalMargin = unitMargin * baseQty;
      marginColor = marginPct < lowMarginThreshold ? 'var(--red)' : marginPct < 10 ? 'var(--orange)' : 'var(--green)';
    }
  }
  const lowMarginThreshold = prod?.min_margin_percentage ?? 5;
  const hasLowMarginWarning = (line._warnings ?? []).some(w => w.type === 'low_margin');
  const hasLowMargin = hasLowMarginWarning || (!isPurchase && marginPct !== null && marginPct < lowMarginThreshold);
  const borderColor = hasLowMargin
    ? 'var(--red)'
    : hasWarning
      ? (stockValidation && 'blocking' in stockValidation && stockValidation.blocking ? 'var(--red)' : 'var(--orange)')
      : 'var(--b2)';
  const bgTint = hasLowMargin
    ? `color-mix(in srgb, var(--red) 18%, var(--bg2))`
    : hasWarning
      ? (stockValidation && 'blocking' in stockValidation && stockValidation.blocking
          ? `color-mix(in srgb, var(--red) 5%, var(--bg2))`
          : `color-mix(in srgb, var(--orange) 4%, var(--bg2))`)
      : 'var(--bg2)';

  return (
    <div
      style={{
        background: bgTint,
        border: `1px solid ${borderColor}`,
        borderRadius: 'var(--r2)',
        boxShadow: hasWarning ? 'none' : '0 1px 4px rgba(0,0,0,.04)',
        padding: '12px 14px',
        fontSize: 12,
        position: 'relative',
        transition: 'border-color .15s, box-shadow .15s',
      }}
    >
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <ProductSearch
              products={products}
              value={line.product_id}
              onChange={(id, p) => onUpdate(idx, { product_id: id }, p)}
              disabled={disabled}
              isPurchase={isPurchase}
              stockData={stockData}
            />
            {stockBadge && (
              <span style={{
                fontSize: 9, fontWeight: 700, flexShrink: 0,
                padding: '1px 6px', borderRadius: 99,
                background: `color-mix(in srgb, ${stockBadge.color} 12%, transparent)`,
                color: stockBadge.color,
              }}>
                {stockBadge.label}
              </span>
            )}
            {isTvaExempt && (
              <span style={{
                padding: '1px 5px', borderRadius: 99, fontSize: 9, fontWeight: 700,
                background: 'color-mix(in srgb, var(--green) 12%, transparent)',
                color: 'var(--green)', whiteSpace: 'nowrap',
              }}>
                <i className="ti ti-circle-check" style={{ marginLeft: 2, fontSize: 8 }} />
                معفى
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {!disabled && (
            <button
              onClick={() => onDuplicate(idx)}
              title="تكرار السطر"
              style={{
                width: 28, height: 28, borderRadius: 'var(--r1)',
                border: '1px solid var(--b2)', background: 'var(--bg2)',
                color: 'var(--t3)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <i className="ti ti-copy" style={{ fontSize: 11 }} />
            </button>
          )}
          <button
            disabled={disabled}
            onClick={() => onRemove(idx)}
            title="حذف السطر"
            style={{
              width: 28, height: 28, borderRadius: 'var(--r1)',
              border: '1px solid color-mix(in srgb, var(--red) 30%, transparent)',
              background: 'var(--redb)', color: 'var(--red)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <i className="ti ti-trash" style={{ fontSize: 11 }} />
          </button>
        </div>
      </div>

      {/* ── Quantity & Price Row ── */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Quantity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: 'var(--t4)', fontSize: 10, width: 38 }}>الكمية:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <button
              disabled={disabled || line.quantity <= 1}
              onClick={() => onUpdate(idx, { quantity: Math.max(1, line.quantity - 1) })}
              style={{
                width: 26, height: 26, borderRadius: 'var(--r1)',
                border: '1px solid var(--b3)', background: 'var(--bg1)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontSize: 13, fontWeight: 700, color: 'var(--t3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'inherit',
              }}
            >
              −
            </button>
            <input
              type="number"
              min={0.001}
              step={1}
              value={line.quantity}
              disabled={disabled}
              onChange={(e) => onUpdate(idx, { quantity: parseFloat(e.target.value) || 0 })}
              style={{
                width: 50, textAlign: 'center', padding: '3px 4px',
                borderRadius: 'var(--r1)', border: '1px solid var(--b3)',
                background: 'var(--bg1)', color: 'var(--t1)',
                fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                outline: 'none', fontVariantNumeric: 'tabular-nums',
              }}
            />
            <button
              disabled={disabled}
              onClick={() => onUpdate(idx, { quantity: line.quantity + 1 })}
              style={{
                width: 26, height: 26, borderRadius: 'var(--r1)',
                border: '1px solid var(--b3)', background: 'var(--bg1)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontSize: 13, fontWeight: 700, color: 'var(--t3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'inherit',
              }}
            >
              +
            </button>
          </div>
        </div>

        {/* Unit Price */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: 'var(--t4)', fontSize: 10 }}>السعر:</span>
          <input
            type="number"
            min={0}
            step={0.01}
            value={line.unit_price_ht}
            disabled={disabled}
            onChange={(e) => onUpdate(idx, { unit_price_ht: parseFloat(e.target.value) || 0 })}
            style={{
              width: 80, textAlign: 'right', padding: '3px 6px',
              borderRadius: 'var(--r1)', border: '1px solid var(--b3)',
              background: 'var(--bg1)', color: 'var(--t1)',
              fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
              outline: 'none', direction: 'ltr', fontVariantNumeric: 'tabular-nums',
            }}
          />
          <span style={{ fontSize: 10, color: 'var(--t4)' }}>دج</span>
        </div>

        {/* Packaging selector */}
        {packagings.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: 'var(--t4)', fontSize: 10 }}>التعبئة:</span>
            <select
              value={line.packaging_id}
              disabled={disabled}
              onChange={(e) => onUpdate(idx, { packaging_id: e.target.value })}
              style={{
                padding: '3px 6px', borderRadius: 'var(--r1)',
                border: '1px solid var(--b3)', background: 'var(--bg1)',
                color: 'var(--t1)', fontSize: 11, fontFamily: 'inherit',
                cursor: disabled ? 'not-allowed' : 'pointer',
              }}
            >
              <option value="">—</option>
              {packagings.map((pk) => (
                <option key={pk.id} value={String(pk.id)}>
                  {pk.label} ({pk.quantity}){pk.is_default ? ' ★' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Warehouse */}
        {warehouses && warehouses.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: 'var(--t4)', fontSize: 10 }}>المستودع:</span>
            <select
              value={line.warehouse_id ?? ''}
              disabled={disabled}
              onChange={(e) => onUpdate(idx, { warehouse_id: e.target.value || undefined })}
              style={{
                padding: '3px 6px', borderRadius: 'var(--r1)',
                border: '1px solid var(--b3)', background: 'var(--bg1)',
                color: 'var(--t1)', fontSize: 11, fontFamily: 'inherit',
                cursor: disabled ? 'not-allowed' : 'pointer',
              }}
            >
              <option value="">— تلقائي —</option>
              {warehouses.map((w) => (
                <option key={w.id} value={String(w.id)}>{w.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── Discount Row ── */}
      {(discountAmt > 0 || line.discount_percentage > 0) && (
        <div style={{ display: 'flex', gap: 12, marginTop: 6, padding: '4px 8px', borderRadius: 'var(--r1)', background: 'color-mix(in srgb, var(--orange) 5%, transparent)', fontSize: 11 }}>
          <span style={{ color: 'var(--t4)', fontSize: 10 }}>الخصم:</span>
          <span style={{ color: 'var(--red)', fontWeight: 700 }}>
            {line.discount_mode === 'percent'
              ? `${line.discount_percentage}%`
              : `${fmtDZD(line.discount_amount_fixed)} دج`}
          </span>
          <span style={{ color: 'var(--t4)' }}>({fmtDZD(discountAmt)} دج)</span>
        </div>
      )}

      {/* ── Totals Row ── */}
      <div style={{
        display: 'flex', gap: 16, flexWrap: 'wrap',
        marginTop: 8, paddingTop: 8,
        borderTop: '1px solid var(--b2)',
      }}>
        <div>
          <span style={{ color: 'var(--t4)', fontSize: 10 }}>المبلغ HT: </span>
          <span style={{ fontWeight: 700, color: 'var(--t2)' }}>{fmtDZD(ht)} دج</span>
        </div>
        <div>
          <span style={{ color: 'var(--t4)', fontSize: 10 }}>TVA ({line.tva_rate}%): </span>
          <span style={{ fontWeight: 600 }}>{fmtDZD(tva)} دج</span>
        </div>
        <div>
          <span style={{ color: 'var(--t4)', fontSize: 10 }}>المبلغ TTC: </span>
          <span style={{ fontWeight: 800, color: 'var(--em)' }}>{fmtDZD(ttc)} دج</span>
        </div>
        {!isPurchase && (
          <div>
            <span style={{ color: 'var(--t4)', fontSize: 10 }}>التكلفة: </span>
            {costPrice > 0 ? (
              <span style={{ fontWeight: 600, color: 'var(--t2)' }}>{fmtDZD(costPrice)} دج</span>
            ) : (
              <span style={{ color: 'var(--t4)', fontWeight: 500 }}>—</span>
            )}
          </div>
        )}
        {!isPurchase && (
          <div>
            <span style={{ color: 'var(--t4)', fontSize: 10 }}>الهامش: </span>
            {marginPct !== null ? (
              <>
                <span style={{ color: marginColor, fontWeight: 700 }}>{fmtDZD(unitMargin)} دج</span>
                <span style={{ color: 'var(--t4)', margin: '0 3px' }}>·</span>
                <span style={{ color: marginColor, fontWeight: 700 }}>{marginPct.toFixed(1)}%</span>
                <span style={{ color: 'var(--t4)', margin: '0 3px' }}>·</span>
                <span style={{ color: marginColor, fontWeight: 600, fontSize: 11 }}>{fmtDZD(totalMargin)} دج</span>
              </>
            ) : (
              <span style={{ color: 'var(--t4)', fontWeight: 500 }}>—</span>
            )}
          </div>
        )}
        {selectedPack && (
          <div>
            <span style={{ color: 'var(--t4)', fontSize: 10 }}>{baseQty.toFixed(2)} و.أ</span>
          </div>
        )}
      </div>

      {/* ── Stock & Other Warnings ── */}
      {hasStockWarning && (
        <div style={{
          marginTop: 6, padding: '4px 8px', borderRadius: 'var(--r1)',
          background: stockValidation && 'blocking' in stockValidation && stockValidation.blocking
            ? 'color-mix(in srgb, var(--red) 8%, transparent)'
            : 'color-mix(in srgb, var(--orange) 8%, transparent)',
          fontSize: 10.5, color: stockValidation && 'blocking' in stockValidation && stockValidation.blocking
            ? 'var(--red)' : 'var(--orange)',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <i className={`ti ${stockValidation && 'blocking' in stockValidation && stockValidation.blocking ? 'ti-alert-circle' : 'ti-alert-triangle'}`}
            style={{ fontSize: 11 }} />
          {stockValidation && 'message' in stockValidation ? stockValidation.message : ''}
        </div>
      )}

      {activeComputeWarnings.map((w, wi) => (
        <div key={wi} style={{
          marginTop: 4, padding: '4px 8px', borderRadius: 'var(--r1)',
          background: w.level === 'error'
            ? 'color-mix(in srgb, var(--red) 8%, transparent)'
            : 'color-mix(in srgb, var(--orange) 8%, transparent)',
          fontSize: 10.5, color: w.level === 'error' ? 'var(--red)' : 'var(--orange)',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <i className={`ti ${w.level === 'error' ? 'ti-alert-circle' : 'ti-alert-triangle'}`}
            style={{ fontSize: 11 }} />
          {w.message}
        </div>
      ))}

      {/* ── Line Note ── */}
      {!disabled && (
        <div style={{ marginTop: 6 }}>
          <input
            type="text"
            value={line.line_note ?? ''}
            placeholder="ملاحظة على السطر..."
            disabled={disabled}
            onChange={(e) => onUpdate(idx, { line_note: e.target.value })}
            style={{
              width: '100%', padding: '4px 8px', fontSize: 10.5,
              borderRadius: 'var(--r1)', border: '1px solid var(--b2)',
              background: 'transparent', color: 'var(--t3)',
              fontFamily: 'inherit', outline: 'none',
            }}
          />
        </div>
      )}
    </div>
  );
}



```

## FILE: resources/js/pages/documents/components/PaymentTermsTable.tsx
```
import React from 'react';
import { inputStyle, labelStyle } from './DocumentUIPrimitives';
import { fmtDZD, toNum } from '../utils/document.utils';
import type { PaymentTerm } from '../types/document.types';

interface PaymentTermsTableProps {
  terms:    PaymentTerm[];
  netToPay: number;
  disabled?: boolean;
  onChange: (terms: PaymentTerm[]) => void;
}

export function PaymentTermsTable({
  terms,
  netToPay,
  disabled = false,
  onChange,
}: PaymentTermsTableProps) {
  const update = (idx: number, patch: Partial<PaymentTerm>) => {
    const next = terms.map((t, i) => (i === idx ? { ...t, ...patch } : t));
    const entry = next[idx];
    if (patch.percentage !== undefined && netToPay > 0) {
      entry.amount = Math.round((patch.percentage / 100) * netToPay * 100) / 100;
    } else if (patch.amount !== undefined && netToPay > 0) {
      entry.percentage = Math.round((patch.amount / netToPay) * 10000) / 100;
    }
    onChange(next);
  };

  const add = () => {
    onChange([...terms, { due_date: '', percentage: 0, amount: 0, notes: '' }]);
  };

  const remove = (idx: number) => {
    onChange(terms.filter((_, i) => i !== idx));
  };

  const totalPct = terms.reduce((s, t) => s + t.percentage, 0);
  const totalAmt = terms.reduce((s, t) => s + t.amount, 0);
  const isValid  = Math.abs(totalPct - 100) < 0.01;

  return (
    <div>
      {terms.length === 0 ? (
        <div style={{
          padding: 12, fontSize: 12, color: 'var(--t4)',
          background: 'var(--bg3)', borderRadius: 'var(--r2)', marginBottom: 8,
        }}>
          لا توجد شروط دفع محددة.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 8 }}>
          <thead>
            <tr style={{ background: 'var(--bg3)', borderBottom: '1px solid var(--b2)' }}>
              <th style={{ padding: '5px 8px', textAlign: 'right', fontSize: 10.5, fontWeight: 700, color: 'var(--t4)' }}>
                تاريخ الاستحقاق
              </th>
              <th style={{ padding: '5px 8px', textAlign: 'right', fontSize: 10.5, fontWeight: 700, color: 'var(--t4)' }}>
                النسبة %
              </th>
              <th style={{ padding: '5px 8px', textAlign: 'right', fontSize: 10.5, fontWeight: 700, color: 'var(--t4)' }}>
                المبلغ
              </th>
              <th style={{ padding: '5px 8px', textAlign: 'right', fontSize: 10.5, fontWeight: 700, color: 'var(--t4)' }}>
                ملاحظات
              </th>
              {!disabled && <th style={{ width: 32 }} />}
            </tr>
          </thead>
          <tbody>
            {terms.map((t, i) => {
              const isLast = i === terms.length - 1;
              const remainingPct = Math.max(0, Math.round((100 - totalPct) * 100) / 100);
              return (
              <tr key={i} style={{ borderBottom: '1px solid var(--b1)' }}>
                <td style={{ padding: '4px 6px' }}>
                  <input
                    type="date"
                    style={{ ...inputStyle(), fontSize: 11, padding: '4px 6px' }}
                    value={t.due_date}
                    disabled={disabled}
                    onChange={(e) => update(i, { due_date: e.target.value })}
                  />
                </td>
                <td style={{ padding: '4px 6px' }}>
                  <input
                    type="number" min={0} max={100} step={0.01}
                    style={{ ...inputStyle(), fontSize: 11, padding: '4px 6px', textAlign: 'center' }}
                    value={t.percentage || ''}
                    disabled={disabled}
                    onChange={(e) => update(i, { percentage: parseFloat(e.target.value) || 0 })}
                  />
                </td>
                <td style={{ padding: '4px 6px', direction: 'ltr', textAlign: 'right' }}>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number" min={0} step={0.01}
                      style={{ ...inputStyle(), fontSize: 11, padding: '4px 20px 4px 6px', textAlign: 'center' }}
                      value={t.amount || ''}
                      disabled={disabled}
                      onChange={(e) => update(i, { amount: parseFloat(e.target.value) || 0 })}
                    />
                    <span style={{
                      position: 'absolute', left: 6, top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: 9, color: 'var(--t4)', fontWeight: 600,
                      pointerEvents: 'none',
                    }}>دج</span>
                  </div>
                  {isLast && !disabled && remainingPct > 0.01 && (
                    <button
                      onClick={() => update(i, { percentage: remainingPct })}
                      style={{
                        display: 'block', fontSize: 9.5, fontWeight: 600, color: 'var(--em)',
                        marginTop: 2, padding: 0, background: 'none',
                        border: 'none', cursor: 'pointer', textDecoration: 'underline',
                      }}
                    >
                      المبلغ المتبقي {fmtDZD(Math.round((remainingPct / 100) * netToPay * 100) / 100)}
                    </button>
                  )}
                </td>
                <td style={{ padding: '4px 6px' }}>
                  <input
                    type="text"
                    style={{ ...inputStyle(), fontSize: 11, padding: '4px 6px' }}
                    value={t.notes ?? ''}
                    disabled={disabled}
                    onChange={(e) => update(i, { notes: e.target.value })}
                    placeholder="ملاحظة..."
                  />
                </td>
                {!disabled && (
                  <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                    <button
                      onClick={() => remove(i)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--red)', padding: 2, fontSize: 14,
                      }}
                      title="حذف"
                    >
                      <i className="ti ti-trash" />
                    </button>
                  </td>
                )}
              </tr>
            );
            })}
            {/* صف الإجمالي */}
            <tr style={{ background: 'var(--bg3)', borderTop: '2px solid var(--b2)' }}>
              <td style={{ padding: '5px 8px', fontWeight: 700, color: 'var(--t3)' }}>الإجمالي</td>
              <td style={{
                padding: '5px 8px', fontWeight: 700, textAlign: 'center',
                color: isValid ? 'var(--green)' : 'var(--red)',
              }}>
                {totalPct.toFixed(2)}%
              </td>
              <td style={{
                padding: '5px 8px', fontWeight: 700, direction: 'ltr', textAlign: 'right',
                color: isValid ? 'var(--green)' : 'var(--red)',
              }}>
                {fmtDZD(totalAmt)} دج
              </td>
              <td colSpan={disabled ? 1 : 2} style={{ padding: '5px 8px' }}>
                {!isValid && (
                  <span style={{ color: 'var(--red)', fontSize: 11 }}>
                    <i className="ti ti-alert-triangle" style={{ marginLeft: 4, fontSize: 10 }} />
                    المجموع يجب أن يساوي 100% (حالياً {totalPct.toFixed(2)}%)
                  </span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      )}

      {!disabled && (
        <button
          onClick={add}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 'var(--r2)',
            border: '1px dashed var(--b3)', background: 'transparent',
            color: 'var(--t3)', cursor: 'pointer', fontSize: 11.5, fontWeight: 600,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget).style.borderColor = 'var(--em)';
            (e.currentTarget).style.color = 'var(--em)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget).style.borderColor = 'var(--b3)';
            (e.currentTarget).style.color = 'var(--t3)';
          }}
        >
          <i className="ti ti-plus" />
          إضافة قسط
        </button>
      )}
    </div>
  );
}

```

## FILE: resources/js/pages/documents/components/ProductSearch.tsx
```
// ════════════════════════════════════════════════════════════════════════════
// pages/documents/components/ProductSearch.tsx
//
// ComboBox متخصص للمنتجات: يعرض المخزون، التحذيرات، المرجع، الوحدة.
//
// 🔧 BUGFIX: القائمة المنسدلة كانت تُقطع داخل الجدول بسبب overflow:hidden
//    على عناصر الـ table/tbody/td. الحل: نستخدم ReactDOM.createPortal
//    لتصيير الـ dropdown مباشرةً في document.body، مع position:fixed
//    وحساب الإحداثيات بـ getBoundingClientRect().
// ════════════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getProductStock } from '../utils/document.utils';
import { cellStyle } from './DocumentUIPrimitives';
import type { Product } from '../types/document.types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProductSearchProps {
  products:    Product[];
  value:       string;
  onChange:    (productId: string, product: Product | null) => void;
  disabled?:   boolean;
  error?:      boolean;
  isPurchase?: boolean;
  stockData?:  Record<number, number>;
}

// ─── Dropdown position ────────────────────────────────────────────────────────

interface DropdownPos {
  top:   number;
  right: number;   // RTL: نستخدم right بدل left حتى تمتد القائمة من يمين الزر
  width: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProductSearch({
  products,
  value,
  onChange,
  disabled,
  error,
  isPurchase  = false,
  stockData   = {},
}: ProductSearchProps) {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState('');
  const [pos,   setPos]   = useState<DropdownPos>({ top: 0, right: 0, width: 320 });
  const [highlightedIdx, setHighlightedIdx] = useState(0);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropRef    = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const listRef    = useRef<HTMLDivElement>(null);

  const selected = products.find((p) => String(p.id) === value);

  // ─── حساب موضع الـ dropdown بناءً على موضع الزر في الشاشة ─────────────────

  const calcPos = useCallback(() => {
    if (!triggerRef.current) return;
    const rect  = triggerRef.current.getBoundingClientRect();
    const dropW = Math.max(rect.width, 320);

    // حساب المساحة المتاحة — نُقيّد بالـ viewport مع هامش 8px
    const viewportH    = window.innerHeight;
    const spaceBelow   = viewportH - rect.bottom - 8;
    const spaceAbove   = rect.top - 8;
    const maxDropH     = 320;
    const openUpward   = spaceBelow < Math.min(maxDropH, 200) && spaceAbove > spaceBelow;

    // RTL: right = المسافة من يمين الـ viewport إلى يمين الزر
    const rightFromViewport = window.innerWidth - rect.right;

    const top = openUpward
      ? rect.top  - Math.min(maxDropH, spaceAbove) - 3
      : rect.bottom + 3;

    setPos({
      top:   Math.max(top, 8),
      right: Math.max(rightFromViewport, 4),
      width: Math.min(dropW, rect.right - 8),
    });
  }, []);

  // ─── فتح / إغلاق ──────────────────────────────────────────────────────────

  const handleOpen = () => {
    if (disabled) return;
    if (!open) {
      calcPos();
      setOpen(true);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setOpen(false);
      setQuery('');
    }
  };

  // ─── إغلاق عند النقر خارجاً أو Escape ────────────────────────────────────

  useEffect(() => {
    if (!open) return;

    const handleMouse = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        dropRef.current    && !dropRef.current.contains(target)
      ) {
        setOpen(false);
        setQuery('');
      }
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); setQuery(''); }
    };

    // إعادة حساب الموضع عند التمرير أو تغيير الحجم
    const handleReposition = () => calcPos();

    document.addEventListener('mousedown', handleMouse);
    document.addEventListener('keydown',   handleKey);
    window.addEventListener('scroll',  handleReposition, true);
    window.addEventListener('resize',  handleReposition);

    return () => {
      document.removeEventListener('mousedown', handleMouse);
      document.removeEventListener('keydown',   handleKey);
      window.removeEventListener('scroll',  handleReposition, true);
      window.removeEventListener('resize',  handleReposition);
    };
  }, [open, calcPos]);

  // ─── فلترة المنتجات ───────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const base = query.trim()
      ? products.filter((p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          (p.ref     ?? '').toLowerCase().includes(query.toLowerCase()) ||
          (p.barcode ?? '').toLowerCase().includes(query.toLowerCase()),
        )
      : products;
    return base.slice(0, 60);
  }, [products, query]);

  // ─── اختيار منتج ─────────────────────────────────────────────────────────

  const choose = (p: Product) => {
    onChange(String(p.id), p);
    setOpen(false);
    setQuery('');
  };

  // إعادة تعيين المؤشر عند تغير الفلترة
  useEffect(() => {
    setHighlightedIdx(0);
  }, [filtered.length]);

  // ─── Badge المخزون ────────────────────────────────────────────────────────

  const stockBadge = (p: Product): { label: string; color: string } | null => {
    if (isPurchase || !p.manages_stock) return null;
    const qty = getProductStock(p, stockData);
    if (qty === Infinity) return null;
    if (qty <= 0)         return { label: 'نفد',          color: 'var(--red)'    };
    if (qty < 5)          return { label: `متاح: ${qty}`, color: 'var(--orange)' };
    return                       { label: `متاح: ${qty}`, color: 'var(--green)'  };
  };

  // ─── Dropdown markup (يُصيَّر في portal) ─────────────────────────────────

  const dropdown = open ? createPortal(
    <div
      ref={dropRef}
      style={{
        position:     'fixed',
        top:          pos.top,
        right:        pos.right,
        width:        pos.width,
        maxWidth:     420,
        zIndex:       99999,
        background:   'var(--bg2)',
        border:       '1px solid var(--b2)',
        borderRadius: 'var(--r2)',
        boxShadow:    '0 8px 32px rgba(0,0,0,.28)',
        direction:    'rtl',
        overflow:     'hidden',
      }}
    >
      {/* حقل البحث */}
      <div style={{
        padding: '6px 6px 5px', borderBottom: '1px solid var(--b1)',
        background: 'var(--bg3)',
      }}>
        <div style={{ position: 'relative' }}>
          <i className="ti ti-search" style={{
            position: 'absolute', right: 7, top: '50%',
            transform: 'translateY(-50%)', color: 'var(--t4)', fontSize: 12,
            pointerEvents: 'none',
          }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setHighlightedIdx(0); }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlightedIdx((prev) => Math.min(prev + 1, filtered.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlightedIdx((prev) => Math.max(prev - 1, 0));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filtered[highlightedIdx]) {
                  choose(filtered[highlightedIdx]);
                }
              }
            }}
            placeholder="ابحث بالاسم أو الرمز..."
            style={{
              width: '100%', padding: '5px 28px 5px 8px',
              borderRadius: 'var(--r1)', border: '1px solid var(--b2)',
              background: 'var(--bg1)', color: 'var(--t1)',
              fontSize: 12, fontFamily: 'Tajawal, sans-serif',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* النتائج */}
      <div ref={listRef} style={{ maxHeight: 260, overflowY: 'auto' }}>
        {filtered.length === 0
          ? (
            <div style={{
              padding: 16, textAlign: 'center',
              color: 'var(--t4)', fontSize: 12,
            }}>
              لا توجد نتائج
            </div>
          )
          : filtered.map((p, i) => {
              const badge      = stockBadge(p);
              const isSelected = String(p.id) === value;
              const isHighlighted = i === highlightedIdx;
              return (
                <div
                  key={p.id}
                  ref={isHighlighted ? (el) => {
                    if (el) el.scrollIntoView({ block: 'nearest' });
                  } : undefined}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(p);
                  }}
                  onMouseEnter={() => setHighlightedIdx(i)}
                  style={{
                    padding:      '8px 10px',
                    cursor:       'pointer',
                    background:   isHighlighted ? 'var(--bg3)' : isSelected ? 'var(--emb)' : 'transparent',
                    borderBottom: '1px solid var(--b1)',
                    display:      'flex',
                    alignItems:   'center',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  {/* معلومات المنتج */}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      fontSize: 12.5, fontWeight: isSelected ? 700 : 500,
                      color: 'var(--t1)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {p.name}
                    </div>
                    <div style={{
                      fontSize: 10.5, color: 'var(--t4)', marginTop: 1,
                      display: 'flex', gap: 6,
                    }}>
                      {p.ref    && <span>{p.ref}</span>}
                      {p.unit   && <span>{p.unit.symbol}</span>}
                      {p.family && <span>{p.family.name}</span>}
                    </div>
                  </div>

                  {/* Badge المخزون */}
                  {badge && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, flexShrink: 0,
                      padding: '2px 6px', borderRadius: 99,
                      background: `color-mix(in srgb, ${badge.color} 12%, transparent)`,
                      color: badge.color,
                    }}>
                      {badge.label}
                    </span>
                  )}
                </div>
              );
            })
        }
      </div>
    </div>,
    document.body,
  ) : null;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* زر الفتح */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleOpen}
        style={{
          ...cellStyle(!!value && !error),
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          cursor:         disabled ? 'not-allowed' : 'pointer',
          gap:            4,
          textAlign:      'right',
          border:         error ? '1px solid var(--red)' : undefined,
          maxWidth:       '100%',
        }}
      >
        <span style={{
          flex:         1,
          overflow:     'hidden',
          textOverflow: 'ellipsis',
          whiteSpace:   'nowrap',
          color:        selected ? 'var(--t1)' : 'var(--t4)',
          textAlign:    'right',
        }}>
          {selected ? selected.name : '— اختر منتجاً —'}
        </span>
        <i
          className={`ti ti-chevron-${open ? 'up' : 'down'}`}
          style={{ fontSize: 10, color: 'var(--t4)', flexShrink: 0 }}
        />
      </button>

      {/* القائمة المنسدلة — مُصيَّرة في document.body عبر portal */}
      {dropdown}
    </div>
  );
}

```

## FILE: resources/js/pages/documents/components/ReturnDocumentModal.tsx
```
import React, { useState, useMemo } from 'react';
import { fmtDZD } from '../utils/document.utils';
import { useCreateReturn } from '../hooks/useDocumentChain';
import type { LineItem } from '../types/document.types';

interface ReturnLine {
  line_id:       number;
  product_name:  string;
  max_quantity:  number;
  return_qty:    number;
  unit_price_ht: number;
  tva_rate:      number;
  packaging_label?: string;
}

interface ReturnDocumentModalProps {
  document:   Record<string, unknown>;
  onCreated:  (returnDoc: Record<string, unknown>) => void;
  onClose:    () => void;
}

export function ReturnDocumentModal({ document, onCreated, onClose }: ReturnDocumentModalProps) {
  const createReturn = useCreateReturn();
  const [reason, setReason] = useState('');
  const [error, setError]   = useState('');

  const lines = useMemo<ReturnLine[]>(() => {
    const rawLines = (document.lines as Record<string, unknown>[]) ?? [];
    return rawLines
      .filter(l => {
        const qty      = Number(l.quantity ?? 0);
        const returned = Number(l.returned_quantity ?? 0);
        return qty > returned;
      })
      .map(l => ({
        line_id:      Number(l.id),
        product_name: String(
          (l.product as Record<string, unknown> | null)?.name ?? l.description ?? ''
        ),
        max_quantity: Number(l.quantity ?? 0) - Number(l.returned_quantity ?? 0),
        return_qty:   Number(l.quantity ?? 0) - Number(l.returned_quantity ?? 0),
        unit_price_ht: Number(l.unit_price_ht ?? 0),
        tva_rate:     Number(l.tva_rate ?? 0),
        packaging_label: (l.packaging as Record<string, unknown> | null)?.label as string | undefined,
      }));
  }, [document.lines]);

  const [returnLines, setReturnLines] = useState<ReturnLine[]>(lines);

  const updateQty = (lineId: number, qty: number) => {
    setReturnLines(prev => prev.map(l =>
      l.line_id === lineId
        ? { ...l, return_qty: Math.min(l.max_quantity, Math.max(0, qty)) }
        : l
    ));
  };

  const total = returnLines.reduce((acc, l) => {
    const ht  = l.return_qty * l.unit_price_ht;
    const tva = ht * (l.tva_rate / 100);
    return acc + ht + tva;
  }, 0);

  const handleSubmit = async () => {
    if (!reason.trim()) { setError('سبب الإرجاع إلزامي'); return; }
    const validLines = returnLines.filter(l => l.return_qty > 0);
    if (validLines.length === 0) { setError('يجب تحديد كمية للإرجاع في سطر واحد على الأقل'); return; }

    try {
      const result = await createReturn.mutateAsync({
        documentId: Number(document.id),
        reason,
        lines: validLines.map(l => ({ line_id: l.line_id, quantity: l.return_qty })),
      });
      onCreated(result as Record<string, unknown>);
    } catch (e: unknown) {
      setError((e as Error)?.message ?? 'حدث خطأ أثناء إنشاء المرتجع');
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,.5)', direction: 'rtl',
    }}>
      <div style={{
        width: '92vw', maxWidth: 680, maxHeight: '88vh',
        display: 'flex', flexDirection: 'column',
        background: 'var(--bg1)', borderRadius: 'var(--r3)',
        boxShadow: '0 20px 60px rgba(0,0,0,.3)', overflow: 'hidden',
      }}>
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--b1)',
          background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'color-mix(in srgb, var(--purple) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--purple) 30%, transparent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className="ti ti-receipt-refund" style={{ fontSize: 17, color: 'var(--purple)' }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--t1)' }}>
                إنشاء مرتجع
              </div>
              <div style={{ fontSize: 11, color: 'var(--t4)' }}>
                من {String(document.document_number)}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 8,
            border: '1px solid var(--b2)', background: 'none',
            cursor: 'pointer', color: 'var(--t3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="ti ti-x" style={{ fontSize: 13 }} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {error && (
            <div style={{
              padding: '8px 12px', marginBottom: 12, borderRadius: 'var(--r2)',
              background: 'var(--redb)', border: '1px solid var(--red)',
              fontSize: 12, color: 'var(--red)',
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--t3)', marginBottom: 5 }}>
              سبب الإرجاع <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={e => { setReason(e.target.value); setError(''); }}
              placeholder="اذكر سبب الإرجاع..."
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 'var(--r2)',
                border: `1px solid ${!reason && error ? 'var(--red)' : 'var(--b3)'}`,
                background: 'var(--bg1)', color: 'var(--t1)',
                fontSize: 13, fontFamily: 'Tajawal, sans-serif',
                resize: 'vertical', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', marginBottom: 8 }}>
            الكميات المُرجَعة
          </div>

          {returnLines.map(line => (
            <div key={line.line_id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px', marginBottom: 8, borderRadius: 'var(--r2)',
              border: '1px solid var(--b2)', background: 'var(--bg2)',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {line.product_name}
                </div>
                {line.packaging_label && (
                  <div style={{ fontSize: 10, color: 'var(--t4)' }}>{line.packaging_label}</div>
                )}
                <div style={{ fontSize: 10, color: 'var(--t4)' }}>
                  متاح للإرجاع: <b style={{ color: 'var(--t2)' }}>{line.max_quantity}</b> وحدة
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  onClick={() => updateQty(line.line_id, line.return_qty - 1)}
                  disabled={line.return_qty <= 0}
                  style={{
                    width: 28, height: 28, borderRadius: 8,
                    border: '1px solid var(--b2)', background: 'var(--bg1)',
                    cursor: line.return_qty <= 0 ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--t3)',
                  }}
                >
                  <i className="ti ti-minus" style={{ fontSize: 11 }} />
                </button>
                <input
                  type="number"
                  min={0}
                  max={line.max_quantity}
                  step={0.001}
                  value={line.return_qty}
                  onChange={e => updateQty(line.line_id, parseFloat(e.target.value) || 0)}
                  style={{
                    width: 70, textAlign: 'center', padding: '5px',
                    borderRadius: 'var(--r1)', border: '1px solid var(--b3)',
                    background: 'var(--bg1)', color: 'var(--t1)',
                    fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none',
                  }}
                />
                <button
                  onClick={() => updateQty(line.line_id, line.return_qty + 1)}
                  disabled={line.return_qty >= line.max_quantity}
                  style={{
                    width: 28, height: 28, borderRadius: 8,
                    border: '1px solid var(--b2)', background: 'var(--bg1)',
                    cursor: line.return_qty >= line.max_quantity ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--t3)',
                  }}
                >
                  <i className="ti ti-plus" style={{ fontSize: 11 }} />
                </button>
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2)', minWidth: 80, textAlign: 'left', direction: 'ltr' }}>
                {fmtDZD(
                  line.return_qty * line.unit_price_ht * (1 + line.tva_rate / 100)
                )} دج
              </div>
            </div>
          ))}

          <div style={{
            padding: '10px 12px', borderRadius: 'var(--r2)',
            background: 'var(--bg3)', border: '1px solid var(--b2)',
            display: 'flex', justifyContent: 'space-between',
            fontSize: 13, fontWeight: 700, color: 'var(--t1)',
          }}>
            <span>إجمالي المرتجع (TTC):</span>
            <span style={{ color: 'var(--purple)', direction: 'ltr' }}>
              {fmtDZD(total)} دج
            </span>
          </div>
        </div>

        <div style={{
          padding: '12px 20px', borderTop: '1px solid var(--b1)',
          background: 'var(--bg2)', display: 'flex', gap: 8, justifyContent: 'flex-start',
        }}>
          <button
            onClick={handleSubmit}
            disabled={createReturn.isPending}
            style={{
              padding: '8px 20px', borderRadius: 'var(--r2)',
              border: 'none', background: 'var(--purple)', color: 'white',
              cursor: createReturn.isPending ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 700, opacity: createReturn.isPending ? 0.7 : 1,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {createReturn.isPending
              ? <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> جاري الإنشاء...</>
              : <><i className="ti ti-receipt-refund" /> إنشاء المرتجع</>
            }
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', borderRadius: 'var(--r2)',
              border: '1px solid var(--b2)', background: 'var(--bg1)',
              cursor: 'pointer', fontSize: 13, color: 'var(--t2)',
            }}
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

```

## FILE: resources/js/pages/documents/components/ShippingInfoSection.tsx
```
import React from 'react';
import { inputStyle, labelStyle } from './DocumentUIPrimitives';
import type { ShippingInfo } from '../types/document.types';

interface ShippingInfoSectionProps {
  value:       ShippingInfo;
  deliveryDate: string;
  disabled?:   boolean;
  onChange:    (info: ShippingInfo) => void;
  onDeliveryDateChange: (date: string) => void;
}

export function ShippingInfoSection({
  value,
  deliveryDate,
  disabled = false,
  onChange,
  onDeliveryDateChange,
}: ShippingInfoSectionProps) {
  const set = (k: keyof ShippingInfo, v: string) => {
    onChange({ ...value, [k]: v || undefined });
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 10,
      padding: '12px 14px',
      borderRadius: 'var(--r2)',
      background: 'color-mix(in srgb, var(--blue) 5%, var(--bg2))',
      border: '1px solid color-mix(in srgb, var(--blue) 18%, transparent)',
    }}>
      {/* صف العنوان */}
      <div style={{ gridColumn: 'span 2', fontSize: 11, fontWeight: 700, color: 'var(--blue)',
        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
        <i className="ti ti-truck-delivery" style={{ fontSize: 13 }} />
        معلومات الشحن
      </div>

      {/* تاريخ التسليم */}
      <div>
        <span style={{ ...labelStyle, fontSize: 10 }}>تاريخ التسليم</span>
        <input
          type="date"
          style={inputStyle()}
          value={deliveryDate}
          disabled={disabled}
          onChange={(e) => onDeliveryDateChange(e.target.value)}
        />
      </div>

      {/* العنوان */}
      <div style={{ gridColumn: 'span 2' }}>
        <span style={{ ...labelStyle, fontSize: 10 }}>عنوان التسليم</span>
        <input
          type="text"
          style={inputStyle()}
          value={value.address ?? ''}
          disabled={disabled}
          onChange={(e) => set('address', e.target.value)}
          placeholder="العنوان الكامل للتسليم"
        />
      </div>

      {/* وسيلة النقل */}
      <div>
        <span style={{ ...labelStyle, fontSize: 10 }}>وسيلة النقل</span>
        <select
          style={{ ...inputStyle(), cursor: disabled ? 'not-allowed' : 'pointer' }}
          value={value.transport_mode ?? ''}
          disabled={disabled}
          onChange={(e) => set('transport_mode', e.target.value)}
        >
          <option value="">— اختر —</option>
          <option value="company">سيارة الشركة</option>
          <option value="external">نقل خارجي</option>
          <option value="client">استلام من الزبون</option>
          <option value="courier">توصيل (كوريير)</option>
        </select>
      </div>

      {/* اسم السائق */}
      <div>
        <span style={{ ...labelStyle, fontSize: 10 }}>اسم السائق</span>
        <input
          type="text"
          style={inputStyle()}
          value={value.driver_name ?? ''}
          disabled={disabled}
          onChange={(e) => set('driver_name', e.target.value)}
          placeholder="اسم السائق"
        />
      </div>

      {/* لوحة المركبة */}
      <div>
        <span style={{ ...labelStyle, fontSize: 10 }}>لوحة المركبة</span>
        <input
          type="text"
          style={inputStyle()}
          value={value.vehicle_plate ?? ''}
          disabled={disabled}
          onChange={(e) => set('vehicle_plate', e.target.value)}
          placeholder="رقم اللوحة"
        />
      </div>

      {/* ملاحظات السائق */}
      <div style={{ gridColumn: 'span 2' }}>
        <span style={{ ...labelStyle, fontSize: 10 }}>ملاحظات السائق</span>
        <input
          type="text"
          style={inputStyle()}
          value={value.driver_notes ?? ''}
          disabled={disabled}
          onChange={(e) => set('driver_notes', e.target.value)}
          placeholder="ملاحظات للتوصيل..."
        />
      </div>
    </div>
  );
}

```

## FILE: resources/js/pages/documents/components/SmartSuggestionsPanel.tsx
```
import React from 'react';
import { fmtDZD } from '../utils/document.utils';
import type { ProductSuggestion } from '../hooks/useProductSuggestions';

interface SmartSuggestionsPanelProps {
  suggestions:  ProductSuggestion[] | undefined;
  isLoading:    boolean;
  onAddProduct: (productId: number, suggestedPrice?: number | null, suggestedTva?: number | null) => void;
  disabled?:    boolean;
}

export function SmartSuggestionsPanel({
  suggestions, isLoading, onAddProduct, disabled,
}: SmartSuggestionsPanelProps) {
  const [collapsed, setCollapsed] = React.useState(false);

  if (isLoading) {
    return (
      <div style={{
        marginTop: 10, padding: '10px 12px', borderRadius: 'var(--r2)',
        background: 'var(--bg3)', border: '1px solid var(--b2)',
        display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--t4)',
      }}>
        <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite', fontSize: 13 }} />
        جاري تحميل الاقتراحات...
      </div>
    );
  }

  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div style={{
      marginTop: 10, borderRadius: 'var(--r2)',
      border: '1px solid var(--b2)', overflow: 'hidden',
    }}>
      <button
        onClick={() => setCollapsed((v) => !v)}
        style={{
          width: '100%', padding: '8px 12px', display: 'flex',
          alignItems: 'center', gap: 6, cursor: 'pointer',
          background: 'var(--bg3)', border: 'none',
          color: 'var(--t2)', fontSize: 12, fontWeight: 700,
          fontFamily: 'inherit', textAlign: 'right',
        }}
      >
        <i className="ti ti-bulb" style={{ fontSize: 12, color: 'var(--em)' }} />
        <span style={{ flex: 1 }}>منتجات مقترحة</span>
        <span style={{
          padding: '1px 6px', borderRadius: 99, fontSize: 10,
          background: 'var(--em)', color: 'white', fontWeight: 700,
        }}>
          {suggestions.length}
        </span>
        <i className={`ti ti-chevron-${collapsed ? 'down' : 'up'}`} style={{ fontSize: 10, color: 'var(--t4)' }} />
      </button>
      {!collapsed && (
        <div style={{ padding: '6px 8px', background: 'var(--bg1)' }}>
          {suggestions.map((p) => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 8px', borderRadius: 'var(--r1)',
              transition: 'background .15s',
              cursor: disabled ? 'not-allowed' : 'default',
              opacity: disabled ? 0.6 : 1,
            }}
              onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = 'var(--bg2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <i className="ti ti-package" style={{ fontSize: 11, color: 'var(--t4)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12, fontWeight: 600, color: 'var(--t2)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {p.name}
                </div>
                <div style={{ fontSize: 10, color: 'var(--t4)', display: 'flex', gap: 8 }}>
                  {p.ref && <span>({p.ref})</span>}
                  <span>×{p.order_count} فاتورة</span>
                  {p.suggested_price !== null && (
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {fmtDZD(p.suggested_price)} دج
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  if (disabled) return;
                  onAddProduct(p.id, p.suggested_price, p.suggested_tva);
                }}
                disabled={disabled}
                style={{
                  padding: '4px 10px', borderRadius: 'var(--r1)',
                  border: '1px solid var(--em)', background: 'var(--emb)',
                  color: 'var(--em)', cursor: disabled ? 'not-allowed' : 'pointer',
                  fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
                  whiteSpace: 'nowrap', flexShrink: 0,
                  transition: 'all .12s',
                }}
                onMouseEnter={(e) => {
                  if (!disabled) {
                    e.currentTarget.style.background = 'var(--em)';
                    e.currentTarget.style.color = 'white';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!disabled) {
                    e.currentTarget.style.background = 'var(--emb)';
                    e.currentTarget.style.color = 'var(--em)';
                  }
                }}
              >
                <i className="ti ti-plus" style={{ marginLeft: 3, fontSize: 10 }} />
                أضف
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

```

## FILE: resources/js/pages/documents/hooks/useAdvancePayments.ts
```
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';

export interface AdvancePayment {
  id:                number;
  payment_number:    string | null;
  payment_date:      string;
  amount:            number;
  unapplied_amount:  number;
  payment_mode_id:   number;
  payment_mode_name: string | null;
  reference:         string | null;
}

export function useAdvancePayments(partyId: number | null, enabled: boolean) {
  const slug = useActiveSlug();
  return useQuery<AdvancePayment[]>({
    queryKey: [slug, 'advance-payments', partyId],
    queryFn: async () => {
      if (!partyId) return [];
      return apiGet<AdvancePayment[]>(`/parties/${partyId}/advances`);
    },
    enabled: !!slug && !!partyId && enabled,
    staleTime: 30_000,
    gcTime: 15_000,
  });
}

```

## FILE: resources/js/pages/documents/hooks/useAlerts.ts
```
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';

export interface UserAlert {
  id:              number;
  type:            string;
  title:           string;
  body:            string;
  severity:        string;
  document_id?:    number | null;
  check_id?:       number | null;
  product_id?:     number | null;
  party_id?:       number | null;
  is_read:         boolean;
  read_at?:        string | null;
  created_at:      string;
}

interface AlertsResponse {
  alerts:       UserAlert[];
  unread_count: number;
}

export function useAlerts() {
  const slug   = useActiveSlug();
  const client = useQueryClient();

  const query = useQuery<AlertsResponse>({
    queryKey: [slug, 'alerts', 'unread'],
    queryFn: async () => {
      return apiGet<AlertsResponse>('/alerts/unread');
    },
    enabled: !!slug,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const markAsRead = useMutation({
    mutationFn: (alertId: number) => apiPost(`/alerts/${alertId}/read`),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: [slug, 'alerts'] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: () => apiPost('/alerts/mark-all-read'),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: [slug, 'alerts'] });
    },
  });

  return {
    alerts:       query.data?.alerts ?? [],
    unreadCount:  query.data?.unread_count ?? 0,
    isLoading:    query.isLoading,
    error:        query.error,
    refresh:      () => client.invalidateQueries({ queryKey: [slug, 'alerts'] }),
    markAsRead:   (id: number) => markAsRead.mutate(id),
    markAllAsRead: markAllAsRead.mutate,
  };
}

```

## FILE: resources/js/pages/documents/hooks/useComputeLine.ts
```
import {
  useCallback, useRef, useEffect, useState,
} from 'react';
import { useActiveSlug } from '@/lib/store/appStore';
import { apiPost } from '@/lib/api/core/client';
import type { LineItem } from '../types/document.types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ComputeLineInput {
  product_id:                    number;
  quantity:                      number;
  packaging_id?:                 number | null;
  price_level_id?:               number | null;
  warehouse_id?:                 number | null;
  party_id?:                     number | null;
  is_purchase?:                  boolean;
  document_date?:                string;
  // الخصم اليدوي — يُمرَّر للباكاند ليُدرجه في حساب الإجماليات
  // الباكاند يُطبّقه فقط إذا لم يوجد خصم كميات تلقائي
  manual_discount_mode?:         'percent' | 'fixed' | null;
  manual_discount_percentage?:   number;
  manual_discount_amount_fixed?: number;  // خصم العبوة الواحدة
}

export interface ComputeLineWarning {
  type:    string;
  level:   'info' | 'warning' | 'error';
  message: string;
}

export interface ComputeLineResult {
  unit_price_ht:             number;
  price_per_pack:            number;
  pack_qty:                  number;
  packaging_id?:             number | null;
  packaging_label?:          string | null;
  discount_percentage:       number;
  discount_amount_per_unit:  number;
  discount_amount_per_pack:  number;
  is_quantity_blocked:       boolean;
  quantity_discount_tier?:   { min_qty: number; max_qty?: number | null; tier_order: number } | null;
  tva_rate:                  number;
  is_tva_exempt:             boolean;
  base_qty:                  number;
  total_ht:                  number;
  total_tva:                 number;
  total_ttc:                 number;
  stock_available:           number | null;
  lot_suggestions:           Array<{
    id:                  number;
    lot_number:          string;
    remaining_quantity:  number;
    expiration_date?:    string | null;
    legal_selling_price?: number | null;
    is_expiring_soon:    boolean;
    is_expired:          boolean;
  }>;
  cost_price:                number;
  margin_amount:             number;
  margin_percentage:         number;
  effective_price_level_id?: number | null;
  party_credit_info?:        {
    credit_limit:     number;
    used_credit:      number;
    available_credit: number;
    will_exceed:      boolean;
    exceed_by:        number;
    credit_days:      number;
  } | null;
  warnings: ComputeLineWarning[];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseComputeLineOptions {
  enabled:     boolean;
  onSuccess?:  (result: ComputeLineResult, lineIdx: number) => void;
  onWarnings?: (warnings: ComputeLineWarning[], lineIdx: number) => void;
}

export function useComputeLine({ enabled, onSuccess, onWarnings }: UseComputeLineOptions) {
  const slug          = useActiveSlug();
  const abortRefs     = useRef<Map<number, AbortController>>(new Map());
  const debounceRefs  = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const [loading, setLoading] = useState<Set<number>>(new Set());

  useEffect(() => () => {
    debounceRefs.current.forEach(clearTimeout);
    abortRefs.current.forEach(ctrl => ctrl.abort());
  }, []);

  const compute = useCallback((
    lineIdx:  number,
    input:    ComputeLineInput,
    delay:    number = 350,
  ) => {
    if (!enabled || !slug || !input.product_id) return;

    const prevDebounce = debounceRefs.current.get(lineIdx);
    if (prevDebounce) clearTimeout(prevDebounce);

    const timer = setTimeout(async () => {
      abortRefs.current.get(lineIdx)?.abort();
      const ctrl = new AbortController();
      abortRefs.current.set(lineIdx, ctrl);

      setLoading(prev => new Set([...prev, lineIdx]));

      try {
        const result = await apiPost<ComputeLineResult>(
          '/documents/compute-line',
          input,
          { signal: ctrl.signal },
        );

        onSuccess?.(result, lineIdx);

        const activeWarnings = result.warnings.filter(w => w.level !== 'info');
        if (activeWarnings.length > 0) {
          onWarnings?.(activeWarnings, lineIdx);
        }

      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') return;
        console.warn(`compute-line error (idx=${lineIdx}):`, err);
      } finally {
        setLoading(prev => {
          const next = new Set(prev);
          next.delete(lineIdx);
          return next;
        });
        abortRefs.current.delete(lineIdx);
      }
    }, delay);

    debounceRefs.current.set(lineIdx, timer);
  }, [enabled, slug, onSuccess, onWarnings]);

  /** استدعاء فوري بدون debounce (عند اختيار منتج جديد) */
  const computeImmediate = useCallback((lineIdx: number, input: ComputeLineInput) => {
    compute(lineIdx, input, 0);
  }, [compute]);

  return { compute, computeImmediate, loading };
}

```

## FILE: resources/js/pages/documents/hooks/useCreditCheck.ts
```
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';
import { toNum } from '../utils/document.utils';

export interface CreditCheckResult {
  party_id:              number;
  party_name:            string;
  credit_limit:          number;
  credit_days:           number;
  used_credit:           number;
  available_credit:      number | null;
  new_amount:            number;
  total_after:           number;
  will_exceed:           boolean;
  exceed_by:             number;
  suggested_due_date:    string | null;
  overdue_invoices:      { count: number; total_amount: number };
  is_tva_exempt:         boolean;
  is_final_consumer:     boolean;
  default_price_level_id: number | null;
  alerts:                Array<{ type: string; level: string; message: string }>;
  can_proceed:           boolean;
}

export function useCreditCheck(options: {
  partyId:    number | null;
  amount:     number;
  date:       string;
  isPurchase: boolean;
  enabled:    boolean;
}) {
  const slug = useActiveSlug();

  return useQuery<CreditCheckResult | null>({
    queryKey: [slug, 'credit-check', options.partyId, Math.round(options.amount), options.date],
    queryFn: async () => {
      if (!options.partyId) return null;
      return apiGet<CreditCheckResult>(
        `/parties/${options.partyId}/credit-check`,
        { amount: options.amount, date: options.date },
      );
    },
    enabled: !!slug && !!options.partyId && !options.isPurchase && options.enabled,
    staleTime: 30_000,
    gcTime: 10_000,
  });
}

```

## FILE: resources/js/pages/documents/hooks/useCustomerInsights.ts
```
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';

export interface CustomerInsightsData {
  party_id:           number;
  party_name:         string;
  party_type:         string | null;
  document_count:     number;
  last_documents:     Array<{
    id:               number;
    document_number:  string;
    document_type:    string | null;
    type_name:        string | null;
    document_date:    string;
    net_to_pay:       number;
    remaining_amount: number;
    status:           string | null;
    status_label:     string | null;
  }>;
  monthly_avg_invoice: number | null;
  avg_payment_days:   number | null;
  top_products:       Array<{
    id:           number;
    name:         string;
    ref:          string | null;
    total_qty:    number;
    total_amount: number;
  }>;
}

export function useCustomerInsights(partyId: number | null, enabled: boolean) {
  const slug = useActiveSlug();
  return useQuery<CustomerInsightsData | null>({
    queryKey: [slug, 'customer-insights', partyId],
    queryFn: async () => {
      if (!partyId) return null;
      return apiGet<CustomerInsightsData>(`/parties/${partyId}/insights`);
    },
    enabled: !!slug && !!partyId && enabled,
    staleTime: 60_000,
    gcTime: 30_000,
  });
}

```

## FILE: resources/js/pages/documents/hooks/useDocumentChain.ts
```
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';
import { tenantKeys } from '@/lib/api/core/queryKeys';

export interface ChainNode {
  id:               number;
  document_number:  string;
  document_type:    string;
  type_name:        string;
  status:           string;
  status_label:     string;
  document_date:    string;
  net_to_pay:       number;
  is_cancellation:  boolean;
  children?:        ChainNode[];
}

export interface DocumentChain {
  ancestors:   ChainNode[];
  current:     ChainNode;
  descendants: ChainNode[];
}

export function useDocumentChain(documentId: number | null | undefined) {
  const slug = useActiveSlug();

  return useQuery<DocumentChain | null>({
    queryKey: [slug, 'document-chain', documentId],
    queryFn: () =>
      documentId
        ? apiGet<DocumentChain>(`/documents/${documentId}/chain`)
        : null,
    enabled: !!slug && !!documentId,
    staleTime: 60_000,
  });
}

// ─── Conversion mutation ──────────────────────────────────────────────────────

export interface ConversionPayload {
  documentId:      number;
  targetTypeCode:  string;
  documentDate?:   string;
  includeLineIds?: number[];
}

export function useConvertDocument() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  return useMutation({
    mutationFn: ({ documentId, targetTypeCode, documentDate, includeLineIds }: ConversionPayload) =>
      apiPost(`/documents/${documentId}/convert`, {
        target_type_code: targetTypeCode,
        document_date:    documentDate ?? null,
        include_line_ids: includeLineIds,
      }),
    onSuccess: () => {
      if (slug) qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
    },
  });
}

// ─── Return mutation ──────────────────────────────────────────────────────────

export interface ReturnPayload {
  documentId: number;
  reason:     string;
  lines:      Array<{ line_id: number; quantity: number }>;
}

export function useCreateReturn() {
  const slug = useActiveSlug();
  const qc   = useQueryClient();

  return useMutation({
    mutationFn: ({ documentId, reason, lines }: ReturnPayload) =>
      apiPost(`/documents/${documentId}/return`, { reason, lines }),
    onSuccess: () => {
      if (slug) qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
    },
  });
}

```

## FILE: resources/js/pages/documents/hooks/useDocumentForm.ts
```
// ════════════════════════════════════════════════════════════════════════════
// pages/documents/hooks/useDocumentForm.ts — إصلاح كامل للحسابات
//
// ══ نموذج الكميات والتعبئة ════════════════════════════════════════════════
//
// الفرونتند يعمل بـ "عدد العبوات" (displayQty) — هذا ما يُدخله المستخدم.
// الباكاند يخزن "وحدات أساسية" (baseQty = displayQty × _packQty).
//
// مثال: المستخدم يدخل 2 كرتون × 12 قارورة = 24 قارورة تُرسَل للباكاند.
//
// ══ نموذج الخصم ══════════════════════════════════════════════════════════
//
// الباكاند يخزن:
//   discount_percentage = نسبة الخصم (تُستخدم في الحساب)
//   discount_amount     = مبلغ خصم الوحدة الواحدة = unit_price_ht × discPct/100
//                         (للمرجع فقط — الحساب يعتمد على discPct)
//
// الفرونتند (percent mode):
//   يُرسل: discount_percentage = L.discount_percentage
//           discount_amount = unit_price_ht × discPct/100  (خصم وحدة واحدة)
//
// الفرونتند (fixed mode):
//   المستخدم يدخل: discount_amount_fixed = خصم العبوة الواحدة
//   يُحوَّل: discPct = (discount_amount_fixed / price_per_pack) × 100
//   يُرسل: discount_percentage = discPct
//           discount_amount = unit_price_ht × discPct/100
//
// ══ الاستقبال من الباكاند (بناء السطر من API) ════════════════════════════
//
//   displayQty = db.quantity / _packQty
//   discount_amount_fixed = db.discount_amount × _packQty
//     (تحويل خصم الوحدة إلى خصم العبوة للعرض)
//
// ════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';
import type { DocumentType } from '@/lib/api/core/types';
import {
  today,
  resolvePrice,
  resolveQuantityDiscount,
  calcTotals,
  calcLineTotal,
  validateLineStock,
  toNum,
} from '../utils/document.utils';
import { useComputeLine } from './useComputeLine';
import type { ComputeLineWarning } from './useComputeLine';
import {
  PURCHASE_CODES,
  REQUIRES_PARTY,
  STOCK_IN_CODES,
  STOCK_OUT_CODES,
} from '../types/document.types';
import type {
  LineItem,
  DocumentFormState,
  DocumentTotals,
  PaymentEntry,
  Product,
  ShippingInfo,
  PaymentTerm,
} from '../types/document.types';
import type { LineStockValidation } from '../utils/document.utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export type FormErrors = Record<string, string>;

export interface PartyBalanceInfo {
  party_id:          number;
  current_balance:   number;
  signed_balance:    number;
  balance_type:      'debit' | 'credit';
  opening_balance:   number;
  documents_balance: number;
  payments_total:    number;
  fiscal_year_id:    number;
  date:              string;
}

export type PaymentMode = 'free' | 'additive' | 'locked';

export interface PriceLevelSwitchMsg {
  from: string;
  to: string;
  productName: string;
}

export interface PartyChangeResult {
  blocked:    boolean;
  reason?:    string;
  blockType?: 'has_payments' | 'price_level_change' | 'existing_payments';
}

interface UseDocumentFormOptions {
  documentType:        DocumentType | null;
  existingDocument?:   Record<string, unknown>;
  defaultTvaRate:      number;
  defaultWarehouseId:  string;
  baseCurrencyId:      string;
  defaultPriceLevelId?: string;
  defaultApplyStamp?:  boolean;
  stampEnabled?:       boolean;
  selectedYearId:      string;
  paymentModes: Array<{
    id:                   number;
    name:                 string;
    code?:                string | null;
    icon?:                string | null;
    treasury_account_id?: number | null;
    requires_reference?:  boolean;
    is_cash?:             boolean;
  }>;
  parties: Array<{
    id:                       number;
    name:                     string;
    default_price_level_id?:  number | null;
    default_price_level?:     { id: number; name: string } | null;
  }>;
  products:      Product[];
  stockData:     Record<number, number>;
  isPurchase:    boolean;
  open:          boolean;
  priceLevels?:  Array<{ id: number; name: string }>;
}

export interface UseDocumentFormReturn {
  form:                   DocumentFormState;
  errors:                 FormErrors;
  lineErr:                string;
  apiErr:                 string;
  setApiErr:              (msg: string) => void;
  set:                    (k: keyof DocumentFormState, v: unknown) => void;
  handlePartyChange:      (id: string) => PartyChangeResult;
  handlePriceLevelChange: (priceLevelIdStr: string) => void;
  priceLevelId:           number | null;
  addLine:                () => void;
  addLineWithProduct:     (productId: string, unitPrice?: number, tvaRate?: number) => void;
  bulkAddLines:           (importedLines: Array<{product_id?: string; description?: string; unit_price_ht?: number; quantity?: number; tva_rate?: number; line_note?: string}>) => void;
  removeLine:             (idx: number) => void;
  duplicateLine:          (idx: number) => void;
  updateLine:             (idx: number, patch: Partial<LineItem>, product?: Product | null) => void;
  paymentMode:            PaymentMode;
  payments:               PaymentEntry[];
  addPayment:             () => void;
  addPaymentWithValues:   (values: Partial<PaymentEntry>) => void;
  removePayment:          (idx: number) => void;
  updatePayment:          (idx: number, patch: Partial<PaymentEntry>) => void;
  partyBalance:           PartyBalanceInfo | null;
  isLoadingBalance:       boolean;
  totals:                 DocumentTotals;
  validate:               () => boolean;
  buildPayload:           () => Record<string, unknown>;
  validateLineStock:      (line: LineItem, product: Product) => LineStockValidation;
  updateStockData:        (data: Record<number, number>) => void;
  docCode:                string;
  isEdit:                 boolean;
  needsParty:             boolean;
  affectsStock:           boolean;
  stockDir:               1 | -1 | 0;
  isReadOnly:             boolean;
  isLinesReadOnly:        boolean;
  lineWarnings:           Map<number, ComputeLineWarning[]>;
  priceLevelSwitchMsg:    PriceLevelSwitchMsg | null;
  clearPriceLevelSwitchMsg: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VALIDATED_STATUSES = new Set(['validated', 'paid', 'partially_paid', 'overdue']);
const LOCKED_STATUSES    = new Set(['cancelled', 'returned']);

// ─── makeLine ─────────────────────────────────────────────────────────────────

function makeLine(defaultTvaRate: number): LineItem {
  return {
    product_id:            '',
    description:           '',
    quantity:              1,
    unit_price_ht:         0,
    price_per_pack:        0,
    discount_mode:         'percent',
    discount_percentage:   0,
    discount_amount_fixed: 0,
    tva_rate:              defaultTvaRate,
    packaging_id:          '',
    stock_lot_id:          '',
    lot_number_new:        '',
    line_note:             '',
    _packQty:              1,
  };
}

// ─── resolvePackQty ───────────────────────────────────────────────────────────

/**
 * يحدد كمية الوحدات في العبوة من مصادر متعددة:
 * 1. packaging relation مُحمَّلة مباشرة
 * 2. product.packagings من productRel
 * 3. products list (عند التعديل)
 */
function resolvePackQty(
  packagingId:  string,
  packagingRel: Record<string, unknown> | null,
  productRel:   Record<string, unknown> | null,
  products?:    Product[],
  productId?:   string,
): number {
  if (!packagingId) return 1;

  // 1. من العلاقة المباشرة
  if (packagingRel) {
    const q = Number(packagingRel.quantity);
    if (q > 0) return q;
  }

  // 2. من packagings المنتج في API response
  if (productRel) {
    const pkgs = (productRel as Record<string, unknown>).packagings;
    if (Array.isArray(pkgs)) {
      const found = pkgs.find((p: Record<string, unknown>) => String(p.id) === packagingId);
      if (found) {
        const q = Number((found as Record<string, unknown>).quantity);
        if (q > 0) return q;
      }
    }
  }

  // 3. من قائمة products الكاملة
  if (products && productId) {
    const prod = products.find((p) => String(p.id) === productId);
    const pkg  = prod?.packagings?.find((p) => String(p.id) === packagingId);
    if (pkg) {
      const q = Number(pkg.quantity);
      if (q > 0) return q;
    }
  }

  return 1;
}

// ─── buildLineFromApi ─────────────────────────────────────────────────────────

/**
 * بناء LineItem من بيانات الباكاند.
 *
 * الباكاند يخزن:
 *   quantity      = وحدات أساسية
 *   discount_amount = خصم الوحدة الواحدة = unit_price × discPct/100
 *
 * الفرونتند يعرض:
 *   quantity      = عدد العبوات = db.quantity / packQty
 *   discount_amount_fixed = خصم العبوة الواحدة = db.discount_amount × packQty
 */
function buildLineFromApi(
  l:              Record<string, unknown>,
  defaultTvaRate: number,
  products?:      Product[],
): LineItem {
  const productRel =
    (l.product        as Record<string, unknown> | null) ??
    (l.productVariant as Record<string, unknown> | null) ??
    null;

  const packagingRel = (l.packaging as Record<string, unknown> | null) ?? null;
  const packagingId  = packagingRel
    ? String(packagingRel.id)
    : l.packaging_id ? String(l.packaging_id) : '';

  const packQty = resolvePackQty(
    packagingId,
    packagingRel,
    productRel,
    products,
    String(l.product_id ?? ''),
  );

  const stockLotRel =
    (l.stockLot  as Record<string, unknown> | null) ??
    (l.stock_lot as Record<string, unknown> | null) ??
    null;
  const stockLotId = stockLotRel
    ? String(stockLotRel.id)
    : l.stock_lot_id ? String(l.stock_lot_id) : '';

  const unitPrice          = toNum(l.unit_price_ht ?? 0);
  const discountPercentage = toNum(l.discount_percentage ?? 0);

  // discount_amount في DB = خصم الوحدة الواحدة
  // discount_amount_fixed في الفرونتند = خصم العبوة الواحدة
  const dbDiscountAmount   = toNum(l.discount_amount ?? 0);
  const discountAmountFixed = packQty > 1
    ? Math.round(dbDiscountAmount * packQty * 10_000) / 10_000
    : dbDiscountAmount;

  const discountMode: 'percent' | 'fixed' =
    dbDiscountAmount > 0 && discountPercentage === 0 ? 'fixed' : 'percent';

  // TVA: 0 = معفى (قيمة صحيحة — لا تُستبدَل)
  let tvaRate = l.tva_rate != null ? toNum(l.tva_rate) : NaN;
  if (isNaN(tvaRate) && productRel) {
    tvaRate = toNum((productRel.tva as Record<string, unknown> | null)?.rate ?? NaN);
  }
  if (isNaN(tvaRate)) tvaRate = defaultTvaRate;

  // تحويل الكمية من وحدات أساسية إلى عدد عبوات
  const dbQty    = toNum(l.quantity ?? 1) || 1;
  const displayQty = packQty > 1
    ? Math.round((dbQty / packQty) * 1_000_000) / 1_000_000
    : dbQty;

  return {
    id:                    l.id as number | undefined,
    product_id:            String(l.product_id ?? ''),
    description:           String(l.description ?? ''),
    quantity:              displayQty,
    unit_price_ht:         unitPrice,
    price_per_pack:        Math.round(unitPrice * packQty * 10_000) / 10_000,
    discount_mode:         discountMode,
    discount_percentage:   discountPercentage,
    discount_amount_fixed: discountAmountFixed,
    tva_rate:              tvaRate,
    packaging_id:          packagingId,
    stock_lot_id:          stockLotId,
    lot_number_new:        String(
      stockLotRel?.lot_number ?? l.lot_number ?? l.lot_number_new ?? '',
    ),
    line_note:             String(l.notes ?? l.line_note ?? ''),
    _product:              productRel as Product | undefined,
    _packQty:              packQty,
  };
}

// ─── buildPaymentFromApi ──────────────────────────────────────────────────────

export function buildPaymentFromApi(p: Record<string, unknown>): PaymentEntry {
  const treasuryId = p.treasury_account_id
    ? String(p.treasury_account_id)
    : (p.treasuryAccount as Record<string, unknown> | null)?.id
      ? String((p.treasuryAccount as Record<string, unknown>).id)
      : '';

  const paymentModeId = String(
    p.payment_mode_id ??
    (p.paymentMode as Record<string, unknown> | null)?.id ??
    '',
  );

  return {
    id:                    p.id != null ? Number(p.id) : undefined,
    payment_mode_id:     paymentModeId,
    amount:              String(p.amount ?? '0'),
    reference:           String(p.reference ?? ''),
    notes:               p.notes ? String(p.notes) : undefined,
    client_ref:          p.client_ref ? String(p.client_ref) : undefined,
    payment_date:        String(p.payment_date ?? today()).split('T')[0],
    treasury_account_id: treasuryId,
  };
}

// ─── buildDefaultForm ─────────────────────────────────────────────────────────

function buildDefaultForm(
  existingDocument: Record<string, unknown> | undefined,
  defaults: { warehouseId: string; currencyId: string; yearId: string; priceLevelId?: string; applyStamp?: boolean },
  defaultTvaRate: number,
  products?: Product[],
  stampEnabled?: boolean,
): DocumentFormState {
  const stamp = stampEnabled !== false
    ? (defaults.applyStamp ?? false)
    : false;
  const defaultShipping: ShippingInfo = {};
  const defaultPaymentTerms: PaymentTerm[] = [];

  if (existingDocument) {
    const doc   = existingDocument;
    const lines = ((doc.lines as Record<string, unknown>[]) ?? [])
      .map((l) => buildLineFromApi(l, defaultTvaRate, products));

    const rawShipping = (doc as Record<string, unknown>).shipping_info;
    const rawTerms    = (doc as Record<string, unknown>).payment_terms;

    return {
      party_id:       String(doc.party_id       ?? ''),
      document_date:  String(doc.document_date  ?? today()).split('T')[0],
      due_date:       doc.due_date ? String(doc.due_date).split('T')[0] : '',
      delivery_date:  doc.delivery_date ? String(doc.delivery_date).split('T')[0] : '',
      notes:          String(doc.notes          ?? ''),
      internal_notes: String(doc.internal_notes ?? ''),
      warehouse_id:   String(doc.warehouse_id   ?? ''),
      fiscal_year_id: String(doc.fiscal_year_id ?? ''),
      currency_id:    String(doc.currency_id    ?? ''),
      exchange_rate:  String(doc.exchange_rate  ?? '1'),
      apply_stamp:    stampEnabled !== false
        ? (toNum(doc.total_stamp ?? doc.fiscal_stamp ?? 0) > 0)
        : false,
      price_level_id: String(doc.price_level_id ?? ''),
      lines,
      payments: [],
      shipping_info:  (typeof rawShipping === 'object' && rawShipping !== null)
        ? (rawShipping as ShippingInfo) : { ...defaultShipping },
      payment_terms:  Array.isArray(rawTerms)
        ? (rawTerms as PaymentTerm[]) : [...defaultPaymentTerms],
    };
  }

  return {
    party_id: '', document_date: today(), due_date: '', delivery_date: '',
    notes: '', internal_notes: '',
    warehouse_id:   defaults.warehouseId,
    fiscal_year_id: defaults.yearId,
    currency_id:    defaults.currencyId,
    exchange_rate:  '1',
    apply_stamp:    stamp,
    price_level_id: defaults.priceLevelId ?? '',
    lines: [], payments: [],
    shipping_info:  { ...defaultShipping },
    payment_terms:  [...defaultPaymentTerms],
  };
}

// ─── resolvePaymentMode ───────────────────────────────────────────────────────

function resolvePaymentMode(
  existingDocument: Record<string, unknown> | undefined,
  isLocked:    boolean,
  isCancelled: boolean,
): PaymentMode {
  if (!existingDocument) return 'free';
  if (isLocked || isCancelled) return 'locked';
  const statusName = String(
    (existingDocument.document_status as Record<string, unknown> | undefined)?.name
    ?? existingDocument.status ?? '',
  ).toLowerCase();
  if (VALIDATED_STATUSES.has(statusName)) return 'additive';
  return 'free';
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDocumentForm({
  documentType,
  existingDocument,
  defaultTvaRate,
  defaultWarehouseId,
  baseCurrencyId,
  defaultPriceLevelId = '',
  defaultApplyStamp = false,
  stampEnabled = true,
  selectedYearId,
  paymentModes,
  parties,
  products,
  stockData,
  isPurchase,
  open,
  priceLevels = [],
}: UseDocumentFormOptions): UseDocumentFormReturn {

  const slug    = useActiveSlug();
  const docCode = documentType?.code ?? '';
  const isEdit  = !!existingDocument;

  const needsParty   = REQUIRES_PARTY.has(docCode);
  const affectsStock = STOCK_IN_CODES.has(docCode) || STOCK_OUT_CODES.has(docCode);
  const stockDir: 1 | -1 | 0 = STOCK_IN_CODES.has(docCode) ? 1
                              : STOCK_OUT_CODES.has(docCode) ? -1 : 0;

  // ── حالة المستند ──────────────────────────────────────────────────────────

  const docStatusName = String(
    (existingDocument?.document_status as Record<string, unknown> | undefined)?.name
    ?? existingDocument?.status ?? '',
  ).toLowerCase();

  const isLocked    = !!(existingDocument?.is_locked);
  const isCancelled = LOCKED_STATUSES.has(docStatusName);
  const isReadOnly  = isLocked || isCancelled;
  const isLinesReadOnly = isReadOnly;

  const pmMode = resolvePaymentMode(existingDocument, isLocked, isCancelled);

  // ── Refs ──────────────────────────────────────────────────────────────────

  const stockDataRef   = useRef(stockData);
  const paymentModsRef = useRef(paymentModes);
  const partiesRef     = useRef(parties);
  const productsRef    = useRef(products);
  const formRef        = useRef<DocumentFormState | null>(null);

  useEffect(() => { stockDataRef.current   = stockData;    }, [stockData]);
  useEffect(() => { paymentModsRef.current = paymentModes; }, [paymentModes]);
  useEffect(() => { partiesRef.current     = parties;      }, [parties]);
  useEffect(() => { productsRef.current    = products;     }, [products]);

  // ── State ─────────────────────────────────────────────────────────────────

  const [form, setForm]   = useState<DocumentFormState>(() =>
    buildDefaultForm(existingDocument, {
      warehouseId: defaultWarehouseId,
      currencyId:  baseCurrencyId,
      yearId:      selectedYearId,
      priceLevelId: defaultPriceLevelId,
      applyStamp:  defaultApplyStamp,
    }, defaultTvaRate, products, stampEnabled),
  );
  const [errors,  setErrors]  = useState<FormErrors>({});
  const [lineErr, setLineErr] = useState('');
  const [apiErr,  setApiErr]  = useState('');

  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [lineWarnings, setLineWarnings] = useState<Map<number, ComputeLineWarning[]>>(new Map());
  const [priceLevelSwitchMsg, setPriceLevelSwitchMsg] = useState<PriceLevelSwitchMsg | null>(null);

  useEffect(() => { formRef.current = form; }, [form]);

  // ── useComputeLine — تحديث السطر من الباكاند ──────────────────────────────
  const warehouseIdForCompute = form.warehouse_id ? parseInt(form.warehouse_id) : null;
  const partyIdForCompute     = form.party_id     ? parseInt(form.party_id)     : null;

  const { compute: triggerCompute } = useComputeLine({
    enabled: !!slug,
    onSuccess: (result, lineIdx) => {
      setForm(f => {
        const lines = [...f.lines];
        const L     = lines[lineIdx];
        if (!L || !L.product_id) return f;

        // ── الخصم ────────────────────────────────────────────────────────────
        // الباكاند يُعيد خصم الكميات التلقائي فقط (quantity_discounts).
        // إذا كان المستخدم قد أدخل خصماً يدوياً (percent أو fixed)
        // نحتفظ بخصمه ولا نُكتب عليه — إلا إذا جاء خصم كميات جديد من الباكاند.
        let discountMode       = L.discount_mode;
        let discountPercentage = L.discount_percentage;
        let discountAmountFixed = L.discount_amount_fixed;

        if (result.discount_percentage > 0) {
          // خصم كميات تلقائي من الباكاند — يُطبَّق دائماً (له الأولوية)
          discountMode        = 'percent';
          discountPercentage  = result.discount_percentage;
          discountAmountFixed = 0;
        } else if (result.quantity_discount_tier === null && L._fromCompute) {
          // لا يوجد خصم كميات + السطر كان مُعيَّناً من compute سابق → صفّر
          discountMode        = 'percent';
          discountPercentage  = 0;
          discountAmountFixed = 0;
        }
        // غير ذلك: نُبقي على الخصم اليدوي كما هو

        lines[lineIdx] = {
          ...L,
          unit_price_ht:         result.unit_price_ht,
          price_per_pack:        result.price_per_pack,
          _packQty:              result.pack_qty,
          discount_mode:         discountMode,
          discount_percentage:   discountPercentage,
          discount_amount_fixed: discountAmountFixed,
          tva_rate:              result.tva_rate,
          stock_lot_id: L.stock_lot_id || (
            result.lot_suggestions[0] ? String(result.lot_suggestions[0].id) : ''
          ),
          _computing:   false,
          _fromCompute: true,   // علامة: هذا السطر مرّ على compute مرة واحدة على الأقل
          _warnings:    result.warnings,
        };
        return { ...f, lines };
      });
    },
    onWarnings: (warnings, lineIdx) => {
      setLineWarnings(prev => {
        const next = new Map(prev);
        if (warnings.length > 0) next.set(lineIdx, warnings);
        else next.delete(lineIdx);
        return next;
      });
    },
  });

  // ── Reset عند فتح ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;

    setForm(buildDefaultForm(
      existingDocument,
      { warehouseId: defaultWarehouseId, currencyId: baseCurrencyId, yearId: selectedYearId, priceLevelId: defaultPriceLevelId, applyStamp: defaultApplyStamp },
      defaultTvaRate,
      productsRef.current,
      stampEnabled,
    ));
    setErrors({});
    setLineErr('');
    setApiErr('');

    const rawPayments = ((existingDocument?.payments as Record<string, unknown>[]) ?? [])
      .map(buildPaymentFromApi);
    setPayments(rawPayments);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existingDocument?.id]);

  useEffect(() => {
    if (isEdit || !open) return;
    setForm((f) => ({
      ...f,
      warehouse_id:   f.warehouse_id   || defaultWarehouseId,
      currency_id:    f.currency_id    || baseCurrencyId,
      fiscal_year_id: f.fiscal_year_id || selectedYearId,
      price_level_id: f.price_level_id || defaultPriceLevelId,
      apply_stamp:    stampEnabled !== false
        ? ((!('apply_stamp' in f) || !f.apply_stamp) ? defaultApplyStamp : f.apply_stamp)
        : false,
    }));
  }, [defaultWarehouseId, baseCurrencyId, selectedYearId, defaultPriceLevelId, defaultApplyStamp, stampEnabled, isEdit, open]);

  // ── set ───────────────────────────────────────────────────────────────────

  const set = useCallback((k: keyof DocumentFormState, v: unknown) => {
    if (k === 'apply_stamp' && stampEnabled === false) return;
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((prev) => { const n = { ...prev }; delete n[k as string]; return n; });
  }, [stampEnabled]);

  const priceLevelId = useMemo(
    () => (form.price_level_id ? parseInt(form.price_level_id) : null),
    [form.price_level_id],
  );

  // ── رصيد المتعامل ─────────────────────────────────────────────────────────

  const partyIdNum = form.party_id ? parseInt(form.party_id) : null;

  const { data: partyBalance = null, isLoading: isLoadingBalance } =
    useQuery<PartyBalanceInfo | null>({
      queryKey: [slug, 'party-balance', partyIdNum, form.fiscal_year_id, form.document_date],
      queryFn: async () => {
        if (!partyIdNum) return null;
        return apiGet<PartyBalanceInfo>(
          `/party-balances/${partyIdNum}`,
          { date: form.document_date || today() },
        );
      },
      enabled:   !!slug && !!partyIdNum && needsParty,
      staleTime: 60_000,
    });

  // ── handlePartyChange ─────────────────────────────────────────────────────

  const handlePartyChange = useCallback((id: string): PartyChangeResult => {
    if (isPurchase) {
      setForm((f) => ({ ...f, party_id: id }));
      setErrors((prev) => { const n = { ...prev }; delete n.party_id; return n; });
      return { blocked: false };
    }

    const curForm       = formRef.current!;
    const party         = partiesRef.current.find((p) => String(p.id) === id);
    const newPriceLevel = party?.default_price_level_id ?? party?.default_price_level?.id ?? party?.price_level?.id ?? (defaultPriceLevelId ? parseInt(defaultPriceLevelId) : null);
    const curPriceLvl   = curForm.price_level_id ? parseInt(curForm.price_level_id) : null;

    const hasPayments = payments.some((p) => p.payment_mode_id && parseFloat(p.amount) > 0);
    if (existingDocument && hasPayments) {
      const existingCount = payments.filter((p) => p.id).length;
      if (existingCount > 0) {
        return {
          blocked: true, blockType: 'existing_payments',
          reason: 'لا يمكن تغيير الزبون: هناك دفعات مُسجَّلة. احذف الدفعات أولاً.',
        };
      }
      return {
        blocked: true, blockType: 'has_payments',
        reason: `لا يمكن تغيير الزبون: هناك دفعات في النموذج. احذفها أولاً.`,
      };
    }

    const hasFilledLines  = curForm.lines.some((l) => l.product_id !== '');
    const priceWillChange = newPriceLevel !== curPriceLvl;

    if (hasFilledLines && priceWillChange) {
      return {
        blocked: true, blockType: 'price_level_change',
        reason: `فئة السعر ستتغير. احذف الأسطر أولاً ثم غيِّر الزبون.`,
      };
    }

    const newPriceLevelStr = newPriceLevel ? String(newPriceLevel) : defaultPriceLevelId;

    // due_date تلقائي من credit_days
    const creditDays = (party as Record<string, unknown> | undefined)?.credit_days as number ?? 0;
    const curDate    = formRef.current?.document_date || today();
    let   newDueDate = formRef.current?.due_date || '';
    if (creditDays > 0) {
      const d = new Date(curDate);
      d.setDate(d.getDate() + creditDays);
      newDueDate = d.toISOString().split('T')[0];
    }

    setForm((f) => {
      const isTvaExempt = (party as Record<string, unknown> | undefined)?.is_tva_exempt as boolean ?? false;

      // إذا كان الزبون معفى من TVA → تصفير TVA في كل الأسطر
      const updatedLines = isTvaExempt
        ? f.lines.map(line => ({ ...line, tva_rate: 0 }))
        : f.lines;

      return {
        ...f,
        party_id:       id,
        price_level_id: newPriceLevelStr,
        lines:          updatedLines,
        ...(newDueDate ? { due_date: newDueDate } : {}),
      };
    });
    setErrors((prev) => { const n = { ...prev }; delete n.party_id; return n; });
    return { blocked: false };
  }, [isPurchase, payments, defaultPriceLevelId]);

  // ── handlePriceLevelChange ────────────────────────────────────────────────

  const handlePriceLevelChange = useCallback((priceLevelIdStr: string) => {
    const newPriceLevelId = priceLevelIdStr ? parseInt(priceLevelIdStr) : null;

    setForm((f) => ({
      ...f,
      price_level_id: priceLevelIdStr,
      lines: f.lines.map((line) => {
        if (!line.product_id || !line._product) return line;
        const newPrice = resolvePrice(line._product, newPriceLevelId, isPurchase);
        return {
          ...line,
          unit_price_ht:  newPrice,
          price_per_pack: Math.round(newPrice * line._packQty * 10_000) / 10_000,
        };
      }),
    }));
  }, [isPurchase]);

  // ── updateLine ────────────────────────────────────────────────────────────

  const priceLevelMap = useMemo(() =>
    Object.fromEntries(priceLevels.map((pl) => [pl.id, pl.name])),
    [priceLevels],
  );

  const updateLine = useCallback((
    idx:      number,
    patch:    Partial<LineItem>,
    product?: Product | null,
  ) => {
    // ── Auto-switch price level if product has no price for current one ──
    const prevForm  = formRef.current;
    const curPLRaw  = prevForm?.price_level_id ?? '';
    const curPLId   = curPLRaw ? parseInt(curPLRaw) : null;
    const switched  = { to: '', plChanged: false };

    if (product && curPLId && product.prices?.length) {
      const hasPriceForCur = product.prices.some((p) => p.price_level_id === curPLId && p.active);
      if (!hasPriceForCur) {
        const firstAvail = product.prices.find((p) => p.active);
        if (firstAvail) {
          switched.to       = String(firstAvail.price_level_id);
          switched.plChanged = true;
          setPriceLevelSwitchMsg({
            from:        priceLevelMap[curPLId] ?? String(curPLId),
            to:          priceLevelMap[firstAvail.price_level_id] ?? String(firstAvail.price_level_id),
            productName: product.name,
          });
        }
      }
    }

    setForm((f) => {
      const lines           = [...f.lines];
      let   L               = { ...lines[idx], ...patch };
      const effectivePLRaw  = switched.plChanged ? switched.to : f.price_level_id;
      const curPriceLevelId = effectivePLRaw ? parseInt(effectivePLRaw) : null;

      // ─ L1: اختيار منتج جديد ──────────────────────────────────────────────
      if (product !== undefined) {
        if (product) {
          L.description = product.name;

          // TVA — 0 معفى لا تُستبدَل
          L.tva_rate = product.tva?.rate != null
            ? toNum(product.tva.rate)
            : defaultTvaRate;

          // التعبئة الافتراضية
          const defPkg   = (product.packagings ?? []).find((pk) => pk.is_default);
          L.packaging_id = defPkg ? String(defPkg.id) : '';
          L._packQty     = defPkg ? (Number(defPkg.quantity) || 1) : 1;

          // السعر بوحدة أساسية
          const unitPrice  = resolvePrice(product, curPriceLevelId, isPurchase);
          L.unit_price_ht  = unitPrice;
          L.price_per_pack = Math.round(unitPrice * L._packQty * 10_000) / 10_000;

          // خصم الكميات — يحتاج baseQty
          const baseQty = Math.round(L.quantity * L._packQty * 1_000_000) / 1_000_000;
          const qd = resolveQuantityDiscount(product, baseQty, curPriceLevelId);
          if (qd.percentage > 0) {
            L.discount_mode         = 'percent';
            L.discount_percentage   = qd.percentage;
            L.discount_amount_fixed = 0;
          } else if (qd.fixed > 0) {
            // qd.fixed = خصم الوحدة الأساسية → نحوّل لعبوة
            L.discount_mode         = 'fixed';
            L.discount_amount_fixed = Math.round(qd.fixed * L._packQty * 10_000) / 10_000;
            L.discount_percentage   = 0;
          } else {
            L.discount_mode         = 'percent';
            L.discount_percentage   = 0;
            L.discount_amount_fixed = 0;
          }

          // الحصة (lot) — أول متاحة للبيع
          if (!isPurchase && product.has_lots) {
            const firstLot = (product.lots ?? []).find((lt) => lt.remaining_quantity > 0);
            L.stock_lot_id = firstLot ? String(firstLot.id) : '';
          } else {
            L.stock_lot_id   = '';
            L.lot_number_new = '';
          }

          L._product = product;

          // ── استدعاء compute-line فوراً من الباكاند ──
          triggerCompute(idx, {
            product_id:                   product.id,
            quantity:                     L.quantity,
            packaging_id:                 L.packaging_id ? parseInt(L.packaging_id) : null,
            price_level_id:               curPriceLevelId,
            warehouse_id:                 warehouseIdForCompute,
            party_id:                     partyIdForCompute,
            is_purchase:                  isPurchase,
            document_date:                formRef.current?.document_date,
            // عند اختيار منتج جديد لا يوجد خصم يدوي بعد
          }, 0); // فوري بدون debounce عند اختيار منتج جديد

        } else {
          // تفريغ المنتج
          L._product = undefined;
          L.packaging_id = ''; L._packQty = 1;
          L.unit_price_ht = 0; L.price_per_pack = 0;
          L.stock_lot_id = '';
          L.discount_percentage = 0; L.discount_amount_fixed = 0;
        }
      }

      // ─ L3: تغيير التعبئة ──────────────────────────────────────────────────
      if (patch.packaging_id !== undefined && product === undefined) {
        const packId = patch.packaging_id;

        // ابحث في _product أولاً ثم في productsRef
        let pkg = (L._product?.packagings ?? []).find((pk) => String(pk.id) === packId);
        if (!pkg && productsRef.current) {
          const prod = productsRef.current.find((p) => String(p.id) === L.product_id);
          pkg = prod?.packagings?.find((pk) => String(pk.id) === packId);
        }

        const oldPackQty = L._packQty;
        L._packQty       = pkg ? (Number(pkg.quantity) || 1) : 1;

        // تحويل: unit_price_ht لا يتغير — فقط price_per_pack
        L.price_per_pack = Math.round(L.unit_price_ht * L._packQty * 10_000) / 10_000;

        // تحديث discount_amount_fixed (كان خصم العبوة القديمة → نحوّل للجديدة)
        if (L.discount_mode === 'fixed' && oldPackQty > 0) {
          const unitDisc = L.discount_amount_fixed / oldPackQty;
          L.discount_amount_fixed = Math.round(unitDisc * L._packQty * 10_000) / 10_000;
        }

        // تحديث خصم الكميات
        if (L._product) {
          const baseQty = Math.round(L.quantity * L._packQty * 1_000_000) / 1_000_000;
          const qd = resolveQuantityDiscount(L._product, baseQty, curPriceLevelId);
          if (qd.percentage > 0) {
            L.discount_mode         = 'percent';
            L.discount_percentage   = qd.percentage;
            L.discount_amount_fixed = 0;
          }
        }
      }

      // ─ L4: تغيير سعر الوحدة يدوياً ───────────────────────────────────────
      if (patch.unit_price_ht !== undefined && product === undefined) {
        L.price_per_pack = Math.round(patch.unit_price_ht * L._packQty * 10_000) / 10_000;
      }

      // ─ L5: تغيير سعر التعبئة يدوياً ──────────────────────────────────────
      if (patch.price_per_pack !== undefined && product === undefined) {
        L.unit_price_ht = L._packQty > 1
          ? Math.round((patch.price_per_pack / L._packQty) * 10_000) / 10_000
          : patch.price_per_pack;
        // price_per_pack مُحدَّث بالفعل من patch
      }

      // ─ L6: تغيير الكمية → خصم الكميات + compute ────────────────────────
      if (patch.quantity !== undefined && L.product_id) {
        if (L._product && !isPurchase) {
          const baseQty = Math.round(patch.quantity * L._packQty * 1_000_000) / 1_000_000;
          const qd = resolveQuantityDiscount(L._product, baseQty, curPriceLevelId);
          if (qd.percentage > 0) {
            L.discount_mode = 'percent'; L.discount_percentage = qd.percentage; L.discount_amount_fixed = 0;
          } else if (qd.fixed > 0) {
            L.discount_mode = 'fixed'; L.discount_amount_fixed = Math.round(qd.fixed * L._packQty * 10_000) / 10_000; L.discount_percentage = 0;
          }
        }
        // compute-line مع debounce 350ms عند تغيير الكمية
        if (L.product_id) {
          setTimeout(() => triggerCompute(idx, {
            product_id:                   parseInt(L.product_id),
            quantity:                     patch.quantity as number,
            packaging_id:                 L.packaging_id ? parseInt(L.packaging_id) : null,
            price_level_id:               curPriceLevelId,
            warehouse_id:                 warehouseIdForCompute,
            party_id:                     partyIdForCompute,
            is_purchase:                  isPurchase,
            document_date:                formRef.current?.document_date,
            // نُمرّر الخصم اليدوي للباكاند ليحسب الإجماليات الصحيحة
            manual_discount_mode:         L.discount_mode,
            manual_discount_percentage:   L.discount_mode === 'percent' ? L.discount_percentage : 0,
            manual_discount_amount_fixed: L.discount_mode === 'fixed'   ? L.discount_amount_fixed : 0,
          }, 350), 0);
        }
      }

      lines[idx] = L;
      return switched.plChanged ? { ...f, lines, price_level_id: switched.to } : { ...f, lines };
    });
    setLineErr('');
  }, [defaultTvaRate, isPurchase, priceLevelMap]);

  // ── addLine / removeLine / duplicateLine ──────────────────────────────────

  const addLine = useCallback(() => {
    setForm((f) => ({ ...f, lines: [...f.lines, makeLine(defaultTvaRate)] }));
    setLineErr('');
  }, [defaultTvaRate]);

  const addLineWithProduct = useCallback((productId: string, unitPrice?: number, tvaRate?: number) => {
    setForm((f) => ({
      ...f,
      lines: [
        ...f.lines,
        {
          ...makeLine(defaultTvaRate),
          product_id: productId,
          unit_price_ht: unitPrice ?? 0,
          tva_rate: tvaRate ?? defaultTvaRate,
        },
      ],
    }));
  }, [defaultTvaRate]);

  const bulkAddLines = useCallback((importedLines: Array<{
    product_id?: string; description?: string; unit_price_ht?: number; quantity?: number; tva_rate?: number; line_note?: string;
  }>) => {
    setForm((f) => ({
      ...f,
      lines: [
        ...f.lines,
        ...importedLines.map((line) => ({
          ...makeLine(defaultTvaRate),
          product_id: line.product_id ?? '',
          description: line.description ?? '',
          unit_price_ht: line.unit_price_ht ?? 0,
          quantity: line.quantity ?? 1,
          tva_rate: line.tva_rate ?? defaultTvaRate,
          line_note: line.line_note ?? '',
        })),
      ],
    }));
  }, [defaultTvaRate]);

  const removeLine = useCallback((idx: number) => {
    setForm((f) => ({ ...f, lines: f.lines.filter((_, i) => i !== idx) }));
  }, []);

  const duplicateLine = useCallback((idx: number) => {
    setForm((f) => {
      const lines = [...f.lines];
      lines.splice(idx + 1, 0, { ...lines[idx], id: undefined });
      return { ...f, lines };
    });
  }, []);

  // ── _clientRef generator (frontend-only idempotency token) ────────────────

  function genClientRef(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `cr_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  // ── إدارة الدفعات ─────────────────────────────────────────────────────────

  const addPayment = useCallback(() => {
    if (pmMode === 'locked') return;
    const firstMode = paymentModsRef.current[0];
    setPayments((prev) => [...prev, {
      payment_mode_id:     firstMode ? String(firstMode.id) : '',
      amount:              '',
      reference:           '',
      payment_date:        today(),
      treasury_account_id: firstMode?.treasury_account_id
        ? String(firstMode.treasury_account_id) : '',
      _clientRef:          genClientRef(),
    }]);
  }, [pmMode]);

  const addPaymentWithValues = useCallback((values: Partial<PaymentEntry>) => {
    if (pmMode === 'locked') return;
    const firstMode = paymentModsRef.current[0];
    setPayments((prev) => [...prev, {
      payment_mode_id:     firstMode ? String(firstMode.id) : '',
      amount:              '',
      reference:           '',
      payment_date:        today(),
      treasury_account_id: firstMode?.treasury_account_id
        ? String(firstMode.treasury_account_id) : '',
      _clientRef:          genClientRef(),
      ...values,
    }]);
  }, [pmMode]);

  const removePayment = useCallback((idx: number) => {
    if (pmMode === 'locked') return;
    setPayments((prev) => prev.filter((_, i) => i !== idx));
  }, [pmMode]);

  const updatePayment = useCallback((idx: number, patch: Partial<PaymentEntry>) => {
    if (pmMode === 'locked') return;
    setPayments((prev) => {
      const payments = [...prev];
      let   P        = { ...payments[idx], ...patch };
      if (patch.payment_mode_id !== undefined) {
        const selectedMode = paymentModsRef.current.find(
          (pm) => String(pm.id) === patch.payment_mode_id,
        );
        P.treasury_account_id = selectedMode?.treasury_account_id
          ? String(selectedMode.treasury_account_id) : '';
      }
      payments[idx] = P;
      return payments;
    });
  }, [pmMode]);

  // ── Totals ────────────────────────────────────────────────────────────────

  const totals = useMemo(
    () => calcTotals(form.lines, form.apply_stamp, payments),
    [form.lines, form.apply_stamp, payments],
  );

  // ── validate ──────────────────────────────────────────────────────────────

  const validate = useCallback((): boolean => {
    const errs: FormErrors = {};

    if (needsParty && !form.party_id)
      errs.party_id = isPurchase ? 'المورد إلزامي' : 'الزبون إلزامي';
    if (!form.document_date)  errs.document_date  = 'التاريخ إلزامي';
    if (!form.warehouse_id)   errs.warehouse_id   = 'المستودع إلزامي';
    if (!form.fiscal_year_id) errs.fiscal_year_id = 'السنة المالية إلزامية';
    if (!form.currency_id)    errs.currency_id    = 'العملة إلزامية';

    if (!isLinesReadOnly) {
      if (form.lines.length === 0) {
        setLineErr('يجب إضافة سطر واحد على الأقل');
        setErrors(errs); return false;
      }

      for (let i = 0; i < form.lines.length; i++) {
        const line = form.lines[i];
        if (!line.product_id) {
          setLineErr(`السطر ${i + 1}: المنتج إلزامي`);
          setErrors(errs); return false;
        }
        if (line.quantity <= 0) {
          setLineErr(`السطر ${i + 1}: الكمية يجب أن تكون > 0`);
          setErrors(errs); return false;
        }
        if (!isPurchase && line.unit_price_ht === 0) {
          setLineErr(`السطر ${i + 1}: السعر إلزامي`);
          setErrors(errs); return false;
        }
        if (line._product) {
          const sv = validateLineStock(line, line._product, isPurchase, stockDataRef.current);
          if (!sv.ok && sv.blocking) {
            setLineErr(`السطر ${i + 1}: ${sv.message}`);
            setErrors(errs); return false;
          }
        }
      }
    }

    for (let i = 0; i < payments.length; i++) {
      const pay    = payments[i];
      const amount = parseFloat(pay.amount);
      if (amount <= 0) continue;
      if (!pay.payment_mode_id) {
        setLineErr(`الدفعة ${i + 1}: يجب اختيار طريقة الدفع`);
        setErrors(errs); return false;
      }
      const mode = paymentModsRef.current.find((pm) => String(pm.id) === pay.payment_mode_id);
      if (mode?.requires_reference && !pay.reference?.trim()) {
        setLineErr(`الدفعة ${i + 1}: المرجع إلزامي لـ "${mode.name}"`);
        setErrors(errs); return false;
      }
      const autoTreasury = mode?.treasury_account_id ?? null;
      if (!autoTreasury && !pay.treasury_account_id) {
        setLineErr(`الدفعة ${i + 1}: يجب اختيار حساب خزينة`);
        setErrors(errs); return false;
      }
    }

    setLineErr('');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form, needsParty, isPurchase, isLinesReadOnly, payments]);

  // ── buildPayload ──────────────────────────────────────────────────────────

  const buildPayload = useCallback((): Record<string, unknown> => {
    const f = formRef.current!;

    const validPayments = payments.filter(
      (p) => p.payment_mode_id && parseFloat(p.amount) > 0,
    );

    const paymentsPayload = validPayments.map((p) => {
      const mode = paymentModsRef.current.find((pm) => String(pm.id) === p.payment_mode_id);
      const treasuryId = mode?.treasury_account_id
        ? mode.treasury_account_id
        : (p.treasury_account_id ? parseInt(String(p.treasury_account_id)) : null);
      return {
        ...(p.id ? { id: p.id } : {}),
        // translate internal _clientRef → API field client_ref at the network boundary
        ...(!p.id && p._clientRef ? { client_ref: p._clientRef } : {}),
        ...(p.client_ref ? { client_ref: p.client_ref } : {}),
        payment_mode_id:     parseInt(p.payment_mode_id),
        amount:              parseFloat(p.amount),
        reference:           p.reference?.trim() || null,
        notes:               p.notes?.trim() || null,
        payment_date:        p.payment_date,
        treasury_account_id: treasuryId,
        ...(p.check_number   ? { check_number: p.check_number } : {}),
        ...(p.check_bank     ? { check_bank: p.check_bank } : {}),
        ...(p.check_due_date ? { check_due_date: p.check_due_date } : {}),
      };
    });

    const linesPayload = f.lines.map((line) => {
      const calc = calcLineTotal(line);

      // تحويل الكمية للوحدات الأساسية
      const effectiveQty = calc.baseQty;

      // discount_percentage: نسبة الخصم الفعلية
      const discountPercentage = Math.round(calc.discPct * 10_000) / 10_000;

      // discount_amount للباكاند = خصم الوحدة الأساسية الواحدة
      const discountAmount = calc.unitDiscount;

      return {
        ...(line.id ? { id: line.id } : {}),
        product_id:          parseInt(line.product_id),
        description:         line.description || null,
        quantity:            effectiveQty,           // وحدات أساسية
        unit_price_ht:       line.unit_price_ht,     // سعر الوحدة الأساسية
        tva_rate:            line.tva_rate,
        discount_percentage: discountPercentage,
        discount_amount:     discountAmount,          // خصم الوحدة الواحدة
        ...(line.packaging_id ? { packaging_id: parseInt(line.packaging_id) } : {}),
        ...(line.stock_lot_id ? { stock_lot_id: parseInt(line.stock_lot_id) } : {}),
        ...(isPurchase && line.lot_number_new ? { lot_number: line.lot_number_new } : {}),
        ...(line.warehouse_id ? { warehouse_id: parseInt(line.warehouse_id) } : {}),
        notes: line.line_note || null,
      };
    });

    const base: Record<string, unknown> = {
      document_type_id: documentType?.id,
      party_id:         needsParty && f.party_id ? parseInt(f.party_id) : null,
      warehouse_id:     parseInt(f.warehouse_id),
      fiscal_year_id:   parseInt(f.fiscal_year_id),
      currency_id:      parseInt(f.currency_id),
      exchange_rate:    parseFloat(f.exchange_rate) || 1,
      document_date:    f.document_date,
      due_date:         f.due_date         || null,
      delivery_date:    f.delivery_date    || null,
      notes:            f.notes            || null,
      internal_notes:   f.internal_notes   || null,
      shipping_info:    Object.keys(f.shipping_info).length > 0 ? f.shipping_info : null,
      payment_terms:    f.payment_terms.length > 0 ? f.payment_terms : null,
    };

    if (pmMode !== 'additive') {
      base.lines = linesPayload;
    }
    // Unified payment payload — always payments[], never new_payments.
    // syncPayments() on the backend handles UPSERT/DELETE by id presence.
    if (paymentsPayload.length > 0 || (isEdit && (existingDocument?.payments as unknown[] | undefined)?.length)) {
      base.payments = paymentsPayload;
    }

    return base;
  }, [documentType?.id, needsParty, isPurchase, pmMode, payments, isEdit, existingDocument]);

  // ── validateLineStockFn ───────────────────────────────────────────────────

  const validateLineStockFn = useCallback(
    (line: LineItem, product: Product) =>
      validateLineStock(line, product, isPurchase, stockDataRef.current),
    [isPurchase],
  );

  return {
    form, errors, lineErr, apiErr, setApiErr,
    set, handlePartyChange, handlePriceLevelChange, priceLevelId,
    addLine, addLineWithProduct, bulkAddLines, removeLine, duplicateLine, updateLine,
    paymentMode: pmMode,
    payments,
    addPayment, addPaymentWithValues, removePayment, updatePayment,
    partyBalance, isLoadingBalance,
    totals, validate, buildPayload,
    validateLineStock: validateLineStockFn,
    updateStockData: useCallback(
      (data: Record<number, number>) => { stockDataRef.current = data; }, [],
    ),
    docCode, isEdit, needsParty, affectsStock, stockDir,
    isReadOnly, isLinesReadOnly,
    lineWarnings,
    priceLevelSwitchMsg,
    clearPriceLevelSwitchMsg: () => setPriceLevelSwitchMsg(null),
  };
}

```

## FILE: resources/js/pages/documents/hooks/useDocumentLookups.ts
```
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';
import type { Product, Party, PaymentMode, TreasuryAccount } from '../types/document.types';

function extractList(data: unknown): unknown[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'object' && data !== null) {
    const d = (data as Record<string, unknown>).data;
    if (Array.isArray(d)) return d;
  }
  return [];
}

interface UseDocumentLookupsOptions {
  open:         boolean;
  isPurchase:   boolean;
  needsParty:   boolean;
  warehouseId?:  number | null;
  fiscalYearId?: number | null;
}

export function useDocumentLookups({
  open, isPurchase, needsParty, warehouseId, fiscalYearId,
}: UseDocumentLookupsOptions) {
  const slug = useActiveSlug();

  // ── Parties ───────────────────────────────────────────────────────────────
  const { data: partiesRaw = [] } = useQuery({
    queryKey:  [slug, 'modal-parties', isPurchase],
    queryFn:   () => apiGet<unknown>(
      isPurchase ? '/suppliers' : '/customers',
      { per_page: 1000, include: 'defaultPriceLevel' },
    ).then(extractList),
    enabled:   open && needsParty && !!slug,
    staleTime: 5 * 60_000,
  });
  const parties = partiesRaw as Party[];

  // ── Products ──────────────────────────────────────────────────────────────
  const { data: productsRaw = [], isLoading: isLoadingProducts } = useQuery({
    queryKey:  [slug, 'modal-products-v3'],
    queryFn:   () => apiGet<unknown>('/products', {
      per_page: 2000,
      include:  'unit,tva,packagings,prices,prices.priceLevel,quantityDiscounts,lots',
      active:   1,
    }).then(extractList),
    enabled:   open && !!slug,
    staleTime: 3 * 60_000,
  });
  const products = productsRaw as Product[];

  // ── Warehouses ────────────────────────────────────────────────────────────
  const { data: warehousesRaw = [] } = useQuery({
    queryKey:  [slug, 'modal-warehouses'],
    queryFn:   () => apiGet<unknown>('/warehouses', { per_page: 100 }).then(extractList),
    enabled:   open && !!slug,
    staleTime: 10 * 60_000,
  });
  const warehouses = warehousesRaw as Record<string, unknown>[];

  // ── Currencies ────────────────────────────────────────────────────────────
  const { data: currenciesRaw = [] } = useQuery({
    queryKey:  [slug, 'modal-currencies'],
    queryFn:   () => apiGet<unknown>('/currencies', { per_page: 50 }).then(extractList),
    enabled:   open && !!slug,
    staleTime: 30 * 60_000,
  });
  const currencies = currenciesRaw as Record<string, unknown>[];

  // ── Fiscal Years ──────────────────────────────────────────────────────────
  const { data: fiscalYearsRaw = [] } = useQuery({
    queryKey:  [slug, 'modal-fiscal-years'],
    queryFn:   () => apiGet<unknown>('/fiscal-years', {
      per_page: 20, 'filter[is_closed]': 0,
    }).then(extractList),
    enabled:   open && !!slug,
    staleTime: 5 * 60_000,
  });
  const fiscalYears = fiscalYearsRaw as Record<string, unknown>[];

  // ── Payment Modes ─────────────────────────────────────────────────────────
  const { data: paymentModesRaw = [] } = useQuery({
    queryKey:  [slug, 'modal-payment-modes'],
    queryFn:   () => apiGet<unknown>('/payment-modes', { per_page: 50 }).then(extractList),
    enabled:   open && !!slug,
    staleTime: 30 * 60_000,
  });
  const paymentModes = paymentModesRaw as PaymentMode[];

  // ── Price Levels ──────────────────────────────────────────────────────────
  const { data: priceLevelsRaw = [] } = useQuery({
    queryKey:  [slug, 'modal-price-levels'],
    queryFn:   () => apiGet<unknown>('/price-levels', { per_page: 100 }).then(extractList),
    enabled:   open && !isPurchase && !!slug,
    staleTime: 30 * 60_000,
  });
  const priceLevels = priceLevelsRaw as Record<string, unknown>[];

  // ── Treasury Accounts ─────────────────────────────────────────────────────
  const { data: treasuryAccountsRaw = [] } = useQuery({
    queryKey:  [slug, 'modal-treasury-accounts-v2'],
    queryFn:   () => apiGet<unknown>('/treasury-accounts', { per_page: 100 }).then(extractList),
    enabled:   open && !!slug,
    staleTime: 10 * 60_000,
  });
  const treasuryAccounts = (treasuryAccountsRaw as TreasuryAccount[])
    .filter(ta => ta.is_active);

  // ── Real-time Stock ───────────────────────────────────────────────────────
  const { data: stockData = {}, refetch: refetchStock } = useQuery<Record<number, number>>({
    queryKey: [slug, 'warehouse-stock', warehouseId, fiscalYearId],
    queryFn:  () =>
      apiGet<unknown[]>('/inventory/stock-at', {
        warehouse_id:   warehouseId,
        fiscal_year_id: fiscalYearId,
      }).then((rows) =>
        Object.fromEntries(
          (rows as Array<{ id: number; current_stock: number }>)
            .map((r) => [r.id, r.current_stock ?? 0]),
        ),
      ),
    enabled:   !!slug && !!warehouseId,
    staleTime: 2 * 60_000,
  });

  // ── Derived Defaults ──────────────────────────────────────────────────────
  const defaultWarehouseId = useMemo(() => {
    const dw = warehouses.find(w => w.is_default) ?? warehouses[0];
    return dw ? String(dw.id) : '';
  }, [warehouses]);

  const baseCurrencyId = useMemo(() => {
    const base = currencies.find(c => c.is_base_currency) ?? currencies[0];
    return base ? String(base.id) : '';
  }, [currencies]);

  const defaultTvaRate = useMemo(() => {
    const p = products.find(pr => pr.tva?.is_default);
    return p?.tva?.rate ?? 19;
  }, [products]);

  return {
    parties, products, warehouses, currencies, fiscalYears,
    paymentModes, priceLevels, treasuryAccounts,
    stockData, refetchStock,
    isLoadingProducts,
    defaultWarehouseId, baseCurrencyId, defaultTvaRate,
  };
}

```

## FILE: resources/js/pages/documents/hooks/useProductSuggestions.ts
```
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';

export interface ProductSuggestion {
  id:              number;
  name:            string;
  ref:             string | null;
  order_count:     number;
  total_qty:       number;
  suggested_price: number | null;
  suggested_tva:   number | null;
}

export function useProductSuggestions(
  partyId:    number | null,
  isPurchase: boolean,
  enabled:    boolean,
) {
  const slug = useActiveSlug();
  return useQuery<ProductSuggestion[]>({
    queryKey: [slug, 'product-suggestions', partyId, isPurchase],
    queryFn: async () => {
      if (!partyId) return [];
      return apiGet<ProductSuggestion[]>(`/parties/${partyId}/product-suggestions`, {
        is_purchase: isPurchase,
        limit: 5,
      });
    },
    enabled: !!slug && !!partyId && enabled,
    staleTime: 120_000,
    gcTime: 60_000,
  });
}

```

## FILE: resources/js/pages/documents/QuickSaleModal.tsx
```
// resources/js/pages/documents/QuickSaleModal.tsx
// QuickSaleModal — مودل البيع السريع مع التحسينات:
// - تحميل حساب الخزينة بشكل صحيح
// - زر "تعبئة المبلغ المستحق"
// - التنقل بالـ Enter: منتج ← كمية ← سطر جديد
// - اختصار F8 للحفظ
// - الدفع فوري ونقدي بشكل افتراضي

import React, {
  useState, useEffect, useMemo, useCallback, useRef,
} from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api/core/client';
import { tenantKeys } from '@/lib/api/core/queryKeys';
import { settingsApi } from '@/lib/api/endpoints/settings';
import { useActiveSlug } from '@/lib/store/appStore';
import { useFiscalYear } from '@/context/FiscalYearContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: number;
  name: string;
  ref?: string | null;
  default_selling_price_ht?: number | null;
  tva?: { id: number; rate: number } | null;
  unit?: { id: number; symbol: string } | null;
  manages_stock?: boolean;
  current_stock?: number | null;
}

interface PaymentMode {
  id: number;
  name: string;
  code: string;
}

interface TreasuryAccount {
  id: number;
  name: string;
  code: string;
  is_default: boolean;
}

interface QuickLine {
  product_id: string;
  quantity: number;
  price: number;
  tva_rate: number;
  _product?: Product;
}

interface SuccessState {
  document_number: string;
  net_to_pay: number;
  paid: number;
  remaining: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().split('T')[0];
}

function defaultDocDate(selectedYear?: { start_date?: string; end_date?: string }): string {
  const d = today();
  if (selectedYear?.start_date && selectedYear?.end_date) {
    const s = selectedYear.start_date.substring(0, 10);
    const e = selectedYear.end_date.substring(0, 10);
    if (d >= s && d <= e) return d;
    return e;
  }
  return d;
}

function fmtDZD(n: number | string | null | undefined): string {
  const v = parseFloat(String(n ?? 0));
  if (isNaN(v)) return '—';
  return new Intl.NumberFormat('fr-DZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

function extractList(d: unknown): unknown[] {
  if (!d) return [];
  if (Array.isArray(d)) return d;
  if (typeof d === 'object' && d !== null) {
    const arr = (d as Record<string, unknown>).data;
    if (Array.isArray(arr)) return arr;
  }
  return [];
}

// ─── SearchSelect ────────────────────────────────────────────────────────────

interface SearchSelectProps<T extends Record<string, unknown>> {
  items: T[];
  value: string;
  onChange: (id: string, item?: T) => void;
  getLabel: (item: T) => string;
  getSub?: (item: T) => string | null;
  placeholder: string;
  disabled?: boolean;
  error?: boolean;
  inputRef?: React.RefObject<HTMLInputElement>;
  onEnter?: () => void;
}

function SearchSelect<T extends Record<string, unknown>>({
  items,
  value,
  onChange,
  getLabel,
  getSub,
  placeholder,
  disabled,
  error,
  inputRef,
  onEnter,
}: SearchSelectProps<T>) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const internalInputRef = useRef<HTMLInputElement>(null);
  const finalInputRef = inputRef || internalInputRef;

  const selected = items.find(i => String(i.id) === value);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(i => getLabel(i).toLowerCase().includes(q));
  }, [items, query, getLabel]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (item: T) => {
    onChange(String(item.id), item);
    setOpen(false);
    setQuery('');
    // بعد اختيار المنتج، ننتقل إلى حقل الكمية (يتم التعامل معه من خلال المكون الأب)
    setTimeout(() => {
      if (finalInputRef.current) {
        const quantityInput = finalInputRef.current.closest('tr')?.querySelector('input[type="number"]') as HTMLInputElement;
        quantityInput?.focus();
      }
    }, 50);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filtered.length > 0 && query.trim()) {
      e.preventDefault();
      handleSelect(filtered[0]);
    } else if (e.key === 'Enter' && onEnter) {
      e.preventDefault();
      onEnter();
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div
        onClick={() => !disabled && setOpen(o => !o)}
        style={{
          ...inpStyle(error),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          userSelect: 'none',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span
          style={{
            color: selected ? 'var(--t1)' : 'var(--t4)',
            fontSize: 13,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {selected ? getLabel(selected) : placeholder}
        </span>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {selected && (
            <button
              onClick={handleClear}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--t4)',
                padding: '0 2px',
                fontSize: 12,
              }}
            >
              <i className="ti ti-x" />
            </button>
          )}
          <i
            className={`ti ti-chevron-${open ? 'up' : 'down'}`}
            style={{ color: 'var(--t4)', fontSize: 12 }}
          />
        </div>
      </div>

      {open && !disabled && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            left: 0,
            zIndex: 900,
            background: 'var(--bg1)',
            border: '1px solid var(--b3)',
            borderRadius: 'var(--r2)',
            boxShadow: 'var(--shadow2)',
            marginTop: 2,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--b1)' }}>
            <input
              ref={finalInputRef}
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="بحث..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '5px 8px',
                borderRadius: 'var(--r1)',
                border: '1px solid var(--b3)',
                background: 'var(--bg2)',
                color: 'var(--t1)',
                fontSize: 12,
                outline: 'none',
                fontFamily: 'Tajawal, sans-serif',
              }}
            />
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div
                style={{
                  padding: '10px 12px',
                  color: 'var(--t4)',
                  fontSize: 12,
                  textAlign: 'center',
                }}
              >
                لا توجد نتائج
              </div>
            ) : (
              filtered.slice(0, 60).map(item => {
                const sub = getSub?.(item);
                return (
                  <div
                    key={String(item.id)}
                    onClick={() => handleSelect(item)}
                    style={{
                      padding: '7px 12px',
                      cursor: 'pointer',
                      background: String(item.id) === value ? 'var(--emb)' : 'transparent',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid var(--b1)',
                    }}
                    onMouseEnter={e => {
                      if (String(item.id) !== value)
                        (e.currentTarget as HTMLDivElement).style.background = 'var(--bg2)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.background =
                        String(item.id) === value ? 'var(--emb)' : 'transparent';
                    }}
                  >
                    <span style={{ fontSize: 13, color: 'var(--t1)' }}>{getLabel(item)}</span>
                    {sub && (
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--t4)',
                          flexShrink: 0,
                          marginRight: 8,
                        }}
                      >
                        {sub}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface QuickSaleModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (doc: SuccessState) => void;
}

export default function QuickSaleModal({ open, onClose, onSaved }: QuickSaleModalProps) {
  // ========== HOOKS (all at top) ==========
  const slug = useActiveSlug();
  const qc = useQueryClient();
  const { selectedYear } = (useFiscalYear() as { selectedYear?: { id: number; name: string } }) ?? {};
  const successTimer = useRef<ReturnType<typeof setTimeout>>();
  const productInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const quantityInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Queries
  const { data: rawProducts = [], isLoading: loadingProds } = useQuery({
    queryKey: [slug, 'quick-sale-products'],
    queryFn: () =>
      apiGet<unknown>('/products', { per_page: 500, include: 'unit,tva' }).then(extractList),
    enabled: open && !!slug,
    staleTime: 5 * 60_000,
  });

  const { data: rawParties = [] } = useQuery({
    queryKey: [slug, 'quick-sale-customers'],
    queryFn: () => apiGet<unknown>('/customers', { per_page: 500 }).then(extractList),
    enabled: open && !!slug,
    staleTime: 5 * 60_000,
  });

  const { data: rawPaymentModes = [] } = useQuery({
    queryKey: [slug, 'quick-sale-payment-modes'],
    queryFn: () => apiGet<unknown>('/payment-modes', { per_page: 100 }).then(extractList),
    enabled: open && !!slug,
    staleTime: 10 * 60_000,
  });

  const { data: rawTreasuryAccounts = [] } = useQuery({
    queryKey: [slug, 'quick-sale-treasury'],
    queryFn: () => apiGet<unknown>('/treasury-accounts', { per_page: 100 }).then(extractList),
    enabled: open && !!slug,
    staleTime: 10 * 60_000,
  });

  const { data: settingsDict } = useQuery({
    queryKey: [slug, 'settings-dict'],
    queryFn: () => settingsApi.list(),
    enabled: open && !!slug,
    staleTime: 10 * 60_000,
  });

  const { data: rawWarehouses = [] } = useQuery({
    queryKey: [slug, 'quick-sale-warehouses'],
    queryFn: () => apiGet<unknown>('/warehouses', { per_page: 100 }).then(extractList),
    enabled: open && !!slug,
    staleTime: 10 * 60_000,
  });

  const products = rawProducts as Product[];
  const parties = rawParties as Record<string, unknown>[];
  const paymentModes = rawPaymentModes as PaymentMode[];
  const treasuryAccounts = rawTreasuryAccounts as TreasuryAccount[];
  const warehouses = rawWarehouses as Record<string, unknown>[];

  // Defaults
  const defaultWarehouseId = useMemo(() => {
    const dw = warehouses.find(w => w.is_default);
    return dw ? String(dw.id) : warehouses[0] ? String(warehouses[0].id) : '';
  }, [warehouses]);

  // الدائم: طريقة الدفع نقدي (cash) وحساب الخزينة الأول
  const defaultPaymentModeId = useMemo(() => {
    const fromSettings = settingsDict?.default_payment_mode_id?.value;
    if (fromSettings) {
      const found = paymentModes.find(pm => pm.id === Number(fromSettings));
      if (found) return String(found.id);
    }
    const cash = paymentModes.find(
      pm => pm.name.toLowerCase().includes('نقد') || pm.code?.toLowerCase() === 'cash'
    );
    return cash ? String(cash.id) : paymentModes[0] ? String(paymentModes[0].id) : '';
  }, [paymentModes, settingsDict]);

  const defaultTreasuryId = useMemo(() => {
    const fromSettings = settingsDict?.default_treasury_account_id?.value;
    if (fromSettings) {
      const found = treasuryAccounts.find(t => t.id === Number(fromSettings));
      if (found) return String(found.id);
    }
    const def = treasuryAccounts.find(t => t.is_default);
    return def ? String(def.id) : treasuryAccounts[0] ? String(treasuryAccounts[0].id) : '';
  }, [treasuryAccounts, settingsDict]);

  // State
  const [partyId, setPartyId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [docDate, setDocDate] = useState(defaultDocDate(selectedYear));
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<QuickLine[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiErr, setApiErr] = useState('');
  const [success, setSuccess] = useState<SuccessState | null>(null);

  // الدفع ثابت: فوري ونقدي
  const payment = {
    enabled: true,
    payment_mode_id: defaultPaymentModeId,
    treasury_account_id: defaultTreasuryId,
    amount: 0, // 0 يعني كامل المبلغ
    reference: '',
    payment_date: defaultDocDate(selectedYear),
  };

  // Effects for reset
  useEffect(() => {
    if (open) {
      setPartyId('');
      setDocDate(defaultDocDate(selectedYear));
      setNotes('');
      setLines([]);
      setErrors({});
      setApiErr('');
      setSuccess(null);
      setWarehouseId(defaultWarehouseId);
    }
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, [open, defaultWarehouseId, selectedYear]);

  // Line helpers
  const addLine = useCallback(() => {
    setLines(prev => [...prev, { product_id: '', quantity: 1, price: 0, tva_rate: 19 }]);
    // بعد إضافة السطر، نركز على حقل البحث في السطر الجديد
    setTimeout(() => {
      const lastIndex = lines.length;
      const input = productInputRefs.current[lastIndex];
      input?.focus();
    }, 50);
  }, [lines.length]);

  const removeLine = useCallback((idx: number) => {
    setLines(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const updateLine = useCallback(
    (idx: number, field: keyof QuickLine, value: unknown) => {
      setLines(prev => {
        const next = [...prev];
        const L = { ...next[idx] };
        if (field === 'product_id') {
          L.product_id = String(value);
          const p = products.find(pr => String(pr.id) === String(value));
          if (p) {
            L._product = p;
            L.price = parseFloat(String(p.default_selling_price_ht ?? 0)) || 0;
            L.tva_rate = p.tva?.rate ?? 19;
          } else {
            L._product = undefined;
            L.price = 0;
          }
        } else if (field === 'quantity') {
          L.quantity = parseFloat(String(value)) || 1;
        } else if (field === 'price') {
          L.price = parseFloat(String(value)) || 0;
        } else if (field === 'tva_rate') {
          L.tva_rate = parseFloat(String(value)) || 0;
        }
        next[idx] = L;
        return next;
      });
    },
    [products]
  );

  // Totals
  const totals = useMemo(() => {
    let ht = 0,
      tva = 0;
    lines.forEach(l => {
      const lineHt = l.price * l.quantity;
      const lineTva = lineHt * (l.tva_rate / 100);
      ht += lineHt;
      tva += lineTva;
    });
    const ttc = ht + tva;
    const stamp = ttc >= 30_000 ? Math.min(Math.ceil(ttc * 0.01), 2_500) : 0;
    const netPay = ttc + stamp;
    return { ht, tva, ttc, stamp, netPay };
  }, [lines]);

  const payAmount = useMemo(() => {
    // إذا كان المبلغ 0 أو أكبر من المستحق، نستخدم المستحق
    const amt = payment.amount;
    if (amt <= 0 || amt >= totals.netPay) return totals.netPay;
    return amt;
  }, [payment.amount, totals.netPay]);

  // Validation
  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!warehouseId) errs.warehouse_id = 'المستودع إلزامي';
    if (lines.length === 0) errs.lines = 'أضف سطراً واحداً على الأقل';

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!l.product_id) {
        errs.lines = `السطر ${i + 1}: المنتج إلزامي`;
        break;
      }
      if (l.quantity <= 0) {
        errs.lines = `السطر ${i + 1}: الكمية يجب أن تكون > 0`;
        break;
      }
      const prod = products.find(p => String(p.id) === l.product_id);
      if (prod?.manages_stock && prod.current_stock != null && l.quantity > prod.current_stock) {
        errs.lines = `السطر ${i + 1}: الكمية (${l.quantity}) تتجاوز المخزون المتاح (${prod.current_stock})`;
        break;
      }
    }

    // التحقق من وجود حساب خزينة (تم تعبئته افتراضياً)
    if (!payment.treasury_account_id) {
      errs.treasury = 'حساب الخزينة إلزامي';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [warehouseId, lines, products, payment.treasury_account_id]);

  // Save mutation
  const saveMut = useMutation({
    mutationFn: async () => {
      const payAmount = totals.netPay;

      const docPayload = {
        document_type_code: 'FV',
        party_id: partyId ? parseInt(partyId) : null,
        warehouse_id: parseInt(warehouseId),
        fiscal_year_id: selectedYear?.id ?? null,
        document_date: docDate,
        notes: notes || null,
        lines: lines.map(l => ({
          product_id: parseInt(l.product_id),
          quantity: l.quantity,
          unit_price_ht: l.price,
          tva_rate: l.tva_rate,
          discount_percentage: 0,
        })),
        payments: payAmount > 0 ? [{
          payment_mode_id: parseInt(payment.payment_mode_id),
          treasury_account_id: parseInt(payment.treasury_account_id),
          amount: payAmount,
          payment_date: payment.payment_date || docDate,
          reference: payment.reference || null,
          client_ref: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        }] : [],
      };
      const docRes = await apiPost<Record<string, unknown>>('/documents', docPayload);
      const docNum = String(
        (docRes as any).document_number ?? (docRes as any).data?.document_number ?? '—'
      );

      return {
        document_number: docNum,
        net_to_pay: totals.netPay,
        paid: payAmount,
        remaining: Math.max(0, totals.netPay - payAmount),
      };
    },
    onSuccess: state => {
      if (slug) {
        qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
        qc.invalidateQueries({ queryKey: tenantKeys.inventory.all(slug) });
        qc.invalidateQueries({ queryKey: [slug, 'payments'] });
      }
      setSuccess(state);
      successTimer.current = setTimeout(() => onSaved(state), 2_500);
    },
    onError: (e: unknown) => {
      const err = e as Record<string, unknown>;
      const errs = err?.errors as Record<string, string[]> | undefined;
      setApiErr(
        errs ? Object.values(errs).flat().join(' | ') : String(err?.message ?? 'فشل الحفظ')
      );
    },
  });

  // Getters for SearchSelect
  const getProductLabel = useCallback(
    (p: Product) => `${p.name}${p.ref ? ` (${p.ref})` : ''}`,
    []
  );
  const getProductSub = useCallback((p: Product): string | null => {
    if (!p.manages_stock || p.current_stock == null) return null;
    const color = p.current_stock <= 0 ? '🔴' : p.current_stock <= 5 ? '🟡' : '🟢';
    return `${color} ${p.current_stock} ${p.unit?.symbol ?? ''}`;
  }, []);
  const getPartyLabel = useCallback((p: Record<string, unknown>) => String(p.name), []);

  const handleSave = useCallback(() => {
    setApiErr('');
    if (validate()) saveMut.mutate();
  }, [validate, saveMut]);

  // معالجة Enter في حقل الكمية: إضافة سطر جديد
  const handleQuantityEnter = useCallback(
    (idx: number) => {
      if (idx === lines.length - 1) {
        addLine();
      } else {
        // إذا لم يكن آخر سطر، ننتقل إلى السطر التالي
        const nextInput = productInputRefs.current[idx + 1];
        nextInput?.focus();
      }
    },
    [lines.length, addLine]
  );

  // تعبئة المبلغ المستحق تلقائياً
  const fillFullAmount = useCallback(() => {
    // لا نحتاج state لأن payment.amount ثابت، لكننا نستطيع إعادة حساب payAmount
    // لاحظ أننا لا نستخدم state للدفع، المبلغ يظل 0 وهذا يعني كامل المبلغ.
    // لكن إذا أردنا تغيير قيمة الدفع نضيف useState للدفع. لكن حسب الطلب "اجعل الدفع دائما فوري ونقدا" ربما يعني إخفاء الخيارات. سنكتفي بأن المبلغ المدفوع = كامل المستحق.
    // ولكن لتطبيق زر "تعبئة المبلغ"، سنضيف useState محلي للدفع.
    setPaymentLocal(prev => ({ ...prev, amount: totals.netPay }));
  }, [totals.netPay]);

  // لإضافة حالة محلية للدفع (لأن payment الآن ثابت، لكننا نحتاج لتعديل amount)
  const [paymentLocal, setPaymentLocal] = useState({
    enabled: true,
    payment_mode_id: defaultPaymentModeId,
    treasury_account_id: defaultTreasuryId,
    amount: 0,
    reference: '',
    payment_date: defaultDocDate(selectedYear),
  });

  // تحديث paymentLocal عند تحميل البيانات
  useEffect(() => {
    if (defaultPaymentModeId && defaultTreasuryId) {
      setPaymentLocal(prev => ({
        ...prev,
        payment_mode_id: defaultPaymentModeId,
        treasury_account_id: defaultTreasuryId,
      }));
    }
  }, [defaultPaymentModeId, defaultTreasuryId]);

  // إعادة حساب payAmount باستخدام paymentLocal
  const finalPayAmount = useMemo(() => {
    const amt = paymentLocal.amount;
    if (amt <= 0 || amt >= totals.netPay) return totals.netPay;
    return amt;
  }, [paymentLocal.amount, totals.netPay]);

  // تعديل دوال الحفظ لاستخدام paymentLocal
  const finalSaveMut = useMutation({
    mutationFn: async () => {
      const docPayload = {
        document_type_code: 'FV',
        party_id: partyId ? parseInt(partyId) : null,
        warehouse_id: parseInt(warehouseId),
        fiscal_year_id: selectedYear?.id ?? null,
        document_date: docDate,
        notes: notes || null,
        lines: lines.map(l => ({
          product_id: parseInt(l.product_id),
          quantity: l.quantity,
          unit_price_ht: l.price,
          tva_rate: l.tva_rate,
          discount_percentage: 0,
        })),
        payments: finalPayAmount > 0 ? [{
          payment_mode_id: parseInt(paymentLocal.payment_mode_id),
          treasury_account_id: parseInt(paymentLocal.treasury_account_id),
          amount: finalPayAmount,
          payment_date: paymentLocal.payment_date || docDate,
          reference: paymentLocal.reference || null,
          client_ref: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        }] : [],
      };
      const docRes = await apiPost<Record<string, unknown>>('/documents', docPayload);
      const docNum = String(
        (docRes as any).document_number ?? (docRes as any).data?.document_number ?? '—'
      );

      return {
        document_number: docNum,
        net_to_pay: totals.netPay,
        paid: finalPayAmount,
        remaining: Math.max(0, totals.netPay - finalPayAmount),
      };
    },
    onSuccess: state => {
      if (slug) {
        qc.invalidateQueries({ queryKey: tenantKeys.documents.all(slug) });
        qc.invalidateQueries({ queryKey: tenantKeys.inventory.all(slug) });
        qc.invalidateQueries({ queryKey: [slug, 'payments'] });
      }
      setSuccess(state);
      successTimer.current = setTimeout(() => onSaved(state), 2_500);
    },
    onError: (e: unknown) => {
      const err = e as Record<string, unknown>;
      const errs = err?.errors as Record<string, string[]> | undefined;
      setApiErr(
        errs ? Object.values(errs).flat().join(' | ') : String(err?.message ?? 'فشل الحفظ')
      );
    },
  });

  const handleFinalSave = useCallback(() => {
    setApiErr('');
    if (validate()) finalSaveMut.mutate();
  }, [validate, finalSaveMut]);

  // اختصار F8
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F8' && open && !finalSaveMut.isPending && !success) {
        e.preventDefault();
        handleFinalSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, finalSaveMut.isPending, success, handleFinalSave]);

  const isPending = finalSaveMut.isPending;

  // ========== JSX ==========
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 600,
        background: open ? 'rgba(0,0,0,.6)' : 'transparent',
        backdropFilter: open ? 'blur(5px)' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        pointerEvents: open ? 'auto' : 'none' as any,
        opacity: open ? 1 : 0,
        transition: 'opacity .25s, background .25s',
      }}
      onClick={!isPending && open ? onClose : undefined}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 720,
          background: 'var(--bg1)',
          borderRadius: 'var(--r3)',
          boxShadow: '0 32px 80px rgba(0,0,0,.35)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '95vh',
          overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--b1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background:
              'linear-gradient(135deg, var(--em) 0%, color-mix(in srgb, var(--em) 70%, var(--blue)) 100%)',
            borderRadius: 'var(--r3) var(--r3) 0 0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 'var(--r2)',
                background: 'rgba(255,255,255,.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <i className="ti ti-bolt" style={{ fontSize: 18, color: 'white' }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'white' }}>بيع سريع</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', marginTop: 1 }}>
                فاتورة بيع (FV) — رقم الوثيقة يُولَّد تلقائياً — <kbd>F8</kbd> للحفظ
              </div>
            </div>
          </div>
          <button
            onClick={!isPending ? onClose : undefined}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,.3)',
              background: 'rgba(255,255,255,.15)',
              color: 'white',
              cursor: isPending ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <i className="ti ti-x" style={{ fontSize: 14 }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Success */}
          {success && (
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 'var(--r2)',
                background: 'var(--greenb)',
                border: '1px solid var(--green)',
                color: 'var(--green)',
              }}
            >
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <i className="ti ti-check-circle" />
                تم إنشاء الفاتورة {success.document_number}
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12 }}>
                <span>
                  المستحق: <b>{fmtDZD(success.net_to_pay)} دج</b>
                </span>
                {success.paid > 0 && (
                  <span>
                    المدفوع: <b>{fmtDZD(success.paid)} دج</b>
                  </span>
                )}
                {success.remaining > 0 && (
                  <span>
                    المتبقي: <b style={{ color: 'var(--red)' }}>{fmtDZD(success.remaining)} دج</b>
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, marginTop: 6, opacity: 0.7 }}>سيُغلق تلقائياً...</div>
            </div>
          )}

          {/* API Error */}
          {apiErr && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--r2)',
                background: 'var(--redb)',
                border: '1px solid var(--red)',
                color: 'var(--red)',
                fontSize: 13,
                display: 'flex',
                gap: 8,
              }}
            >
              <i className="ti ti-alert-circle" style={{ marginTop: 1 }} />
              <span>{apiErr}</span>
            </div>
          )}

          {/* Row 1: Customer + Date + Warehouse */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <div style={lblStyle}>الزبون</div>
              <SearchSelect
                items={parties as any}
                value={partyId}
                onChange={setPartyId}
                getLabel={getPartyLabel as any}
                placeholder="— بيع نقدي —"
                disabled={isPending}
              />
            </div>
            <div>
              <div style={lblStyle}>التاريخ</div>
              <input
                type="date"
                value={docDate}
                onChange={e => setDocDate(e.target.value)}
                style={inpStyle()}
                disabled={isPending}
              />
            </div>
            <div>
              <div style={lblStyle}>
                المستودع <span style={{ color: 'var(--red)' }}>*</span>
              </div>
              <select
                value={warehouseId}
                onChange={e => setWarehouseId(e.target.value)}
                style={inpStyle(!!errors.warehouse_id)}
                disabled={isPending}
              >
                <option value="">— اختر —</option>
                {warehouses.map(w => (
                  <option key={String(w.id)} value={String(w.id)}>
                    {String(w.name)}
                    {w.is_default ? ' ★' : ''}
                  </option>
                ))}
              </select>
              {errors.warehouse_id && <ErrMsg msg={errors.warehouse_id} />}
            </div>
          </div>

          {/* Lines */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--t3)',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                المنتجات
                {lines.length > 0 && (
                  <span
                    style={{
                      marginRight: 6,
                      padding: '1px 7px',
                      borderRadius: 99,
                      background: 'var(--em)',
                      color: 'white',
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {lines.length}
                  </span>
                )}
              </div>
              {errors.lines && <ErrMsg msg={errors.lines} />}
            </div>

            {loadingProds ? (
              <div style={{ textAlign: 'center', padding: 16, color: 'var(--t4)', fontSize: 13 }}>
                <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> جاري
                تحميل المنتجات...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {lines.length > 0 && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 70px 100px 60px 90px 32px',
                      gap: 6,
                      padding: '4px 10px',
                    }}
                  >
                    {['المنتج', 'الكمية', 'سعر HT', 'TVA%', 'TTC', ''].map((h, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: 'var(--t4)',
                          textTransform: 'uppercase',
                          letterSpacing: 0.3,
                          textAlign: 'center',
                        }}
                      >
                        {h}
                      </div>
                    ))}
                  </div>
                )}

                {lines.map((line, idx) => {
                  const { ttc } = calcLine(line);
                  const prod = products.find(p => String(p.id) === line.product_id);
                  const overStock =
                    prod?.manages_stock && prod.current_stock != null && line.quantity > prod.current_stock;

                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 70px 100px 60px 90px 32px',
                        gap: 6,
                        alignItems: 'center',
                        padding: '8px 10px',
                        background: overStock
                          ? 'color-mix(in srgb, var(--red) 5%, var(--bg2))'
                          : 'var(--bg2)',
                        borderRadius: 'var(--r2)',
                        border: `1px solid ${overStock ? 'var(--redbo)' : 'var(--b1)'}`,
                      }}
                    >
                      <SearchSelect
                        items={products as any}
                        value={line.product_id}
                        onChange={(id, item) => updateLine(idx, 'product_id', id)}
                        getLabel={getProductLabel as any}
                        getSub={getProductSub as any}
                        placeholder="— اختر منتجاً —"
                        disabled={isPending}
                        error={!line.product_id}
                        inputRef={el => (productInputRefs.current[idx] = el)}
                        onEnter={() => {
                          // عند الضغط Enter في حقل البحث بعد اختيار منتج (أو بدون اختيار)
                          // ننتقل إلى حقل الكمية
                          const quantityInput = quantityInputRefs.current[idx];
                          quantityInput?.focus();
                        }}
                      />
                      <input
                        ref={el => (quantityInputRefs.current[idx] = el)}
                        type="number"
                        min="0.001"
                        step="1"
                        value={line.quantity}
                        onChange={e => updateLine(idx, 'quantity', e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleQuantityEnter(idx);
                          }
                        }}
                        style={{
                          ...cellStyle(),
                          border: `1px solid ${
                            overStock
                              ? 'var(--red)'
                              : line.quantity <= 0
                              ? 'var(--red)'
                              : 'var(--b3)'
                          }`,
                        }}
                        disabled={isPending}
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.price}
                        onChange={e => updateLine(idx, 'price', e.target.value)}
                        style={cellStyle()}
                        disabled={isPending}
                      />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={line.tva_rate}
                        onChange={e => updateLine(idx, 'tva_rate', e.target.value)}
                        style={cellStyle()}
                        disabled={isPending}
                      />
                      <div
                        style={{
                          textAlign: 'center',
                          fontSize: 12,
                          fontWeight: 700,
                          color: 'var(--em)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {fmtDZD(ttc)}
                      </div>
                      <button
                        onClick={() => removeLine(idx)}
                        disabled={isPending}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          border: '1px solid var(--b3)',
                          background: 'var(--bg1)',
                          color: 'var(--red)',
                          cursor: isPending ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <i className="ti ti-trash" style={{ fontSize: 12 }} />
                      </button>
                    </div>
                  );
                })}

                <button
                  onClick={addLine}
                  disabled={isPending}
                  style={{
                    padding: '8px',
                    borderRadius: 'var(--r2)',
                    border: '1px dashed var(--em)',
                    background: 'transparent',
                    color: 'var(--em)',
                    cursor: isPending ? 'not-allowed' : 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <i className="ti ti-plus" /> إضافة منتج
                </button>
              </div>
            )}
          </div>

          {/* Totals */}
          {lines.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div
                style={{
                  width: 280,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 5,
                  padding: '12px 14px',
                  borderRadius: 'var(--r2)',
                  background: 'var(--bg2)',
                  border: '1px solid var(--b1)',
                }}
              >
                <TotRow label="إجمالي HT" value={fmtDZD(totals.ht)} />
                <TotRow label="TVA" value={fmtDZD(totals.tva)} />
                {totals.stamp > 0 && (
                  <TotRow label="الطابع الجبائي" value={fmtDZD(totals.stamp)} color="var(--gold)" />
                )}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingTop: 8,
                    marginTop: 4,
                    borderTop: '2px solid var(--b2)',
                    fontSize: 15,
                    fontWeight: 800,
                  }}
                >
                  <span style={{ color: 'var(--t1)' }}>المستحق</span>
                  <span
                    style={{
                      color: 'var(--em)',
                      direction: 'ltr',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {fmtDZD(totals.netPay)} دج
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Payment section (friendly UI) */}
          <div
            style={{
              borderRadius: 'var(--r2)',
              border: '1px solid var(--b2)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '10px 14px',
                background: 'var(--greenb)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    background: 'var(--green)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <i className="ti ti-check" style={{ fontSize: 12, color: 'white' }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>
                  دفع فوري (نقدي)
                </span>
                {totals.netPay > 0 && (
                  <span
                    style={{
                      fontSize: 11,
                      padding: '1px 8px',
                      borderRadius: 99,
                      background: 'var(--green)',
                      color: 'white',
                      fontWeight: 700,
                    }}
                  >
                    {fmtDZD(finalPayAmount)} دج
                  </span>
                )}
              </div>
            </div>

            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={lblStyle}>
                    طريقة الدفع <span style={{ color: 'var(--red)' }}>*</span>
                  </div>
                  <select
                    value={paymentLocal.payment_mode_id}
                    onChange={e =>
                      setPaymentLocal(p => ({ ...p, payment_mode_id: e.target.value }))
                    }
                    style={inpStyle()}
                    disabled={isPending}
                  >
                    <option value="">— اختر —</option>
                    {paymentModes.map(pm => (
                      <option key={pm.id} value={String(pm.id)}>
                        {pm.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div style={lblStyle}>
                    حساب الخزينة <span style={{ color: 'var(--red)' }}>*</span>
                  </div>
                  <select
                    value={paymentLocal.treasury_account_id}
                    onChange={e =>
                      setPaymentLocal(p => ({ ...p, treasury_account_id: e.target.value }))
                    }
                    style={inpStyle(!!errors.treasury)}
                    disabled={isPending}
                  >
                    <option value="">— اختر —</option>
                    {treasuryAccounts.map(ta => (
                      <option key={ta.id} value={String(ta.id)}>
                        {ta.name}
                        {ta.is_default ? ' ★' : ''}
                      </option>
                    ))}
                  </select>
                  {errors.treasury && <ErrMsg msg={errors.treasury} />}
                </div>
                <div>
                  <div style={lblStyle}>
                    المبلغ المدفوع
                    <span style={{ fontSize: 10, color: 'var(--t4)', marginRight: 4 }}>
                      (0 = كامل المبلغ)
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={paymentLocal.amount || ''}
                      placeholder={`${fmtDZD(totals.netPay)} (كامل)`}
                      onChange={e =>
                        setPaymentLocal(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))
                      }
                      style={{ ...inpStyle(), flex: 1 }}
                      disabled={isPending}
                    />
                    <button
                      type="button"
                      onClick={fillFullAmount}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--r2)',
                        border: '1px solid var(--b3)',
                        background: 'var(--bg2)',
                        cursor: 'pointer',
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--em)',
                      }}
                    >
                      الكل
                    </button>
                  </div>
                </div>
                <div>
                  <div style={lblStyle}>تاريخ الدفع</div>
                  <input
                    type="date"
                    value={paymentLocal.payment_date}
                    onChange={e => setPaymentLocal(p => ({ ...p, payment_date: e.target.value }))}
                    style={inpStyle()}
                    disabled={isPending}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={lblStyle}>المرجع / رقم الشيك</div>
                  <input
                    type="text"
                    value={paymentLocal.reference}
                    placeholder="اختياري..."
                    onChange={e => setPaymentLocal(p => ({ ...p, reference: e.target.value }))}
                    style={inpStyle()}
                    disabled={isPending}
                  />
                </div>
              </div>

              {totals.netPay > 0 && (
                <div
                  style={{
                    display: 'flex',
                    gap: 12,
                    flexWrap: 'wrap',
                    padding: '8px 12px',
                    borderRadius: 'var(--r2)',
                    background: 'var(--bg2)',
                    fontSize: 12,
                  }}
                >
                  <span>
                    المستحق: <b>{fmtDZD(totals.netPay)} دج</b>
                  </span>
                  <span style={{ color: 'var(--green)' }}>
                    المدفوع: <b>{fmtDZD(finalPayAmount)} دج</b>
                  </span>
                  {finalPayAmount < totals.netPay && (
                    <span style={{ color: 'var(--red)' }}>
                      المتبقي: <b>{fmtDZD(totals.netPay - finalPayAmount)} دج</b>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <div style={lblStyle}>ملاحظات</div>
            <textarea
              rows={2}
              value={notes}
              placeholder="ملاحظات اختيارية..."
              onChange={e => setNotes(e.target.value)}
              style={{ ...inpStyle(), resize: 'vertical' }}
              disabled={isPending}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 18px',
            borderTop: '1px solid var(--b1)',
            background: 'var(--bg2)',
            display: 'flex',
            gap: 8,
            justifyContent: 'space-between',
            alignItems: 'center',
            borderRadius: '0 0 var(--r3) var(--r3)',
          }}
        >
          <div style={{ fontSize: 12, color: 'var(--t4)' }}>
            {lines.length > 0 && (
              <span>
                {lines.length} منتج ·{' '}
                <span style={{ fontWeight: 700, color: 'var(--em)' }}>
                  {fmtDZD(totals.netPay)} دج
                </span>
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              disabled={isPending}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--r2)',
                border: '1px solid var(--b2)',
                background: 'var(--bg1)',
                color: 'var(--t2)',
                cursor: isPending ? 'not-allowed' : 'pointer',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              إلغاء
            </button>
            <button
              onClick={handleFinalSave}
              disabled={isPending || !!success}
              style={{
                padding: '8px 22px',
                borderRadius: 'var(--r2)',
                border: 'none',
                background: success
                  ? 'var(--green)'
                  : 'linear-gradient(135deg, var(--em), color-mix(in srgb, var(--em) 70%, var(--blue)))',
                color: 'white',
                cursor: isPending || !!success ? 'not-allowed' : 'pointer',
                fontSize: 13,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                opacity: isPending ? 0.7 : 1,
              }}
            >
              {isPending ? (
                <>
                  <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> جاري
                  الحفظ...
                </>
              ) : success ? (
                <>
                  <i className="ti ti-check" /> تم الحفظ
                </>
              ) : (
                <>
                  <i className="ti ti-bolt" /> تأكيد البيع (F8)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Mini helpers ─────────────────────────────────────────────────────────────

function calcLine(l: QuickLine) {
  const ht = l.price * l.quantity;
  const tva = ht * (l.tva_rate / 100);
  return { ht, tva, ttc: ht + tva };
}

function TotRow({ label, value, color = 'var(--t3)' }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color }}>
      <span>{label}</span>
      <span style={{ fontWeight: 600, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
    </div>
  );
}

function ErrMsg({ msg }: { msg: string }) {
  return <div style={{ color: 'var(--red)', fontSize: 11, marginTop: 3 }}>{msg}</div>;
}

const lblStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--t3)',
  display: 'block',
  marginBottom: 4,
  textTransform: 'uppercase',
  letterSpacing: 0.4,
};

function inpStyle(err?: boolean): React.CSSProperties {
  return {
    width: '100%',
    boxSizing: 'border-box',
    padding: '7px 10px',
    borderRadius: 'var(--r2)',
    border: `1px solid ${err ? 'var(--red)' : 'var(--b3)'}`,
    background: 'var(--bg1)',
    color: 'var(--t1)',
    fontSize: 13,
    fontFamily: 'Tajawal, sans-serif',
    outline: 'none',
  };
}

function cellStyle(): React.CSSProperties {
  return {
    width: '100%',
    boxSizing: 'border-box',
    padding: '5px 6px',
    borderRadius: 'var(--r1)',
    border: '1px solid var(--b3)',
    background: 'var(--bg1)',
    color: 'var(--t1)',
    fontSize: 12,
    fontFamily: 'Tajawal, sans-serif',
    outline: 'none',
    textAlign: 'center',
  };
}

function selectStyle(disabled: boolean, hasValue: boolean): React.CSSProperties {
  return {
    width: '100%',
    padding: '8px 12px 8px 34px',
    borderRadius: 'var(--r2)',
    border: `1px solid ${disabled ? 'var(--b2)' : 'var(--b3)'}`,
    background: disabled ? 'var(--bg3)' : 'var(--bg1)',
    color: hasValue && !disabled ? 'var(--t1)' : 'var(--t4)',
    fontSize: 13,
    fontFamily: 'Tajawal, sans-serif',
    outline: 'none',
    appearance: 'none' as any,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'border-color .15s, box-shadow .15s',
  };
}

function inpNumStyle(err?: boolean): React.CSSProperties {
  return {
    width: '100%',
    boxSizing: 'border-box',
    padding: '7px 10px',
    borderRadius: 'var(--r2)',
    border: `1px solid ${err ? 'var(--red)' : 'var(--b3)'}`,
    background: 'var(--bg1)',
    color: 'var(--t1)',
    fontSize: 13,
    fontFamily: 'Tajawal, sans-serif',
    outline: 'none',
    textAlign: 'center',
  };
}

function selectNumStyle(disabled: boolean, hasValue: boolean): React.CSSProperties {
  return {
    width: '100%',
    padding: '8px 12px 8px 34px',
    borderRadius: 'var(--r2)',
    border: `1px solid ${disabled ? 'var(--b2)' : 'var(--b3)'}`,
    background: disabled ? 'var(--bg3)' : 'var(--bg1)',
    color: hasValue && !disabled ? 'var(--t1)' : 'var(--t4)',
    fontSize: 13,
    fontFamily: 'Tajawal, sans-serif',
    outline: 'none',
    appearance: 'none' as any,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'border-color .15s, box-shadow .15s',
    textAlign: 'center',
  };
}

```

## FILE: resources/js/pages/documents/types/document.types.ts
```
// ════════════════════════════════════════════════════════════════════════════
// pages/documents/types/document.types.ts
//
// مصدر الحقيقة الوحيد لأنواع بيانات وحدة المستندات التجارية.
// ════════════════════════════════════════════════════════════════════════════

// ─── Document operation constants ────────────────────────────────────────────

export const PURCHASE_CODES  = new Set(['DDP', 'BCF', 'BR', 'FA', 'AA']);
export const STOCK_IN_CODES  = new Set(['FA', 'BR', 'AV']);
export const STOCK_OUT_CODES = new Set(['FV', 'BL', 'AA']);
export const REQUIRES_PARTY  = new Set(['DEV', 'BCC', 'BL', 'FV', 'AV', 'DDP', 'BCF', 'BR', 'FA', 'AA']);
export const SALE_CODES      = new Set(['FV', 'BL', 'DEV', 'BCC', 'AV']);
export const SHIPPING_CODES  = new Set(['BL', 'BCC']);

/** خريطة التحويلات المسموح بها (من → إلى[]) */
export const CONVERSION_MAP: Record<string, string[]> = {
  DEV: ['BCC', 'BL', 'FV'],
  BCC: ['BL', 'FV'],
  BL:  ['FV'],
  FV:  ['AV'],              // فاتورة مبيعات → إشعار دائن
  AV:  ['FV'],              // إشعار دائن → فاتورة مبيعات (عكس)
  DDP: ['BCF'],
  BCF: ['BR', 'FA'],
  BR:  ['FA'],
  FA:  ['AA'],              // فاتورة مشتريات → إشعار مدين
  AA:  ['FA'],              // إشعار مدين → فاتورة مشتريات (عكس)
};

/** أنواع تدعم إنشاء مرتجع */
export const RETURNABLE_CODES = new Set(['FV', 'FA', 'BL', 'BR']);

// ─── Product ──────────────────────────────────────────────────────────────────

export interface Packaging {
  id:          number;
  code:        string;
  label:       string;
  quantity:    number;
  is_default:  boolean;
  barcode?:    string | null;
}

export interface ProductLot {
  id:                   number;
  lot_number:           string;
  expiration_date?:     string | null;
  remaining_quantity:   number;
  purchase_price?:      number | null;
  legal_selling_price?: number | null;
}

export interface ProductPrice {
  id:               number;
  price_level_id:   number;
  price_level?:     { id: number; name: string };
  pricing_method:   'fixed' | 'rate' | 'margin';
  price?:           number;
  rate?:            number;
  margin?:          number;
  active:           boolean;
}

export interface QuantityDiscount {
  id:                   number;
  price_level_id:       number;
  min_qty:              number;
  max_qty?:             number | null;
  discount_amount?:     number | null;
  discount_percentage?: number | null;
  active:               boolean;
  is_blocked?:          boolean;
  tier_order?:          number;
}

export interface Product {
  id:                         number;
  name:                       string;
  ref?:                       string | null;
  barcode?:                   string | null;
  purchase_price_ht?:         number | string | null;
  current_cost_price?:        number | string | null;
  default_selling_price_ht?:  number | string | null;
  family?:                    { id: number; name: string } | null;
  brand?:                     { id: number; name: string } | null;
  tva?:                       { id: number; rate: number; is_default?: boolean } | null;
  unit?:                      { id: number; symbol: string; name: string } | null;
  packagings?:                Packaging[];
  prices?:                    ProductPrice[];
  quantityDiscounts?:         QuantityDiscount[];
  lots?:                      ProductLot[];
  manages_stock?:             boolean;
  manages_quantity_discounts?: boolean;
  has_lots?:                  boolean;
  has_expiration_date?:      boolean;
  active?:                    boolean;
  stock_quantity?:            number | null;
  allow_negative_stock?:      boolean;
  min_stock_alert?:          number | null;
}

// ─── Party ────────────────────────────────────────────────────────────────────

export interface Party {
  id:                      number;
  name:                    string;
  code?:                   string | null;
  phone?:                  string | null;
  email?:                  string | null;
  balance?:                number | null;
  default_price_level_id?: number | null;
  default_price_level?:    { id: number; name: string } | null;
  credit_limit?:           number | null;
  credit_days?:            number | null;
  is_tva_exempt?:          boolean;
  is_final_consumer?:      boolean;
  is_vat_registered?:      boolean;
}

// ─── Shipping Info ──────────────────────────────────────────────────────────────

export interface ShippingInfo {
  address?:       string;
  transport_mode?: string;
  driver_name?:   string;
  vehicle_plate?: string;
  driver_notes?:  string;
}

// ─── Payment Term ──────────────────────────────────────────────────────────────

export interface PaymentTerm {
  due_date:    string;
  percentage:  number;
  amount:      number;
  notes?:      string;
}

// ─── Payment ──────────────────────────────────────────────────────────────────

export interface PaymentMode {
  id:                    number;
  name:                  string;
  code?:                 string | null;
  icon?:                 string | null;
  treasury_account_id?:  number | null;
  requires_reference?:   boolean;
  is_cash?:              boolean;
}

export interface PaymentEntry {
  id?:                  number;
  payment_mode_id:      string;
  amount:               string;
  reference?:           string;
  notes?:               string;
  client_ref?:          string;
  payment_date:         string;
  treasury_account_id?: string | number;
  check_number?:        string;
  check_bank?:          string;
  check_due_date?:      string;
  /** internal frontend-only ref for idempotency — translated to client_ref at API boundary */
  _clientRef?:          string;
}

// ─── Treasury Account ─────────────────────────────────────────────────────────

export interface TreasuryAccount {
  id:              number;
  code:            string;
  name:            string;
  type:            'bank' | 'cash' | 'check';
  balance:         number;
  is_active:       boolean;
  bank_name?:      string | null;
  account_number?: string | null;
}

// ─── Line ─────────────────────────────────────────────────────────────────────

export type DiscountMode = 'percent' | 'fixed';

export interface LineItem {
  id?:                    number;
  product_id:             string;
  description:            string;
  quantity:               number;
  unit_price_ht:          number;
  /** سعر التعبئة = unit_price_ht × packQty */
  price_per_pack:         number;
  discount_mode:          DiscountMode;
  discount_percentage:    number;
  discount_amount_fixed:  number;
  tva_rate:               number;
  packaging_id:           string;
  stock_lot_id:           string;
  lot_number_new?:        string;
  warehouse_id?:          string;
  line_note?:             string;
  _product?:              Product;
  _packQty:               number;
  _warnings?:             Array<{ type: string; level: string; message: string }>;
  _computing?:            boolean;
}

// ─── Form ─────────────────────────────────────────────────────────────────────

export interface DocumentFormState {
  party_id:       string;
  document_date:  string;
  due_date:       string;
  delivery_date:  string;
  notes:          string;
  internal_notes: string;
  warehouse_id:   string;
  fiscal_year_id: string;
  currency_id:    string;
  exchange_rate:  string;
  apply_stamp:    boolean;
  price_level_id: string;
  lines:          LineItem[];
  payments:       PaymentEntry[];
  shipping_info:  ShippingInfo;
  payment_terms:  PaymentTerm[];
}

// ─── Totals ───────────────────────────────────────────────────────────────────

export interface DocumentTotals {
  gross:       number;
  ht:          number;
  tva:         number;
  ttc:         number;
  discount:    number;
  stamp:       number;
  netToPay:    number;
  totalPaid:   number;
  remaining:   number;
}

// ─── Document Status ──────────────────────────────────────────────────────────

export interface DocumentStatus {
  id:     number;
  name:   string;
  label:  string;
  color:  string;
  active: boolean;
}

// ─── Column config ────────────────────────────────────────────────────────────

export const ALL_COLUMNS = [
  { key: 'idx',        label: '#',              w: 34,  fixed: true  },
  { key: 'product',    label: 'المنتج',          w: 220, fixed: true  },
  { key: 'packaging',  label: 'التعبئة',         w: 110, fixed: false },
  { key: 'lot',        label: 'الحصة',             w: 120, fixed: false },
  { key: 'warehouse',  label: 'المستودع',        w: 100, fixed: false },
  { key: 'quantity',   label: 'الكمية',          w: 75,  fixed: true  },
  { key: 'unit',       label: 'الوحدة',          w: 60,  fixed: false },
  { key: 'unit_price', label: 'سعر الوحدة HT',  w: 110, fixed: false },
  { key: 'pack_price', label: 'سعر التعبئة',    w: 100, fixed: false },
  { key: 'orig_price', label: 'السعر الأصلي',   w: 100, fixed: false },
  { key: 'discount',   label: 'الخصم',           w: 110, fixed: false },
  { key: 'price_after',label: 'بعد الخصم HT',   w: 100, fixed: false },
  { key: 'tva',        label: 'TVA %',           w: 68,  fixed: false },
  { key: 'total_ht',   label: 'إجمالي HT',      w: 100, fixed: false },
  { key: 'total_ttc',  label: 'إجمالي TTC',     w: 110, fixed: true  },
  { key: 'cost',       label: 'التكلفة',         w: 100, fixed: false },
  { key: 'margin',     label: 'الهامش',         w: 110, fixed: false },
  { key: 'line_note',  label: 'ملاحظة',          w: 100, fixed: false },
  { key: 'actions',    label: '',                w: 36,  fixed: true  },
] as const;

export type ColKey = (typeof ALL_COLUMNS)[number]['key'];

// ─── Status config ────────────────────────────────────────────────────────────

export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft:          { label: 'مسودة',        color: 'var(--t4)',     bg: 'var(--bg3)' },
  pending:        { label: 'قيد الانتظار', color: 'var(--orange)', bg: 'color-mix(in srgb, var(--orange) 12%, transparent)' },
  validated:      { label: 'معتمد',         color: 'var(--blue)',   bg: 'color-mix(in srgb, var(--blue) 12%, transparent)'   },
  partially_paid: { label: 'مدفوع جزئياً', color: 'var(--purple)', bg: 'color-mix(in srgb, var(--purple) 12%, transparent)' },
  paid:           { label: 'مدفوع',         color: 'var(--em)',     bg: 'color-mix(in srgb, var(--em) 12%, transparent)'     },
  overdue:        { label: 'متأخر',         color: 'var(--red)',    bg: 'color-mix(in srgb, var(--red) 12%, transparent)'    },
  cancelled:      { label: 'ملغي',          color: 'var(--red)',    bg: 'color-mix(in srgb, var(--red) 8%, transparent)'     },
  returned:       { label: 'مرتجع',         color: 'var(--purple)', bg: 'color-mix(in srgb, var(--purple) 10%, transparent)' },
};

```

## FILE: resources/js/pages/documents/utils/document.utils.ts
```
// ════════════════════════════════════════════════════════════════════════════
// pages/documents/utils/document.utils.ts — إصلاح كامل للحسابات
//
// ══ نموذج البيانات (مصدر الحقيقة) ══════════════════════════════════════════
//
// الباكاند (DB):
//   quantity         = وحدات أساسية دائماً (مثلاً: 24 قارورة)
//   unit_price_ht    = سعر الوحدة الأساسية HT
//   discount_percentage = نسبة الخصم %
//   discount_amount  = مبلغ خصم الوحدة الواحدة (= unit_price_ht × discPct/100)
//   total_ht         = quantity × unit_price_ht × (1 - discPct/100)
//
// الفرونتند (LineItem):
//   quantity         = عدد العبوات (مثلاً: 2 كرتون)
//   _packQty         = كمية الوحدات في العبوة (مثلاً: 12)
//   unit_price_ht    = سعر الوحدة الأساسية HT (نفس الباكاند)
//   price_per_pack   = سعر العبوة = unit_price_ht × _packQty
//   discount_mode    = 'percent' | 'fixed'
//   discount_percentage = نسبة الخصم % (عند percent)
//   discount_amount_fixed = مبلغ خصم العبوة الواحدة (عند fixed)
//
// ══ معادلات الإرسال للباكاند ════════════════════════════════════════════════
//
//   effectiveQty = quantity × _packQty    (تحويل للوحدات الأساسية)
//   unit_price_ht = unit_price_ht         (لا تغيير)
//   discount_percentage:
//     - percent mode:  discountPercentage (مباشر)
//     - fixed mode:    (discount_amount_fixed / price_per_pack) × 100
//       ملاحظة: discount_amount_fixed هو خصم العبوة الواحدة
//               الباكاند يريد discount_amount = خصم الوحدة الأساسية
//   discount_amount (للباكاند) = unit_price_ht × discPct / 100
//
// ══ معادلات الاستقبال من الباكاند ═══════════════════════════════════════════
//
//   displayQty = db.quantity / _packQty   (تحويل لعبوات)
//   discount_amount_fixed = db.discount_amount × _packQty
//
// ════════════════════════════════════════════════════════════════════════════

import type {
  LineItem,
  DocumentTotals,
  Product,
  ProductPrice,
  ColKey,
} from '../types/document.types';

// ─── Number helpers ───────────────────────────────────────────────────────────

export function toNum(v: number | string | null | undefined): number {
  if (v === null || v === undefined || v === '') return 0;
  const p = parseFloat(String(v));
  return isNaN(p) ? 0 : p;
}

export function fmtDZD(v: number | string | null | undefined): string {
  const num = toNum(v);
  return new Intl.NumberFormat('fr-DZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function fmtDate(d?: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ar-DZ', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
}

export function today(): string {
  return new Date().toISOString().split('T')[0];
}

// ─── Fiscal stamp ─────────────────────────────────────────────────────────────

export function calcFiscalStamp(ttc: number): number {
  if (ttc < 30_000) return 0;
  return Math.min(Math.ceil(ttc * 0.01), 2_500);
}

// ─── Line calculations ────────────────────────────────────────────────────────

export interface LineCalcResult {
  /** الكمية بالوحدات الأساسية = quantity × _packQty */
  baseQty:      number;
  /** إجمالي قبل الخصم = unit_price_ht × baseQty */
  gross:        number;
  /** مبلغ الخصم الإجمالي */
  discountAmt:  number;
  /** نسبة الخصم الفعلية */
  discPct:      number;
  /** HT بعد الخصم */
  ht:           number;
  /** مبلغ TVA */
  tva:          number;
  /** TTC = ht + tva */
  ttc:          number;
  /** خصم الوحدة الأساسية الواحدة = unit_price_ht × discPct/100 */
  unitDiscount: number;
}

/**
 * حساب إجماليات سطر واحد.
 *
 * القاعدة الأساسية:
 *   baseQty  = quantity × _packQty
 *   gross    = unit_price_ht × baseQty
 *   discount = gross × discPct/100  (أو fixed × quantity لكل العبوات)
 *   ht       = gross - discount
 *   tva      = ht × tvaRate/100
 *   ttc      = ht + tva
 */
export function calcLineTotal(line: LineItem): LineCalcResult {
  const packQty = line._packQty > 1 ? line._packQty : 1;
  const baseQty = Math.round(line.quantity * packQty * 1_000_000) / 1_000_000;

  // الإجمالي قبل الخصم — دائماً unit_price_ht × الكميات الأساسية
  const gross = Math.round(line.unit_price_ht * baseQty * 10_000) / 10_000;

  let discountAmt: number;
  let discPct:     number;

  if (line.discount_mode === 'percent') {
    discPct     = line.discount_percentage;
    discountAmt = Math.round(gross * (discPct / 100) * 10_000) / 10_000;
  } else {
    // fixed: discount_amount_fixed = خصم إجمالي على السطر كله
    discountAmt = Math.min(line.discount_amount_fixed, gross);
    discPct     = gross > 0 ? (discountAmt / gross) * 100 : 0;
  }

  const ht  = Math.round((gross - discountAmt) * 10_000) / 10_000;
  const tva = Math.round(ht * (line.tva_rate / 100) * 10_000) / 10_000;
  const ttc = Math.round((ht + tva) * 10_000) / 10_000;

  // خصم الوحدة الواحدة للإرسال للباكاند
  const unitDiscount = Math.round(line.unit_price_ht * (discPct / 100) * 10_000) / 10_000;

  return { baseQty, gross, discountAmt, discPct, ht, tva, ttc, unitDiscount };
}

export function calcTotals(
  lines:      LineItem[],
  applyStamp: boolean,
  payments:   Array<{ amount: string }>,
): DocumentTotals {
  let gross = 0, ht = 0, tva = 0, discount = 0;

  for (const line of lines) {
    const t = calcLineTotal(line);
    gross    += t.gross;
    ht       += t.ht;
    tva      += t.tva;
    discount += t.discountAmt;
  }

  // تقريب نهائي
  gross    = Math.round(gross    * 100) / 100;
  ht       = Math.round(ht       * 100) / 100;
  tva      = Math.round(tva      * 100) / 100;
  discount = Math.round(discount * 100) / 100;

  const ttc      = Math.round((ht + tva) * 100) / 100;
  const stamp    = applyStamp ? calcFiscalStamp(ttc) : 0;
  const netToPay = Math.round((ttc + stamp) * 100) / 100;
  const totalPaid = payments.reduce((acc, p) => acc + toNum(p.amount), 0);

  return { gross, ht, tva, ttc, discount, stamp, netToPay, totalPaid, remaining: netToPay - totalPaid };
}

// ─── Price resolution ─────────────────────────────────────────────────────────

function resolveProductPrice(product: Product, entry: ProductPrice): number {
  const cost = toNum(product.purchase_price_ht) || toNum(product.current_cost_price) || 0;
  const val  = entry.price ?? entry.rate ?? entry.margin ?? null;
  if (val === null) return 0;
  if (entry.pricing_method === 'fixed')  return val;
  if (entry.pricing_method === 'rate')   return cost * (1 + val / 100);
  if (entry.pricing_method === 'margin') return cost + val;
  return cost;
}

export function resolvePrice(
  product:      Product,
  priceLevelId: number | null,
  isPurchase:   boolean,
): number {
  if (isPurchase) {
    return toNum(product.purchase_price_ht ?? product.current_cost_price) || 0;
  }

  if (priceLevelId) {
    const entry = (product.prices ?? []).find(
      (p) => p.price_level_id === priceLevelId && p.active,
    );
    if (entry) {
      const v = resolveProductPrice(product, entry);
      if (v > 0) return v;
    }
  }

  const defaultPrice = toNum(product.default_selling_price_ht);
  if (defaultPrice > 0) return defaultPrice;

  const costPrice = toNum(product.purchase_price_ht) || toNum(product.current_cost_price);
  if (costPrice > 0) return Math.round(costPrice * 1.3 * 100) / 100;

  return 0;
}

export function resolveQuantityDiscount(
  product:      Product,
  baseQty:      number,
  priceLevelId: number | null,
): { percentage: number; fixed: number } {
  // baseQty = الكميات الأساسية (بعد ضرب عدد العبوات)
  const matches = (product.quantityDiscounts ?? []).filter((d) => {
    if (!d.active)                                              return false;
    if (priceLevelId && d.price_level_id !== priceLevelId)     return false;
    if (baseQty < d.min_qty)                                    return false;
    if (d.max_qty != null && baseQty > d.max_qty)               return false;
    return true;
  });

  if (matches.length === 0) return { percentage: 0, fixed: 0 };

  const best = matches[matches.length - 1];
  return {
    percentage: toNum(best.discount_percentage),
    fixed:      toNum(best.discount_amount),
  };
}

// ─── Columns persistence ──────────────────────────────────────────────────────

const COLS_STORAGE_KEY = 'cdm_visible_cols_v3';

const DEFAULT_VISIBLE_COLS: ColKey[] = [
  'idx', 'product', 'packaging', 'lot',
  'quantity', 'unit_price', 'pack_price',
  'discount', 'tva', 'total_ttc', 'actions',
];

export function loadVisibleCols(slug: string): Set<ColKey> {
  try {
    const raw = localStorage.getItem(`${COLS_STORAGE_KEY}_${slug}`);
    if (raw) return new Set(JSON.parse(raw) as ColKey[]);
  } catch {}
  return new Set<ColKey>(DEFAULT_VISIBLE_COLS);
}

export function saveVisibleCols(slug: string, cols: Set<ColKey>): void {
  try {
    localStorage.setItem(`${COLS_STORAGE_KEY}_${slug}`, JSON.stringify([...cols]));
  } catch {}
}

// ─── Stock helpers ────────────────────────────────────────────────────────────

export function getProductStock(
  product:   Product,
  stockData: Record<number, number>,
): number {
  if (!product.manages_stock) return Infinity;
  const realtime = stockData[product.id];
  if (realtime !== undefined) return toNum(realtime);
  if (product.stock_quantity != null) return toNum(product.stock_quantity);
  return (product.lots ?? []).reduce((acc, l) => acc + (l.remaining_quantity ?? 0), 0);
}

export type LineStockValidation =
  | { ok: true }
  | { ok: false; blocking: true;  message: string }
  | { ok: false; blocking: false; message: string };

/**
 * التحقق من المخزون.
 * stockData يحتوي على الكميات بالوحدات الأساسية.
 * يجب مقارنتها بـ baseQty (= quantity × _packQty).
 */
export function validateLineStock(
  line:       LineItem,
  product:    Product,
  isPurchase: boolean,
  stockData:  Record<number, number>,
): LineStockValidation {
  if (isPurchase || !product.manages_stock) return { ok: true };

  const stock   = getProductStock(product, stockData);
  const baseQty = Math.round(line.quantity * (line._packQty > 1 ? line._packQty : 1) * 1000) / 1000;

  if (baseQty <= stock) return { ok: true };

  const packLabel = line._packQty > 1
    ? `${line.quantity} عبوة (${baseQty} وحدة)`
    : `${baseQty} وحدة`;

  if (!product.allow_negative_stock) {
    return {
      ok: false,
      blocking: false,
      message: `تنبيه: الكمية المطلوبة (${packLabel}) — المتاح (${stock} وحدة)`,
    };
  }

  return {
    ok: false,
    blocking: false,
    message: `تنبيه: البيع سيجعل المخزون سالباً (${Math.round((stock - baseQty) * 1000) / 1000} وحدة)`,
  };
}

```


====================================================
⚠️ تم الدمج فقط لتسهيل المشاركة أو المراجعة
====================================================
