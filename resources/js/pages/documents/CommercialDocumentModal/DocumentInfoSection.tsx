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
