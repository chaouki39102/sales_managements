// ════════════════════════════════════════════════
// resources/js/pages/documents/CommercialDocumentModal.tsx
// Modal إنشاء/تعديل المستند التجاري — احترافي متكامل
// ════════════════════════════════════════════════
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import { useFiscalYear } from '@/context/FiscalYearContext';
import type { DocumentType } from '@/types';

// ── Algerian fiscal stamp rules (LF 2024) ─────
function calcFiscalStamp(totalTtc: number): number {
  if (totalTtc <= 0) return 0;
  if (totalTtc < 30_000) return 0;
  return Math.min(Math.ceil(totalTtc * 0.01), 2_500); // 1% سقف 2500 دج
}

// ── Types ──────────────────────────────────────
interface LineItem {
  id?:                   number;
  product_variant_id:    string;
  description:           string;
  quantity:              number;
  unit_price_ht:         number;
  discount_percentage:   number;
  tva_rate:              number;
  _variantName?:         string;
  _productName?:         string;
  _unitSymbol?:          string;
}

interface FormState {
  party_id:       string;
  document_date:  string;
  due_date:       string;
  notes:          string;
  warehouse_id:   string;
  fiscal_year_id: string;
  currency_id:    string;
  exchange_rate:  string;
  apply_stamp:    boolean;
  lines:          LineItem[];
}

// ── Helpers ────────────────────────────────────
function inpStyle(err?: boolean): React.CSSProperties {
  return {
    width: '100%', boxSizing: 'border-box',
    padding: '8px 12px', borderRadius: 'var(--r2)',
    border: `1px solid ${err ? 'var(--red)' : 'var(--b3)'}`,
    background: 'var(--bg1)', color: 'var(--t1)',
    fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none',
  };
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--t3)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }}>
      {children}
      {required && <span style={{ color: 'var(--red)', marginRight: 3 }}>*</span>}
    </label>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
        paddingBottom: 8, borderBottom: '1px solid var(--b1)',
      }}>
        <i className={`ti ${icon}`} style={{ color: 'var(--em)', fontSize: 15 }} />
        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

// ════════════════════════════════════════════════
// Modal Component
// ════════════════════════════════════════════════
interface Props {
  open:              boolean;
  documentType:      DocumentType | null;
  existingDocument?: any;
  onClose:           () => void;
  onSaved:           () => void;
}

export default function CommercialDocumentModal({ open, documentType, existingDocument, onClose, onSaved }: Props) {
  const isEdit   = !!existingDocument;
  const qc       = useQueryClient();
  const { selectedYear } = useFiscalYear() as any;
  const isPurch  = documentType?.document_base_operation_id === 2;
  const needsParty = documentType?.requires_party !== false;
  const affects_stock = documentType?.affects_stock_direction !== 0;

  // ── Dependencies ──────────────────────────────
  const { data: parties = [] } = useQuery({
    queryKey: ['parties-select', isPurch],
    queryFn:  () => apiClient.get(isPurch ? '/suppliers' : '/customers', { params: { per_page: 500 } })
      .then(r => extractList(r.data)),
    enabled: open && needsParty,
    staleTime: 60_000,
  });
  const { data: variants = [] } = useQuery({
    queryKey: ['variants-select'],
    queryFn:  () => apiClient.get('/product-variants', { params: { per_page: 500, include: 'product,product.unit' } })
      .then(r => extractList(r.data)),
    enabled: open,
    staleTime: 60_000,
  });
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses-select'],
    queryFn:  () => apiClient.get('/warehouses', { params: { per_page: 100 } })
      .then(r => extractList(r.data)),
    enabled: open,
    staleTime: 120_000,
  });
  const { data: currencies = [] } = useQuery({
    queryKey: ['currencies-select'],
    queryFn:  () => apiClient.get('/currencies', { params: { per_page: 50 } })
      .then(r => extractList(r.data)),
    enabled: open,
    staleTime: 300_000,
  });
  const { data: fiscalYears = [] } = useQuery({
    queryKey: ['fiscal-years-select'],
    queryFn:  () => apiClient.get('/fiscal-years', { params: { per_page: 20, 'filter[is_closed]': 0 } })
      .then(r => extractList(r.data)),
    enabled: open,
    staleTime: 60_000,
  });
  const { data: tvaRates = [] } = useQuery({
    queryKey: ['tvas-select'],
    queryFn:  () => apiClient.get('/tvas', { params: { per_page: 20 } })
      .then(r => extractList(r.data)),
    enabled: open,
    staleTime: 300_000,
  });

  // ── Form state ────────────────────────────────
  const baseCurrency = currencies.find((c: any) => c.is_base_currency) ?? currencies[0];
  const defaultWh    = warehouses[0];

  const [form,    setForm]    = useState<FormState>(buildDefault());
  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [apiErr,  setApiErr]  = useState('');
  const [lineErr, setLineErr] = useState('');

  function buildDefault(): FormState {
    if (existingDocument) {
      return {
        party_id:       String(existingDocument.party_id       ?? ''),
        document_date:  existingDocument.document_date         ?? today(),
        due_date:       existingDocument.due_date              ?? '',
        notes:          existingDocument.notes                 ?? '',
        warehouse_id:   String(existingDocument.warehouse_id   ?? ''),
        fiscal_year_id: String(existingDocument.fiscal_year_id ?? ''),
        currency_id:    String(existingDocument.currency_id    ?? ''),
        exchange_rate:  String(existingDocument.exchange_rate  ?? '1'),
        apply_stamp:    parseFloat(existingDocument.total_stamp ?? 0) > 0,
        lines:          (existingDocument.lines ?? []).map((l: any) => ({
          id:                  l.id,
          product_variant_id:  String(l.product_variant_id ?? ''),
          description:         l.description ?? '',
          quantity:            parseFloat(l.quantity) || 1,
          unit_price_ht:       parseFloat(l.unit_price_ht) || 0,
          discount_percentage: parseFloat(l.discount_percentage) || 0,
          tva_rate:            parseFloat(l.tva_rate) || 19,
          _productName:        l.product_variant?.product?.name,
          _variantName:        l.product_variant?.variant_name,
        })),
      };
    }
    return {
      party_id:       '',
      document_date:  today(),
      due_date:       '',
      notes:          '',
      warehouse_id:   '',
      fiscal_year_id: String(selectedYear?.id ?? ''),
      currency_id:    '',
      exchange_rate:  '1',
      apply_stamp:    false,
      lines:          [],
    };
  }

  // fill defaults when dependencies load
  useEffect(() => {
    if (!isEdit) {
      setForm(f => ({
        ...f,
        warehouse_id:   f.warehouse_id   || String(defaultWh?.id   ?? ''),
        currency_id:    f.currency_id    || String(baseCurrency?.id ?? ''),
        fiscal_year_id: f.fiscal_year_id || String(selectedYear?.id ?? ''),
      }));
    }
  }, [warehouses, currencies, selectedYear]);

  useEffect(() => {
    if (open) { setForm(buildDefault()); setErrors({}); setApiErr(''); setLineErr(''); }
  }, [open, existingDocument?.id]);

  const set = (k: keyof FormState, v: any) => setForm(f => ({ ...f, [k]: v }));

  // ── Line helpers ──────────────────────────────
  function addLine() {
    const defaultTva = tvaRates.find((t: any) => t.is_default)?.rate ?? 19;
    setForm(f => ({
      ...f,
      lines: [...f.lines, {
        product_variant_id: '', description: '',
        quantity: 1, unit_price_ht: 0,
        discount_percentage: 0, tva_rate: defaultTva,
      }],
    }));
    setLineErr('');
  }

  function updateLine(idx: number, field: keyof LineItem, value: any) {
    setForm(f => {
      const lines = [...f.lines];
      lines[idx] = { ...lines[idx], [field]: value };

      // auto-fill product info
      if (field === 'product_variant_id' && value) {
        const v = variants.find((vr: any) => String(vr.id) === String(value));
        if (v) {
          lines[idx]._productName = v.product?.name ?? '';
          lines[idx]._variantName = v.variant_name  ?? '';
          lines[idx]._unitSymbol  = v.product?.unit?.symbol ?? '';
          // auto fill price from product variant
          if (!lines[idx].unit_price_ht || lines[idx].unit_price_ht === 0) {
            lines[idx].unit_price_ht = parseFloat(v.price_ht ?? v.prix_detail ?? 0);
          }
          // auto fill tva
          if (v.tva_rate) lines[idx].tva_rate = parseFloat(v.tva_rate);
        }
      }
      return { ...f, lines };
    });
  }

  function removeLine(idx: number) {
    setForm(f => ({ ...f, lines: f.lines.filter((_, i) => i !== idx) }));
  }

  // ── Totals ────────────────────────────────────
  const totals = useMemo(() => {
    let ht = 0, tva = 0, discount = 0;
    form.lines.forEach(l => {
      const gross = (l.unit_price_ht || 0) * (l.quantity || 0);
      const disc  = gross * ((l.discount_percentage || 0) / 100);
      const net   = gross - disc;
      ht       += net;
      tva      += net * ((l.tva_rate || 0) / 100);
      discount += disc;
    });
    const ttc   = ht + tva;
    const stamp = form.apply_stamp ? calcFiscalStamp(ttc) : 0;
    return { ht, tva, ttc, discount, stamp, netToPay: ttc + stamp };
  }, [form.lines, form.apply_stamp]);

  // ── Validation ────────────────────────────────
  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (needsParty && !form.party_id) errs.party_id = 'هذا الحقل إلزامي';
    if (!form.document_date)           errs.document_date = 'هذا الحقل إلزامي';
    if (!form.warehouse_id)            errs.warehouse_id = 'اختر مستودعاً';
    if (!form.fiscal_year_id)          errs.fiscal_year_id = 'اختر السنة المالية';
    if (!form.currency_id)             errs.currency_id = 'اختر العملة';
    if (form.lines.length === 0) {
      setLineErr('يجب إضافة سطر واحد على الأقل');
      return false;
    }
    for (let i = 0; i < form.lines.length; i++) {
      if (!form.lines[i].product_variant_id) {
        setLineErr(`السطر ${i + 1}: اختر منتجاً`);
        return false;
      }
      if (!form.lines[i].quantity || form.lines[i].quantity <= 0) {
        setLineErr(`السطر ${i + 1}: الكمية يجب أن تكون أكبر من صفر`);
        return false;
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Save ──────────────────────────────────────
  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        document_type_id: documentType?.id,
        party_id:         needsParty && form.party_id ? parseInt(form.party_id) : null,
        warehouse_id:     parseInt(form.warehouse_id),
        fiscal_year_id:   parseInt(form.fiscal_year_id),
        currency_id:      parseInt(form.currency_id),
        exchange_rate:    parseFloat(form.exchange_rate) || 1,
        document_date:    form.document_date,
        due_date:         form.due_date || null,
        notes:            form.notes || null,
        total_discount:   totals.discount,
        total_stamp:      totals.stamp,
        lines: form.lines.map(l => ({
          ...(l.id ? { id: l.id } : {}),
          product_variant_id:  parseInt(l.product_variant_id),
          description:         l.description || null,
          quantity:            l.quantity,
          unit_price_ht:       l.unit_price_ht,
          tva_rate:            l.tva_rate,
          discount_percentage: l.discount_percentage || 0,
        })),
      };
      if (isEdit)
        return apiClient.put(`/commercial-documents/${existingDocument.id}`, payload);
      return apiClient.post('/commercial-documents', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['commercial-documents'] });
      onSaved();
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message ?? e?.response?.data?.errors
        ? Object.values(e.response.data.errors).flat().join(' | ')
        : 'فشل الحفظ';
      setApiErr(String(msg));
    },
  });

  function handleSave() {
    setApiErr('');
    if (validate()) saveMut.mutate();
  }

  if (!open) return null;

  // ── Render ─────────────────────────────────────
  const isPending = saveMut.isPending;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '20px 16px', overflowY: 'auto',
    }} onClick={onClose}>
      <div style={{
        width: '100%', maxWidth: 920,
        background: 'var(--bg1)', borderRadius: 'var(--r3)',
        boxShadow: '0 24px 64px rgba(0,0,0,.25)',
        display: 'flex', flexDirection: 'column',
      }} onClick={e => e.stopPropagation()}>

        {/* ── Header ─────────────────────────── */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--b1)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg2)', borderRadius: 'var(--r3) var(--r3) 0 0',
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--t1)' }}>
              {isEdit ? `تعديل ${documentType?.name}` : `${documentType?.name} جديد`}
            </div>
            {documentType?.name_latin && (
              <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>
                {documentType.name_latin} — {documentType.code}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{
            width: 30, height: 30, borderRadius: 8,
            border: '1px solid var(--b2)', background: 'var(--bg1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--t3)',
          }}>
            <i className="ti ti-x" style={{ fontSize: 14 }} />
          </button>
        </div>

        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>

          {/* API Error */}
          {apiErr && (
            <div style={{
              padding: '10px 14px', marginBottom: 16, borderRadius: 'var(--r2)',
              background: 'var(--redb)', border: '1px solid var(--redbo)',
              color: 'var(--red)', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center',
            }}>
              <i className="ti ti-alert-circle" />{apiErr}
            </div>
          )}

          {/* ── Section: الأساسيات ─────────────── */}
          <Section title="معلومات المستند" icon="ti-file-description">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>

              {needsParty && (
                <div style={{ gridColumn: 'span 2' }}>
                  <Label required>{isPurch ? 'المورد' : 'الزبون'}</Label>
                  <select
                    value={form.party_id}
                    onChange={e => set('party_id', e.target.value)}
                    style={{ ...inpStyle(!!errors.party_id), cursor: 'pointer' }}
                  >
                    <option value="">— اختر {isPurch ? 'مورداً' : 'زبوناً'} —</option>
                    {parties.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  {errors.party_id && <div style={{ color: 'var(--red)', fontSize: 11, marginTop: 3 }}>{errors.party_id}</div>}
                </div>
              )}

              <div>
                <Label required>تاريخ المستند</Label>
                <input type="date" style={inpStyle(!!errors.document_date)}
                  value={form.document_date} onChange={e => set('document_date', e.target.value)} />
              </div>
              <div>
                <Label>تاريخ الاستحقاق</Label>
                <input type="date" style={inpStyle()}
                  value={form.due_date} onChange={e => set('due_date', e.target.value)} />
              </div>
              <div>
                <Label required>المستودع</Label>
                <select style={{ ...inpStyle(!!errors.warehouse_id), cursor: 'pointer' }}
                  value={form.warehouse_id} onChange={e => set('warehouse_id', e.target.value)}>
                  <option value="">— اختر —</option>
                  {warehouses.map((w: any) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label required>السنة المالية</Label>
                <select style={{ ...inpStyle(!!errors.fiscal_year_id), cursor: 'pointer' }}
                  value={form.fiscal_year_id} onChange={e => set('fiscal_year_id', e.target.value)}>
                  <option value="">— اختر —</option>
                  {fiscalYears.map((fy: any) => (
                    <option key={fy.id} value={fy.id}>
                      {fy.name} {fy.is_current ? '★' : ''}{fy.is_closed ? ' (مقفلة)' : ''}
                    </option>
                  ))}
                </select>
                {errors.fiscal_year_id && <div style={{ color: 'var(--red)', fontSize: 11, marginTop: 3 }}>{errors.fiscal_year_id}</div>}
              </div>
              <div>
                <Label required>العملة</Label>
                <select style={{ ...inpStyle(!!errors.currency_id), cursor: 'pointer' }}
                  value={form.currency_id} onChange={e => set('currency_id', e.target.value)}>
                  <option value="">— اختر —</option>
                  {currencies.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>سعر الصرف</Label>
                <input type="number" step="0.0001" min="0" style={inpStyle()}
                  value={form.exchange_rate}
                  onChange={e => set('exchange_rate', e.target.value)} />
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <Label>ملاحظات</Label>
              <textarea style={{ ...inpStyle(), resize: 'vertical' }} rows={2}
                value={form.notes}
                placeholder="ملاحظات اختيارية..."
                onChange={e => set('notes', e.target.value)} />
            </div>
          </Section>

          {/* ── Section: الأسطر ────────────────── */}
          <Section title="أسطر المستند" icon="ti-list-details">
            {lineErr && (
              <div style={{
                padding: '8px 12px', marginBottom: 10, borderRadius: 'var(--r2)',
                background: 'var(--redb)', color: 'var(--red)',
                fontSize: 12.5, display: 'flex', gap: 6, alignItems: 'center',
              }}>
                <i className="ti ti-alert-circle" />{lineErr}
              </div>
            )}

            <div className="tw" style={{ marginBottom: 10 }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>#</th>
                    <th style={{ minWidth: 180 }}>المنتج</th>
                    <th style={{ width: 80 }}>الكمية</th>
                    <th style={{ width: 110 }}>سعر HT</th>
                    <th style={{ width: 80 }}>خصم %</th>
                    <th style={{ width: 80 }}>TVA %</th>
                    <th style={{ width: 120, textAlign: 'left' }}>إجمالي TTC</th>
                    <th style={{ width: 36 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {form.lines.map((line, idx) => {
                    const gross  = (line.unit_price_ht || 0) * (line.quantity || 0);
                    const disc   = gross * ((line.discount_percentage || 0) / 100);
                    const net    = gross - disc;
                    const lineTtc = net + net * ((line.tva_rate || 0) / 100);
                    return (
                      <tr key={idx}>
                        <td style={{ color: 'var(--t4)', fontSize: 11, textAlign: 'center' }}>{idx + 1}</td>
                        <td>
                          <select
                            value={line.product_variant_id}
                            onChange={e => updateLine(idx, 'product_variant_id', e.target.value)}
                            style={{ width: '100%', padding: '5px 8px', borderRadius: 'var(--r1)', border: '1px solid var(--b3)', background: 'var(--bg1)', color: 'var(--t1)', fontSize: 12, fontFamily: 'Tajawal, sans-serif', outline: 'none' }}
                          >
                            <option value="">— اختر منتجاً —</option>
                            {variants.map((v: any) => (
                              <option key={v.id} value={v.id}>
                                {v.product?.name ?? v.name}{v.variant_name ? ` — ${v.variant_name}` : ''}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input type="number" min="0" step="0.001"
                            value={line.quantity}
                            onChange={e => updateLine(idx, 'quantity', parseFloat(e.target.value) || 0)}
                            style={{ width: '100%', padding: '5px 8px', borderRadius: 'var(--r1)', border: '1px solid var(--b3)', background: 'var(--bg1)', color: 'var(--t1)', fontSize: 12, fontFamily: 'Tajawal, sans-serif', outline: 'none', textAlign: 'center' }}
                          />
                        </td>
                        <td>
                          <input type="number" min="0" step="0.01"
                            value={line.unit_price_ht}
                            onChange={e => updateLine(idx, 'unit_price_ht', parseFloat(e.target.value) || 0)}
                            style={{ width: '100%', padding: '5px 8px', borderRadius: 'var(--r1)', border: '1px solid var(--b3)', background: 'var(--bg1)', color: 'var(--t1)', fontSize: 12, fontFamily: 'Tajawal, sans-serif', outline: 'none', textAlign: 'right', direction: 'ltr' }}
                          />
                        </td>
                        <td>
                          <input type="number" min="0" max="100" step="0.01"
                            value={line.discount_percentage}
                            onChange={e => updateLine(idx, 'discount_percentage', parseFloat(e.target.value) || 0)}
                            style={{ width: '100%', padding: '5px 8px', borderRadius: 'var(--r1)', border: '1px solid var(--b3)', background: 'var(--bg1)', color: 'var(--t1)', fontSize: 12, fontFamily: 'Tajawal, sans-serif', outline: 'none', textAlign: 'center' }}
                          />
                        </td>
                        <td>
                          <select
                            value={line.tva_rate}
                            onChange={e => updateLine(idx, 'tva_rate', parseFloat(e.target.value))}
                            style={{ width: '100%', padding: '5px 4px', borderRadius: 'var(--r1)', border: '1px solid var(--b3)', background: 'var(--bg1)', color: 'var(--t1)', fontSize: 12, fontFamily: 'Tajawal, sans-serif', outline: 'none' }}
                          >
                            {tvaRates.length > 0
                              ? tvaRates.map((t: any) => (
                                  <option key={t.id} value={t.rate}>{t.rate}%</option>
                                ))
                              : [0, 9, 19].map(r => <option key={r} value={r}>{r}%</option>)
                            }
                          </select>
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--em)', direction: 'ltr', textAlign: 'right', fontSize: 13 }}>
                          {lineTtc.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td>
                          <button
                            onClick={() => removeLine(idx)}
                            style={{
                              width: 26, height: 26, borderRadius: 6, cursor: 'pointer',
                              border: '1px solid color-mix(in srgb, var(--red) 30%, transparent)',
                              background: 'color-mix(in srgb, var(--red) 8%, transparent)',
                              color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            <i className="ti ti-trash" style={{ fontSize: 12 }} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <button
              onClick={addLine}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 'var(--r2)',
                border: '1px dashed var(--b3)', background: 'transparent',
                color: 'var(--em)', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
                transition: 'all .15s',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'color-mix(in srgb, var(--em) 6%, transparent)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <i className="ti ti-plus" style={{ fontSize: 14 }} />
              إضافة سطر
            </button>
          </Section>

          {/* ── Section: المجاميع ──────────────── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>

            {/* Stamp toggle */}
            <div style={{
              padding: '12px 16px', borderRadius: 'var(--r2)',
              background: 'var(--bg2)', border: '1px solid var(--b1)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>الطابع الجبائي</div>
                <div style={{ fontSize: 11, color: 'var(--t4)' }}>
                  {totals.ttc >= 30_000
                    ? `1% من TTC — سقف 2500 دج`
                    : 'يُطبَّق للمبالغ ≥ 30,000 دج'}
                </div>
              </div>
              <div
                onClick={() => set('apply_stamp', !form.apply_stamp)}
                style={{
                  width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
                  background: form.apply_stamp ? 'var(--em)' : 'var(--b2)',
                  position: 'relative', transition: 'background .2s',
                  flexShrink: 0,
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 3,
                  left: form.apply_stamp ? 'calc(100% - 21px)' : 3,
                  transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,.2)',
                }} />
              </div>
            </div>

            {/* Totals box */}
            <div style={{ minWidth: 300, display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[
                { label: 'إجمالي HT',     value: totals.ht,       color: 'var(--t2)' },
                { label: 'TVA',             value: totals.tva,      color: 'var(--t3)' },
                totals.discount > 0 ? { label: 'إجمالي الخصم', value: -totals.discount, color: 'var(--red)' } : null,
                totals.stamp > 0    ? { label: 'الطابع الجبائي',value: totals.stamp,   color: 'var(--orange)' } : null,
              ].filter(Boolean).map((row: any) => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--t3)' }}>{row.label}</span>
                  <span style={{ color: row.color, fontWeight: 600, direction: 'ltr' }}>
                    {row.value < 0
                      ? `-${Math.abs(row.value).toLocaleString('fr-DZ', { minimumFractionDigits: 2 })}`
                      : row.value.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })
                    } دج
                  </span>
                </div>
              ))}
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                paddingTop: 10, marginTop: 4, borderTop: '2px solid var(--b2)',
                fontSize: 16, fontWeight: 800,
              }}>
                <span style={{ color: 'var(--t1)' }}>الإجمالي TTC</span>
                <span style={{ color: 'var(--em)', direction: 'ltr' }}>
                  {totals.netToPay.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} دج
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ─────────────────────────── */}
        <div style={{
          padding: '14px 20px', borderTop: '1px solid var(--b1)',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
          background: 'var(--bg2)', borderRadius: '0 0 var(--r3) var(--r3)',
        }}>
          <button onClick={onClose} disabled={isPending} style={{
            padding: '8px 20px', borderRadius: 'var(--r2)',
            border: '1px solid var(--b3)', background: 'var(--bg1)',
            color: 'var(--t2)', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
          }}>
            إلغاء
          </button>
          <button onClick={handleSave} disabled={isPending} style={{
            padding: '8px 24px', borderRadius: 'var(--r2)',
            border: 'none', background: isPending ? 'var(--b2)' : 'var(--em)',
            color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: isPending ? 'not-allowed' : 'pointer',
            fontFamily: 'Tajawal, sans-serif',
            display: 'flex', alignItems: 'center', gap: 7,
            transition: 'all .15s',
          }}>
            {isPending
              ? <i className="ti ti-loader-2" style={{ animation: 'spin .8s linear infinite' }} />
              : <i className={`ti ${isEdit ? 'ti-check' : 'ti-plus'}`} />}
            {isPending ? 'جارٍ الحفظ...' : isEdit ? 'حفظ التعديلات' : 'إنشاء المستند'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Utils ──────────────────────────────────────
function extractList(data: any): any[] {
  if (Array.isArray(data?.data))        return data.data;
  if (Array.isArray(data?.data?.data))  return data.data.data;
  if (Array.isArray(data))              return data;
  return [];
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}
