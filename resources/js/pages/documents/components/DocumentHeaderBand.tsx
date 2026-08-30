import React from 'react';
import type { QueryClient } from '@tanstack/react-query';
import type { PartyType } from '@/lib/api/core/types';
import type { Party } from '../types/document.types';
import { buildWhatsAppLink } from '@/lib/wa';
import { ComboBox, FieldError } from './DocumentUIPrimitives';
import PartyBalanceBadge from '../CommercialDocumentModal/PartyBalanceBadge';
import PartyQuickCreateForm, { type PartyQuickCreatePayload } from './PartyQuickCreateForm';
import type { PartyBalanceInfo } from '../hooks/useDocumentForm';
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

/** أسلوب عرض الشريط:
 *  - `party-card`: بطاقة المتعامل المستقلة (تُعرض في صف علوي بجانب بطاقة الإجماليات، عروض POS Pro).
 *  - `toolbar`: شريط أدوات سطر واحد (التاريخ/المستودع/فئة السعر/رقم المستند)، بلا المتعامل.
 *  - `cards`    : التخطيط القديم (شبكة بطاقات كاملة مع المتعامل) — يحتفظ بالتوافق القديم. */
type BandVariant = 'party-card' | 'toolbar' | 'cards';

interface DocumentHeaderBandProps {
  docCode: string;
  isEdit: boolean;
  isReadOnly: boolean;
  isLinesReadOnly: boolean;
  isPurchase: boolean;
  needsParty: boolean;
  compact?: boolean;
  narrow?: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  /** ملخّص شريط الطي — جزء مُنسَّق مُسبقاً من الصفحة لعرضه في شريط المنمنم. */
  ttcLabel?: string;
  /** نمط العرض (سلوك افتراضي: `cards`). */
  variant?: BandVariant;

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

/**
 * شريط معلومات المستند. في نمط POS Pro:
 *  - `party-card`: المتعامل كبطاقة مستقلة (مع الرصيد والإنشاء السريع) تُعرض في الصف العلوي.
 *  - `toolbar`: التاريخ/المستودع/فئة السعر/رقم المستند في شريط سطر واحد قابل للطي.
 */
export default function DocumentHeaderBand({
  docCode, isEdit, isReadOnly, isLinesReadOnly, isPurchase, needsParty,
  compact, narrow, collapsed, onToggleCollapse, ttcLabel,
  form, errors, set,
  docNumber, docNumberErr, checkingDocNumber, handleDocNumberChange,
  handlePartyChangeWithWarning, partyOptions, priceLevelOptions, handlePriceLevelChange,
  selectedParty: partyRecord,
  warehouses, warehouseIdNum, qc, slug,
  partyBalance, isLoadingBalance, partyTypes, onQuickCreateParty, creatingParty,
  variant = 'cards',
}: DocumentHeaderBandProps) {
  const quickCreateEnabled = !!onQuickCreateParty && !isReadOnly;

  const [createOpen, setCreateOpen] = React.useState(false);
  const [qcName, setQcName] = React.useState('');
  const [cardTab, setCardTab] = React.useState<'party' | 'doc'>('party');

  const selectedParty = partyOptions.find((o) => String(o.id) === String(form.party_id ?? ''));
  const bandPad = (compact ? 8 : 11);

  const openCreate = (query: string) => {
    if (!quickCreateEnabled) return;
    setCreateOpen(true);
    setQcName(query.trim());
  };

  // ── بطاقة المتعامل المستقلة (نمط POS Pro) ────────────────────────────────
  if (variant === 'party-card') {
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

    const metaChips: Array<React.ReactNode> = [];
    const chipStyle: React.CSSProperties = {
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '1px 6px', borderRadius: 999,
      fontSize: 9.5, fontWeight: 700, whiteSpace: 'nowrap',
      background: 'var(--bg3)', border: '1px solid var(--b1)', color: 'var(--t3)',
    };
    if (priceLevel) {
      metaChips.push(
        <span key="lv" title="مستوى السعر" style={chipStyle}><i className="ti ti-tags" /> {priceLevel}</span>,
      );
    }
    if (p?.nif) {
      metaChips.push(
        <span key="nif" title="رقم التعريف الجبائي" style={chipStyle}><i className="ti ti-id-badge" /> {p.nif}</span>,
      );
    }
    if (p?.rc) {
      metaChips.push(
        <span key="rc" title="رقم السجل التجاري" style={chipStyle}><i className="ti ti-file-text" /> {p.rc}</span>,
      );
    }
    if (p?.is_tva_exempt) {
      metaChips.push(
        <span key="ex" title="معفى من ضريبة القيمة المضافة" style={{ ...chipStyle, background: 'var(--emb)', border: '1px solid var(--embo)', color: 'var(--em)' }}>
          <i className="ti ti-shield-check" /> معفى من TVA
        </span>,
      );
    }
    const hasContact = !!(phone || p?.email || p?.address);
    const waLink = (phone && buildWhatsAppLink(phone, ''));

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 6,
        padding: '10px 12px',
        background: 'var(--bg2)', border: '1px solid var(--b1)',
        borderRadius: 'var(--r3)', height: '100%', boxSizing: 'border-box',
        minHeight: 0,
      }}>
        {/* تَبويب: الزبون / معلومات المستند */}
        <div style={{
          display: 'flex', gap: 2, flexShrink: 0,
          background: 'var(--bg1)', border: '1px solid var(--b1)',
          borderRadius: 'var(--r1)', padding: 2,
        }}>
          {([
            { key: 'party', icon: isPurchase ? 'ti-building-store' : 'ti-user', label: isPurchase ? 'المورد' : 'الزبون' },
            { key: 'doc', icon: 'ti-file-description', label: 'معلومات المستند' },
          ] as const).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setCardTab(t.key)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                padding: '5px 4px', border: 'none', cursor: 'pointer', borderRadius: 'var(--r1)',
                fontSize: 10.5, fontWeight: 800, whiteSpace: 'nowrap',
                background: cardTab === t.key ? 'var(--em)' : 'transparent',
                color: cardTab === t.key ? '#fff' : 'var(--t4)',
                transition: 'all .15s',
              }}
            >
              <i className={`ti ${t.icon}`} style={{ fontSize: 12 }} />
              {t.label}
            </button>
          ))}
        </div>

        {cardTab === 'party' ? (
          <>
            {/*
              ══ تبويب الزبون: اختيار المتعامل + معلوماته + الرصيد + سقف الائتمان ══
            */}
            <div style={segHeader()}>
              <i className={`ti ${isPurchase ? 'ti-building-store' : 'ti-user'}`} />
              <span>{isPurchase ? 'المورد' : 'الزبون'}</span>
            </div>

            <ComboBox
              id="doc-party-select"
              options={partyOptions}
              value={form.party_id as string}
              onChange={handlePartyChangeWithWarning}
              placeholder={`— ابحث عن ${isPurchase ? 'مورد' : 'زبون'} —`}
              disabled={isReadOnly}
              error={!!errors.party_id}
              showCreate={quickCreateEnabled}
              createLabel={isPurchase ? 'مورد' : 'زبون'}
              onCreate={openCreate}
            />
            <FieldError msg={errors.party_id} />

            {p && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginTop: 2,
                padding: '6px 8px', borderRadius: 'var(--r2)',
                background: 'var(--bg1)', border: '1px solid var(--b1)',
              }}>
                <div style={{
                  width: 30, height: 30, flexShrink: 0, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 12, color: 'var(--em)',
                  background: 'var(--emb)', border: `1px solid ${isDebtor ? 'var(--red)' : 'var(--embo)'}`,
                  overflow: 'hidden',
                }}>
                  {p.avatar
                    ? <img src={p.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : initials}
                </div>
                <div style={{ flex: '1 1 0', minWidth: 0 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6, minWidth: 0,
                    fontWeight: 800, fontSize: 13, color: 'var(--t1)',
                  }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {pName}
                    </span>
                    {isCashParty && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0,
                        padding: '1px 6px', borderRadius: 999, fontSize: 9.5,
                        background: 'var(--emb)', border: '1px solid var(--embo)', color: 'var(--em)',
                      }}>
                        <i className="ti ti-cash" style={{ fontSize: 10 }} /> الصندوق
                      </span>
                    )}
                  </div>
                  {p.commercial_name && p.commercial_name !== pName ? (
                    <div style={{ fontSize: 10.5, color: 'var(--t4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.commercial_name}
                    </div>
                  ) : (
                    p.code ? <div style={{ fontSize: 10.5, color: 'var(--t4)' }}>{p.code}</div> : null
                  )}
                </div>
              </div>
            )}

            {p && metaChips.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {metaChips}
              </div>
            )}

            {p && hasContact && (
              <div style={{
                display: 'flex', flexDirection: 'column', gap: 2,
                fontSize: 10.5, color: 'var(--t3)', minWidth: 0,
              }}>
                {phone && (
                  waLink
                    ? <a href={waLink} target="_blank" rel="noopener noreferrer" title="مراسلة واتساب" style={{ color: '#25D366', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <i className="ti ti-brand-whatsapp" style={{ fontSize: 12 }} /> {phone}
                      </a>
                    : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><i className="ti ti-phone" style={{ fontSize: 12 }} /> {phone}</span>
                )}
                {p.email && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <i className="ti ti-mail" style={{ fontSize: 12, flexShrink: 0 }} /> {p.email}
                  </span>
                )}
                {p.address && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <i className="ti ti-map-pin" style={{ fontSize: 12, flexShrink: 0 }} /> {p.address}
                  </span>
                )}
              </div>
            )}

            {createOpen && quickCreateEnabled && (
              <PartyQuickCreateForm
                key={qcName}
                initialName={qcName}
                isPurchase={isPurchase}
                partyTypes={partyTypes}
                creatingParty={creatingParty}
                onCancel={() => setCreateOpen(false)}
                onSubmit={(p) => { setCreateOpen(false); onQuickCreateParty!(p); }}
              />
            )}

            <PartyBalanceBadge
              balance={partyBalance}
              isLoading={isLoadingBalance}
              partyLabel={isPurchase ? 'المورد' : 'الزبون'}
            />

            {p && creditLimit > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{
                  height: 5, borderRadius: 999, background: 'var(--bg3)', overflow: 'hidden',
                  border: `1px solid ${overCredit ? 'var(--red)' : 'var(--b1)'}`,
                }}>
                  <span style={{
                    display: 'block', height: '100%', width: `${creditUsed}%`,
                    background: overCredit ? 'var(--red)' : 'var(--em)', borderRadius: 999,
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: 'var(--t4)' }}>
                  <span>سقف الائتمان <b style={{ color: 'var(--t2)' }}>{fmtDZD(creditLimit)}</b></span>
                  <span style={{ color: overCredit ? 'var(--red)' : 'var(--t4)' }}>
                    متبقّي {fmtDZD(Math.max(0, creditLimit - balance))}
                  </span>
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

            {/* تاريخ المستند */}
            <div style={segCard}>
              <div style={segHeader()}>
                <i className="ti ti-calendar" />
                <span>تاريخ المستند</span>
              </div>
              <input
                type="date"
                style={fieldInputStyle(isReadOnly, !!errors.document_date)}
                value={form.document_date as string}
                disabled={isReadOnly}
                onChange={(e) => set('document_date', e.target.value)}
              />
              <FieldError msg={errors.document_date} />
            </div>

            {/* المستودع */}
            <div style={segCard}>
              <div style={segHeader()}>
                <i className="ti ti-building-warehouse" />
                <span>المستودع</span>
              </div>
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
                {warehouses.map((w) => (
                  <option key={String(w.id)} value={String(w.id)}>
                    {String(w.name)}{w.is_default ? ' ★' : ''}
                  </option>
                ))}
              </select>
              <FieldError msg={errors.warehouse_id} />
            </div>

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
    );
  }

  // ── شريط الأدوات أحادي السطر (نمط POS Pro) ──────────────────────────────
  if (variant === 'toolbar') {
    if (collapsed) {
      return (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: `4px ${bandPad}px`, background: 'var(--bg2)',
          border: '1px solid var(--b1)', borderRadius: 'var(--r2)',
          flexWrap: 'wrap', minHeight: 30,
        }}>
          <button
            type="button"
            onClick={onToggleCollapse}
            title="توسيع الشريط"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 24, height: 24, flexShrink: 0,
              borderRadius: 'var(--r1)',
              border: '1px solid var(--b1)', background: 'var(--bg1)',
              color: 'var(--em)', cursor: 'pointer', fontSize: 12,
            }}
          >
            <i className="ti ti-chevrons-down" />
          </button>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '2px 7px', borderRadius: 999,
            background: 'var(--emb)', border: '1px solid var(--embo)',
            color: 'var(--em)', fontSize: 10.5, fontWeight: 700,
          }}>
            <i className="ti ti-file-description" style={{ fontSize: 11 }} />
            {docCode}{isEdit && docNumber ? ` · ${docNumber}` : ''}
          </span>
          {ttcLabel && (
            <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--em)', fontVariantNumeric: 'tabular-nums' }}>
              {ttcLabel}
            </span>
          )}
        </div>
      );
    }
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: `${bandPad}px ${bandPad}px`, background: 'var(--bg2)',
        border: '1px solid var(--b1)', borderRadius: 'var(--r2)',
        flexWrap: 'wrap',
      }}>
        {/* رقم المستند (تعديل فقط) */}
        {isEdit && (
          <div style={{ ...segCard, flex: '1 1 150px', minWidth: 130 }}>
            <div style={segHeader()}>
              <i className="ti ti-file-description" />
              <span>رقم المستند</span>
            </div>
            <div style={{ position: 'relative' }}>
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

        {/* التاريخ */}
        <div style={{ ...segCard, flex: '1 1 145px', minWidth: 130 }}>
          <div style={segHeader()}>
            <i className="ti ti-calendar" />
            <span>تاريخ المستند</span>
          </div>
          <input
            type="date"
            style={{
              ...fieldInputStyle(isReadOnly, !!errors.document_date),
              paddingTop: 5, paddingBottom: 5,
            }}
            value={form.document_date as string}
            disabled={isReadOnly}
            onChange={(e) => set('document_date', e.target.value)}
          />
          <FieldError msg={errors.document_date} />
        </div>

        {/* المستودع */}
        <div style={{ ...segCard, flex: '1 1 165px', minWidth: 140 }}>
          <div style={segHeader()}>
            <i className="ti ti-building-warehouse" />
            <span>المستودع</span>
          </div>
          <select
            style={{
              ...fieldInputStyle(isReadOnly, !!errors.warehouse_id),
              paddingTop: 5, paddingBottom: 5,
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
            {warehouses.map((w) => (
              <option key={String(w.id)} value={String(w.id)}>
                {String(w.name)}{w.is_default ? ' ★' : ''}
              </option>
            ))}
          </select>
          <FieldError msg={errors.warehouse_id} />
        </div>

        {/* فئة السعر */}
        {!isPurchase && priceLevelOptions.length > 0 && (
          <div style={{ ...segCard, flex: '1 1 150px', minWidth: 140 }}>
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

        {collapseBtn()}

        <div style={{ flex: 1 }} />
        {ttcLabel && (
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--em)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
            {ttcLabel}
          </span>
        )}
      </div>
    );
  }

  // ── التخطيط القديم (شبكة بطاقات كاملة) ──────────────────────────────────
  const collapseBtnCards = (
    <button
      type="button"
      onClick={onToggleCollapse}
      title={collapsed ? 'توسيع الشريط' : 'طي الشريط'}
      style={{
        alignSelf: 'flex-start',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28, flexShrink: 0,
        borderRadius: 'var(--r2)',
        border: '1px solid var(--b1)', background: 'var(--bg1)',
        color: 'var(--t4)', cursor: 'pointer', fontSize: 13,
      }}
    >
      <i className={`ti ti-chevrons-${collapsed ? 'down' : 'up'}`} />
    </button>
  );

  if (collapsed) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: `5px ${bandPad}px`, background: 'var(--bg2)',
        borderBottom: '1px solid var(--b1)', flexWrap: 'wrap', minHeight: 36,
      }}>
        <button
          type="button"
          onClick={onToggleCollapse}
          title="توسيع الشريط"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 26, height: 26, flexShrink: 0,
            borderRadius: 'var(--r2)',
            border: '1px solid var(--b1)', background: 'var(--bg1)',
            color: 'var(--em)', cursor: 'pointer', fontSize: 13,
          }}
        >
          <i className="ti ti-chevrons-down" />
        </button>
        <span className="chip-band" style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '3px 8px', borderRadius: 999,
          background: 'var(--emb)', border: '1px solid var(--embo)',
          color: 'var(--em)', fontSize: 11, fontWeight: 700,
        }}>
          <i className="ti ti-file-description" style={{ fontSize: 12 }} />
          {docCode}
          {isEdit && docNumber ? ` · ${docNumber}` : ''}
        </span>
        {needsParty && selectedParty && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 8px', borderRadius: 999,
            background: 'var(--bg1)', border: '1px solid var(--b2)',
            color: 'var(--t2)', fontSize: 11, fontWeight: 700,
            maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            <i className={`ti ${isPurchase ? 'ti-building-store' : 'ti-user'}`} style={{ fontSize: 12, color: 'var(--t4)' }} />
            {selectedParty.label}
          </span>
        )}
        <div style={{ flex: 1 }} />
        {ttcLabel && (
          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--em)', fontVariantNumeric: 'tabular-nums' }}>
            {ttcLabel}
          </span>
        )}
      </div>
    );
  }

  function collapseBtn() {
    return (
      <button
        type="button"
        onClick={onToggleCollapse}
        title="طي الشريط"
        style={{
          alignSelf: 'flex-start',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 28, height: 28, flexShrink: 0,
          borderRadius: 'var(--r2)',
          border: '1px solid var(--b1)', background: 'var(--bg1)',
          color: 'var(--t4)', cursor: 'pointer', fontSize: 13,
        }}
      >
        <i className="ti ti-chevrons-up" />
      </button>
    );
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8,
      padding: `${bandPad}px ${bandPad}px`, background: 'var(--bg2)',
      borderBottom: '1px solid var(--b1)', flexWrap: 'wrap',
    }}>
      {/* ── رقم المستند (تعديل فقط) ─────────────────────────────── */}
      {isEdit && (
        <div style={{ ...segCard, flex: '1 1 150px' }}>
          <div style={segHeader()}>
            <i className="ti ti-file-description" />
            <span>رقم المستند</span>
          </div>
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

      {/* ── المتعامل ─────────────────────────────────────────────── */}
      {needsParty && (
        <div style={{
          ...segCard,
          flex: narrow ? '2 1 260px' : '2 1 320px',
          gridColumn: 'span 2',
        }}>
          <div style={segHeader()}>
            <i className={`ti ${isPurchase ? 'ti-building-store' : 'ti-user'}`} />
            <span>{isPurchase ? 'المورد' : 'الزبون'}</span>
          </div>
          <ComboBox
            id="doc-party-select"
            options={partyOptions}
            value={form.party_id as string}
            onChange={handlePartyChangeWithWarning}
            placeholder={`— ابحث عن ${isPurchase ? 'مورد' : 'زبون'} —`}
            disabled={isReadOnly}
            error={!!errors.party_id}
            showCreate={quickCreateEnabled}
            createLabel={isPurchase ? 'مورد' : 'زبون'}
            onCreate={openCreate}
          />
          <FieldError msg={errors.party_id} />

          {createOpen && quickCreateEnabled && (
            <PartyQuickCreateForm
              key={qcName}
              initialName={qcName}
              isPurchase={isPurchase}
              partyTypes={partyTypes}
              creatingParty={creatingParty}
              onCancel={() => setCreateOpen(false)}
              onSubmit={(p) => { setCreateOpen(false); onQuickCreateParty!(p); }}
            />
          )}

          <PartyBalanceBadge
            balance={partyBalance}
            isLoading={isLoadingBalance}
            partyLabel={isPurchase ? 'المورد' : 'الزبون'}
          />
        </div>
      )}

      {/* ── التاريخ ───────────────────────────────────────────────── */}
      <div style={{ ...segCard, flex: '1 1 145px' }}>
        <div style={segHeader()}>
          <i className="ti ti-calendar" />
          <span>تاريخ المستند</span>
        </div>
        <input
          type="date"
          style={fieldInputStyle(isReadOnly, !!errors.document_date)}
          value={form.document_date as string}
          disabled={isReadOnly}
          onChange={(e) => set('document_date', e.target.value)}
        />
        <FieldError msg={errors.document_date} />
      </div>

      {/* ── المستودع ──────────────────────────────────────────────── */}
      <div style={{ ...segCard, flex: '1 1 165px' }}>
        <div style={segHeader()}>
          <i className="ti ti-building-warehouse" />
          <span>المستودع</span>
        </div>
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
          {warehouses.map((w) => (
            <option key={String(w.id)} value={String(w.id)}>
              {String(w.name)}{w.is_default ? ' ★' : ''}
            </option>
          ))}
        </select>
        <FieldError msg={errors.warehouse_id} />
      </div>

      {/* ── فئة السعر ────────────────────────────────────────────── */}
      {!isPurchase && priceLevelOptions.length > 0 && (
        <div style={{ ...segCard, flex: '1 1 150px' }}>
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
          {isLinesReadOnly && (
            <div style={{ fontSize: 10.5, color: 'var(--t4)' }}>
              فئة السعر محمية — الأسطر معتمدة
            </div>
          )}
        </div>
      )}

      {collapseBtnCards}
    </div>
  );
}
