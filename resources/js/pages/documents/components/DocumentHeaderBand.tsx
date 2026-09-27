import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { QueryClient } from '@tanstack/react-query';
import type { PartyType } from '@/lib/api/core/types';
import type { Party } from '../types/document.types';
import { buildWhatsAppLink } from '@/lib/wa';
import { ComboBox, FieldError } from './DocumentUIPrimitives';
import PartySearchModal from './PartySearchModal';
import type { PartyQuickCreatePayload } from './PartyQuickCreateForm';
import type { PartyBalanceInfo } from '../hooks/useDocumentForm';
import type { CreditCheckResult } from '../hooks/useCreditCheck';
import type { CustomerInsightsData } from '../hooks/useCustomerInsights';
import { fmtDZD } from '../utils/document.utils';

const fieldInputStyle = (isReadOnly: boolean, hasError?: boolean): React.CSSProperties => ({
  width: '100%', padding: '7px 10px', borderRadius: 'var(--r2)',
  border: `1px solid ${hasError ? 'var(--red)' : 'var(--b3)'}`,
  background: isReadOnly ? 'var(--bg3)' : 'var(--bg1)',
  color: 'var(--t1)', fontSize: 13,
  fontFamily: 'Tajawal, sans-serif', outline: 'none',
  boxSizing: 'border-box',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

interface DocumentHeaderBandProps {
  isEdit: boolean;
  isReadOnly: boolean;
  isLinesReadOnly: boolean;
  isPurchase: boolean;

  form: Record<string, unknown>;
  errors: Record<string, string>;
  set: (field: string, value: unknown) => void;

  docNumber: string;
  docNumberErr: string;
  checkingDocNumber: boolean;
  handleDocNumberChange: (v: string) => void;

  handlePartyChangeWithWarning: (id: string) => void;
  partyOptions: Array<{ id: number; label: string; sub?: string; badge?: string }>;
  /** المتعامل المحدَّد (الكائن الكامل) — يعرض معلوماته الكاملة في بطاقة POS Pro. */
  selectedParty: Party | null;
  priceLevelOptions: Array<{ id: number; label: string }>;
  handlePriceLevelChange: (v: string) => void;

  warehouses: Array<{ id: number; name: string; is_default?: boolean }>;
  warehouseIdNum: number | null;
  qc: QueryClient;
  slug: string | null | undefined;

  partyBalance: PartyBalanceInfo | null;
  isLoadingBalance: boolean;
  creditCheck?: CreditCheckResult | null;
  customerInsights?: CustomerInsightsData | null;
  partyTypes?: PartyType[];
  onQuickCreateParty?: (payload: PartyQuickCreatePayload) => void;
  creatingParty?: boolean;
}

const segCard: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 4,
  padding: '7px 10px', borderRadius: 'var(--r2)',
  background: 'var(--bg1)', border: '1px solid var(--b1)',
};

const segHeader = (): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 5,
  fontSize: 10.5, fontWeight: 800, color: 'var(--t4)',
});

/** حقل رقم المستند (تعديل فقط) — مُستخرج لتجنّب التكرار بين أنماط العرض الثلاثة. */
function DocNumberInput({
  docNumber, docNumberErr, checkingDocNumber, handleDocNumberChange, isReadOnly,
}: {
  docNumber: string;
  docNumberErr: string;
  checkingDocNumber: boolean;
  handleDocNumberChange: (v: string) => void;
  isReadOnly: boolean;
}) {
  return (
    <>
      <div style={segHeader()}>
        <i className="ti ti-file-description" />
        <span>رقم المستند</span>
      </div>
      <div className="doc-field-rel">
        <input
          type="text"
          style={{
            ...fieldInputStyle(isReadOnly, !!docNumberErr),
            paddingLeft: checkingDocNumber ? 28 : 10, paddingTop: 5, paddingBottom: 5,
          }}
          value={docNumber}
          disabled={isReadOnly}
          onChange={(e) => handleDocNumberChange(e.target.value)}
          placeholder="أدخل رقم المستند..."
        />
        {checkingDocNumber && (
          <i className="ti ti-loader doc-field-spin" />
        )}
      </div>
      <FieldError msg={docNumberErr} />
    </>
  );
}

/** حقل تاريخ المستند — مُستخرج لتجنّب التكرار (بطاقة المتعامل + التخطيط القديم). */
function DateFieldBlock({
  isReadOnly, value, err, onChange, style,
}: {
  isReadOnly: boolean;
  value: string;
  err: string;
  onChange: (v: string) => void;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ ...segCard, ...style }}>
      <div style={segHeader()}>
        <i className="ti ti-calendar" />
        <span>تاريخ المستند</span>
      </div>
      <input
        type="date"
        style={fieldInputStyle(isReadOnly, !!err)}
        value={value}
        disabled={isReadOnly}
        onChange={(e) => onChange(e.target.value)}
      />
      <FieldError msg={err} />
    </div>
  );
}

/** حقل المستودع — مُستخرج لتجنّب التكرار (بطاقة المتعامل + التخطيط القديم). */
function WarehouseFieldBlock({
  isReadOnly, value, err, onChange, style, qc, slug, warehouseIdNum, warehouses,
}: {
  isReadOnly: boolean;
  value: string;
  err: string;
  onChange: (v: string) => void;
  style?: React.CSSProperties;
  qc: QueryClient;
  slug: string | null | undefined;
  warehouseIdNum: number | null;
  warehouses: Array<{ id: number; name: string; is_default?: boolean }>;
}) {
  return (
    <div style={{ ...segCard, ...style }}>
      <div style={segHeader()}>
        <i className="ti ti-building-warehouse" />
        <span>المستودع</span>
      </div>
      <select
        style={{
          ...fieldInputStyle(isReadOnly, !!err),
          cursor: isReadOnly ? 'not-allowed' : 'pointer',
        }}
        value={value}
        disabled={isReadOnly}
        onChange={(e) => {
          onChange(e.target.value);
          qc.invalidateQueries({ queryKey: [slug, 'warehouse-stock', warehouseIdNum] });
        }}
      >
        <option value="">— اختر —</option>
        {warehouses.map((w) => (
          <option key={String(w.id)} value={String(w.id)}>
            {String(w.name)}{w.is_default ? ' ★' : ''}
          </option>
        ))}
      </select>
      <FieldError msg={err} />
    </div>
  );
}

/**
 * بطاقة المتعامل المستقلة (نمط POS Pro) — تُعرض في الصف العلوي بجانب بطاقة الإجماليات.
 * الحقول (التاريخ/المستودع/فئة السعر/رقم المستند) داخل تبويب «معلومات المستند».
 */
export default function DocumentHeaderBand({
  isEdit, isReadOnly, isLinesReadOnly, isPurchase,
  form, errors, set,
  docNumber, docNumberErr, checkingDocNumber, handleDocNumberChange,
  handlePartyChangeWithWarning, partyOptions, priceLevelOptions, handlePriceLevelChange,
  selectedParty: partyRecord,
  warehouses, warehouseIdNum, qc, slug,
  partyBalance, isLoadingBalance, creditCheck, customerInsights,
  partyTypes, onQuickCreateParty, creatingParty,
}: DocumentHeaderBandProps) {
  const quickCreateEnabled = !!onQuickCreateParty && !isReadOnly;

  const [cardTab, setCardTab] = useState<'party' | 'doc'>('party');
  const [partyPickerOpen, setPartyPickerOpen] = useState(false);
  const [avatarHover, setAvatarHover] = useState<{ x: number; y: number } | null>(null);
  const avatarBtnRef = useRef<HTMLButtonElement>(null);

  // ── بطاقة المتعامل المستقلة (نمط POS Pro) ────────────────────────────────
  const p = partyRecord;
  const pName = p?.name ?? '';
  const initials = (() => {
    const parts = pName.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '؟';
    if (parts.length === 1) return parts[0].slice(0, 2);
    return (parts[0][0] ?? '') + (parts[1][0] ?? '');
  })();
  const isCashParty = p?.slug === 'client-cash';
  const priceLevel = p?.default_price_level?.name;
  const phone = p?.mobile ?? p?.phone;
  const balance = partyBalance?.current_balance ?? 0;
  const creditLimit = Number(p?.credit_limit ?? 0);
  const isDebtor = balance > 0.009;
  const overCredit = creditLimit > 0 && balance >= creditLimit;
  const creditUsed = creditLimit > 0 ? Math.min(100, Math.max(0, (balance / creditLimit) * 100)) : 0;

  const hasContact = !!(phone || p?.email || p?.address);
  const waLink = (phone && buildWhatsAppLink(phone, ''));

  return (
    <div
      className={`pp-cust-card${isCashParty ? ' pp-cust-card--cash' : ''} doc-party-card`}
      style={{
        height: '100%', boxSizing: 'border-box', minHeight: 0,
      }}
    >
      {/* تَبويب: الزبون / معلومات المستند — نمط POS Pro (مكوّن مجزّأ نظيف) */}
      <div className="dhb-tabs">
        {([
          { key: 'party', icon: isPurchase ? 'ti-building-store' : 'ti-user', label: isPurchase ? 'المورد' : 'الزبون' },
          { key: 'doc', icon: 'ti-file-description', label: 'معلومات المستند' },
        ] as const).map((t) => (
          <button
            key={t.key}
            type="button"
            className={`dhb-tab${cardTab === t.key ? ' dhb-tab--on' : ''}`}
            onClick={() => setCardTab(t.key)}
          >
            <i className={`ti ${t.icon}`} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="doc-party-scroll">
      {cardTab === 'party' ? (
        <>
          {/*
            ══ تبويب الزبون: اختيار المتعامل + معلوماته + الرصيد + سقف الائتمان (نمط POS Pro) ══
          */}
          {/* رأس المتعامل يُعرض دائماً (حتى دون اختيار) لإظهار طريقة تحديد الزبون */}
          <div className="pp-cust-head">
            <div className="pp-avatar-wrap">
              <button
                ref={avatarBtnRef}
                type="button"
                id="doc-party-select"
                aria-label={p ? (isPurchase ? 'تغيير المورد' : 'تغيير الزبون') : (isPurchase ? 'اختر المورد' : 'اختر الزبون')}
                className={`pp-avatar${isDebtor ? ' pp-avatar--debt' : ''}`}
                onClick={() => { if (!isReadOnly) setPartyPickerOpen(true); }}
                onMouseEnter={() => {
                  const r = avatarBtnRef.current?.getBoundingClientRect();
                  if (r) setAvatarHover({ x: r.left + r.width / 2, y: r.bottom + 6 });
                }}
                onMouseLeave={() => setAvatarHover(null)}
              >
                {p?.avatar ? <img src={p.avatar} alt="" /> : initials}
              </button>
              {!isReadOnly && avatarHover && createPortal(
                <span
                  className="doc-party-avatar-tooltip"
                  style={{ position: 'fixed', left: avatarHover.x, top: avatarHover.y, transform: 'translateX(-50%)', zIndex: 99999, pointerEvents: 'none' }}
                >
                  <i className="ti ti-user-swap" /> {p ? (isPurchase ? 'تغيير المورد' : 'تغيير الزبون') : (isPurchase ? 'اختر المورد' : 'اختر الزبون')}
                </span>,
                document.body,
              )}
            </div>
            <div className="pp-cust-id">
              <div className="pp-cust-name">
                <span className="pp-cust-name-txt">{pName || (isPurchase ? 'اختر المورد' : 'اختر الزبون')}</span>
                {isCashParty && (
                  <span className="pp-cust-badge"><i className="ti ti-cash" /> الصندوق</span>
                )}
              </div>
              {p?.commercial_name && p.commercial_name !== pName ? (
                <div className="pp-cust-meta"><span>{p.commercial_name}</span></div>
              ) : (
                p?.code ? <div className="pp-cust-meta"><span>{p.code}</span></div> : null
              )}
            </div>
          </div>

          {p && (priceLevel || p.nif || p.rc || p.nis || p.is_tva_exempt) && (
            <div className="pp-cust-meta">
              {priceLevel && (
                <span title="مستوى السعر"><i className="ti ti-tags" /> {priceLevel}</span>
              )}
              {p.nif && (
                <span title="رقم التعريف الجبائي"><i className="ti ti-id-badge" /> {p.nif}</span>
              )}
              {p.rc && (
                <span title="رقم السجل التجاري"><i className="ti ti-file-text" /> {p.rc}</span>
              )}
              {p.nis && (
                <span title="الرقم الشريطي"><i className="ti ti-certificate" /> {p.nis}</span>
              )}
              {p.is_tva_exempt && (
                <span className="exempt" title="معفى من ضريبة القيمة المضافة">
                  <i className="ti ti-shield-check" /> معفى من TVA
                </span>
              )}
            </div>
          )}

          {p?.credit_days && p.credit_days > 0 && (
            <div className="pp-cust-meta">
              <span title="أيام الدفع"><i className="ti ti-calendar" /> أجل {p.credit_days} يوم</span>
              {p.created_at && (
                <span title="تاريخ التسجيل"><i className="ti ti-clock" /> عميل منذ {new Date(p.created_at).toLocaleDateString('ar-DZ', { year: 'numeric', month: 'short' })}</span>
              )}
            </div>
          )}
          {!p?.credit_days && p?.created_at && (
            <div className="pp-cust-meta">
              <span title="تاريخ التسجيل"><i className="ti ti-clock" /> عميل منذ {new Date(p.created_at).toLocaleDateString('ar-DZ', { year: 'numeric', month: 'short' })}</span>
            </div>
          )}

          {p && hasContact && (
            <div className="pp-cust-contact">
              {phone && (
                waLink
                  ? <a href={waLink} target="_blank" rel="noopener noreferrer" title="مراسلة واتساب">
                      <i className="ti ti-brand-whatsapp" /> {phone}
                    </a>
                  : <a href={`tel:${phone}`} title="إجراء مكالمة"><i className="ti ti-phone" /> {phone}</a>
              )}
              {p.email && (
                <a href={`mailto:${p.email}`} title="إرسال بريد إلكتروني"><i className="ti ti-mail" /> {p.email}</a>
              )}
              {p.address && (
                <span title="العنوان"><i className="ti ti-map-pin" /> {p.address}</span>
              )}
            </div>
          )}

          <FieldError msg={errors.party_id} />

          {p && (
            <div className="pp-cust-stats">
              <div className={`pp-stat pp-stat--balance${isDebtor ? ' debt' : ''}`}>
                <span className="pp-stat-label">{isPurchase ? 'رصيد المورد' : 'الرصيد'}</span>
                <strong dir="ltr">{isLoadingBalance ? '—' : fmtDZD(balance)}</strong>
              </div>
              <div className="pp-stat">
                <span className="pp-stat-label">سقف الائتمان</span>
                <strong dir="ltr">{fmtDZD(creditLimit)}</strong>
              </div>
              {creditCheck && creditCheck.overdue_invoices.count > 0 && (
                <div className="pp-stat pp-stat--overdue">
                  <span className="pp-stat-label">فواتير متأخرة</span>
                  <strong dir="ltr">{creditCheck.overdue_invoices.count} <span className="pp-stat-sub">({fmtDZD(creditCheck.overdue_invoices.total_amount)})</span></strong>
                </div>
              )}
              {customerInsights && customerInsights.document_count > 0 && (
                <div className="pp-stat">
                  <span className="pp-stat-label">حركة هذا العام</span>
                  <strong dir="ltr">{customerInsights.document_count} فاتورة</strong>
                </div>
              )}
              {creditCheck && creditCheck.available_credit != null && creditCheck.available_credit > 0 && (
                <div className="pp-stat pp-stat--available">
                  <span className="pp-stat-label">متبقّي من السقف</span>
                  <strong dir="ltr">{fmtDZD(creditCheck.available_credit)}</strong>
                </div>
              )}
            </div>
          )}

          {p && creditLimit > 0 && (
            <div className={`pp-cust-credit${overCredit ? ' over' : ''}`}>
              <div className="pp-cust-credit-bar">
                <span style={{ width: `${creditUsed}%` }} />
              </div>
              <div className="pp-cust-credit-meta">
                <span>{isPurchase ? 'رصيد المورد' : 'الرصيد'}: {fmtDZD(balance)}</span>
                <span>متبقّي {fmtDZD(Math.max(0, creditLimit - balance))}</span>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/*
            ══ تبويب المستند: تاريخ المستند / المستودع / فئة السعر ══
          */}
          <div style={segHeader()}>
            <i className="ti ti-file-description" />
            <span>معلومات المستند</span>
          </div>

          {/* رقم المستند (تعديل فقط) */}
          {isEdit && (
            <div style={segCard}>
              <DocNumberInput
                docNumber={docNumber}
                docNumberErr={docNumberErr}
                checkingDocNumber={checkingDocNumber}
                handleDocNumberChange={handleDocNumberChange}
                isReadOnly={isReadOnly}
              />
            </div>
          )}

          {/* تاريخ المستند */}
          <DateFieldBlock
            isReadOnly={isReadOnly}
            value={form.document_date as string}
            err={errors.document_date}
            onChange={(v) => set('document_date', v)}
          />

          {/* المستودع */}
          <WarehouseFieldBlock
            isReadOnly={isReadOnly}
            value={form.warehouse_id as string}
            err={errors.warehouse_id}
            onChange={(v) => set('warehouse_id', v)}
            qc={qc}
            slug={slug}
            warehouseIdNum={warehouseIdNum}
            warehouses={warehouses}
          />

          {/* فئة السعر */}
          {!isPurchase && priceLevelOptions.length > 0 && (
            <div style={segCard}>
              <div style={segHeader()}>
                <i className="ti ti-tag" />
                <span>فئة السعر</span>
              </div>
              <ComboBox
                options={priceLevelOptions}
                value={form.price_level_id as string}
                onChange={(v) => handlePriceLevelChange(v)}
                placeholder="— الافتراضي —"
                disabled={isReadOnly || isLinesReadOnly}
              />
            </div>
          )}
        </>
      )}
      </div>
      <PartySearchModal
        open={partyPickerOpen}
        isPurchase={isPurchase}
        options={partyOptions}
        value={form.party_id as string}
        quickCreateEnabled={quickCreateEnabled}
        partyTypes={partyTypes}
        creatingParty={creatingParty}
        onChange={handlePartyChangeWithWarning}
        onQuickCreate={onQuickCreateParty ? (p) => onQuickCreateParty!(p) : undefined}
        onClose={() => setPartyPickerOpen(false)}
      />
    </div>
  );
}
