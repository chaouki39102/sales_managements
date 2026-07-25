import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';
import { useProductLots, useInventoryMutations } from '@/lib/api/endpoints/inventory';
import { useWarehouses } from '@/lib/api/endpoints/lookups';
import { useNotification } from '@/hooks/useNotification';
import { useConfirm } from '@/hooks/useConfirm';
import { useModal } from '@/hooks/useModal';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Skeleton from '@/components/ui/Skeleton';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import SearchInput from '@/components/ui/SearchInput';
import SimpleTable from '@/components/ui/SimpleTable';
import type { BackendMeta } from '@/hooks/usePagination';
import type { ProductLot } from '@/lib/api/core/types';

const fmtDate = (d?: string | null) => {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('ar-DZ', { year: 'numeric', month: '2-digit', day: '2-digit' });
};
const fmtNum = (n: number) => n.toLocaleString('fr-DZ');

function getLotStatus(lot: ProductLot) {
  const r = Number(lot.remaining_quantity ?? 0);
  if (r <= 0) return { label: '\u0641\u0627\u0631\u063a\u0629', variant: 'gray' as const, icon: 'ti-circle-x' };
  if (lot.expiration_date && new Date(lot.expiration_date).getTime() < Date.now())
    return { label: '\u0645\u0646\u062a\u0647\u064a\u0629', variant: 'danger' as const, icon: 'ti-alert-triangle' };
  if (lot.expiration_date && new Date(lot.expiration_date).getTime() - Date.now() < 30 * 86400000)
    return { label: '\u062a\u0646\u062a\u0647\u064a \u0642\u0631\u064a\u0628\u0627\u064b', variant: 'warning' as const, icon: 'ti-clock' };
  if (!lot.active) return { label: '\u063a\u064a\u0631 \u0646\u0634\u0637\u0629', variant: 'gray' as const, icon: 'ti-ban' };
  return { label: '\u0646\u0634\u0637\u0629', variant: 'success' as const, icon: 'ti-circle-check' };
}

interface LotFormData {
  lot_number: string; product_id: string; warehouse_id: string;
  manufacturing_date: string; expiration_date: string; purchase_date: string;
  purchase_price: string; legal_selling_price: string; margin_percentage: string;
  original_quantity: string; supplier_lot_number: string; active: boolean;
}

const emptyForm: LotFormData = {
  lot_number: '', product_id: '', warehouse_id: '',
  manufacturing_date: '', expiration_date: '', purchase_date: '',
  purchase_price: '', legal_selling_price: '', margin_percentage: '5',
  original_quantity: '', supplier_lot_number: '', active: true,
};

const inputCls: React.CSSProperties = {
  width: '100%', padding: '7px 10px', borderRadius: 'var(--r2)',
  border: '1px solid var(--b3)', background: 'var(--bg1)', color: 'var(--t1)',
  fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none', boxSizing: 'border-box',
};
const inputDisabledCls: React.CSSProperties = {
  ...inputCls, background: 'var(--bg3)', color: 'var(--t4)', cursor: 'not-allowed',
};
const inputErrorCls: React.CSSProperties = { ...inputCls, borderColor: 'var(--red)' };
const labelCls: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--t3)', marginBottom: 4, display: 'block' };
const sectionTitleCls: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase' as const,
  letterSpacing: 0.5, padding: '8px 0 4px', borderBottom: '1px solid var(--b1)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
};

export default function ProductLotsTab() {
  const slug = useActiveSlug();
  const _qc = useQueryClient();
  const { notify } = useNotification();
  const deleteConfirm = useConfirm();
  const createModal = useModal();
  const editModal = useModal();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<LotFormData>(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [editLot, setEditLot] = useState<ProductLot | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

  const { data, isLoading } = useProductLots({
    search: search || undefined, per_page: 15, page, include: 'product,warehouse',
  });

  const items = useMemo(() => {
    const raw = (data as unknown as { data?: ProductLot[] } | undefined)?.data
      ?? (Array.isArray(data) ? data : []) as ProductLot[];
    return raw;
  }, [data]);

  const meta = (data as unknown as { meta?: BackendMeta } | undefined)?.meta;
  const warehouses = useWarehouses();

  const { data: productsData } = useQuery({
    queryKey: [slug, 'products-mini'],
    queryFn: () => apiGet('/products', { per_page: 500, sort: 'name', active: 1 }),
    select: (r: any) => (r?.data ?? r ?? []) as { id: number; name: string; ref?: string }[],
    staleTime: 10 * 60_000, enabled: !!slug,
  });

  const mutations = useInventoryMutations();

  const stats = useMemo(() => ({
    total: meta?.total ?? items.length,
    active: items.filter(l => Number(l.remaining_quantity) > 0 && l.active).length,
    depleted: items.filter(l => Number(l.remaining_quantity) <= 0).length,
    expiring: items.filter(l => {
      if (!l.expiration_date) return false;
      const diff = new Date(l.expiration_date).getTime() - Date.now();
      return diff > 0 && diff < 30 * 86400000;
    }).length,
  }), [items, meta]);

  const openCreate = () => { setForm(emptyForm); setEditId(null); setEditLot(null); setFieldErrors({}); createModal.openModal(); };

  const openEdit = (lot: ProductLot) => {
    setForm({
      lot_number: lot.lot_number || '',
      product_id: String(lot.product_id ?? ''),
      warehouse_id: String(lot.warehouse_id ?? ''),
      manufacturing_date: lot.manufacturing_date?.slice(0, 10) ?? '',
      expiration_date: lot.expiration_date?.slice(0, 10) ?? '',
      purchase_date: lot.purchase_date?.slice(0, 10) ?? '',
      purchase_price: String(lot.purchase_price ?? ''),
      legal_selling_price: String(lot.legal_selling_price ?? ''),
      margin_percentage: String(lot.margin_percentage ?? '5'),
      original_quantity: String(lot.original_quantity ?? ''),
      supplier_lot_number: lot.supplier_lot_number ?? '',
      active: lot.active ?? true,
    });
    setEditId(lot.id);
    setEditLot(lot);
    setFieldErrors({});
    editModal.openModal();
  };

  const handleSave = async () => {
    const errors: Record<string, boolean> = {};
    if (!form.product_id) errors.product_id = true;
    if (!form.warehouse_id) errors.warehouse_id = true;
    if (!form.purchase_date) errors.purchase_date = true;
    if (!form.original_quantity || Number(form.original_quantity) <= 0) errors.original_quantity = true;
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      notify.error('\u064a\u0631\u062c\u0649 \u0645\u0644\u0621 \u062c\u0645\u064a\u0639 \u0627\u0644\u062d\u0642\u0648\u0644 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629');
      return;
    }
    const payload: Record<string, unknown> = {
      lot_number: form.lot_number || undefined,
      product_id: Number(form.product_id),
      warehouse_id: Number(form.warehouse_id),
      manufacturing_date: form.manufacturing_date || null,
      expiration_date: form.expiration_date || null,
      purchase_date: form.purchase_date,
      purchase_price: form.purchase_price ? Number(form.purchase_price) : 0,
      legal_selling_price: form.legal_selling_price ? Number(form.legal_selling_price) : 0,
      margin_percentage: form.margin_percentage ? Number(form.margin_percentage) : 5,
      original_quantity: Number(form.original_quantity),
      supplier_lot_number: form.supplier_lot_number || null,
      active: form.active,
    };
    try {
      if (editId) {
        await mutations.updateLot.mutateAsync({ id: editId, data: payload });
        notify.success('\u062a\u0645 \u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u062f\u0641\u0639\u0629 \u0628\u0646\u062c\u0627\u062d');
        editModal.closeModal();
      } else {
        await mutations.createLot.mutateAsync(payload);
        notify.success('\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062f\u0641\u0639\u0629 \u0628\u0646\u062c\u0627\u062d');
        createModal.closeModal();
      }
      setEditId(null); setEditLot(null); setForm(emptyForm); setFieldErrors({});
    } catch { notify.error(editId ? '\u0641\u0634\u0644 \u0627\u0644\u062a\u0639\u062f\u064a\u0644' : '\u0641\u0634\u0644 \u0627\u0644\u0625\u0646\u0634\u0627\u0621'); }
  };

  const handleDelete = async (id: number, lotNumber: string) => {
    if (await deleteConfirm.confirm(`\u062a\u0623\u0643\u064a\u062f \u062d\u0630\u0641 \u0627\u0644\u062f\u0641\u0639\u0629 ${lotNumber}?`)) {
      try { await mutations.deleteLot.mutateAsync(id); notify.success('\u062a\u0645 \u0627\u0644\u062d\u0630\u0641'); }
      catch { notify.error('\u0641\u0634\u0644 \u0627\u0644\u062d\u0630\u0641'); }
    }
  };

  const handlePriceChange = (field: 'purchase_price' | 'margin_percentage', value: string) => {
    setForm(f => {
      const u = { ...f, [field]: value };
      const price = parseFloat(u.purchase_price) || 0;
      const margin = parseFloat(u.margin_percentage) || 5;
      u.legal_selling_price = String(+(price * (1 + margin / 100)).toFixed(4));
      return u;
    });
  };

  const FormFields = () => {
    const isEdit = !!editId;
    const rem = editLot ? Number(editLot.remaining_quantity ?? 0) : 0;
    const orig = editLot ? Number(editLot.original_quantity ?? 0) : 0;
    const totalVal = editLot ? rem * Number(editLot.purchase_price ?? 0) : 0;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {isEdit && editLot && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
            background: 'var(--bg3)', borderRadius: 'var(--r2)', padding: '10px 12px',
            marginBottom: 4,
          }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--t4)', marginBottom: 2 }}>{"\u0627\u0644\u0643\u0645\u064a\u0629 \u0627\u0644\u0645\u062a\u0628\u0642\u064a\u0629"}</div>
              <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color: rem <= 0 ? 'var(--t4)' : 'var(--t1)' }}>{fmtNum(rem)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--t4)', marginBottom: 2 }}>{"\u0627\u0644\u0642\u064a\u0645\u0629 \u0627\u0644\u0645\u062a\u0628\u0642\u064a\u0629"}</div>
              <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color: 'var(--em)' }}>{fmtNum(totalVal)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--t4)', marginBottom: 2 }}>{"\u0646\u0633\u0628\u0629 \u0627\u0644\u0625\u0633\u062a\u062e\u062f\u0627\u0645"}</div>
              <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color: 'var(--t2)' }}>{fmtNum(orig - rem)} / {fmtNum(orig)}</div>
            </div>
          </div>
        )}

        <div style={sectionTitleCls}><i className="ti ti-id" />{"\u0627\u0644\u0647\u0648\u064a\u0629"}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={labelCls}>{"\u0631\u0642\u0645 \u0627\u0644\u062f\u0641\u0639\u0629"}</label>
            <input style={inputCls} placeholder={"\u064a\u062a\u0645 \u062a\u0648\u0644\u064a\u062f\u0647 \u062a\u0644\u0642\u0627\u0626\u064a\u0627\u064b"} value={form.lot_number}
              onChange={e => setForm(f => ({ ...f, lot_number: e.target.value }))} />
          </div>
          <div>
            <label style={labelCls}>{"\u0639\u062f\u062f \u0627\u0644\u0645\u0631\u062c\u0639"}</label>
            <input style={inputCls} value={form.supplier_lot_number}
              onChange={e => setForm(f => ({ ...f, supplier_lot_number: e.target.value }))} />
          </div>
          <div>
            <label style={labelCls}>{"\u0627\u0644\u0645\u0646\u062a\u062c *"}{fieldErrors.product_id && <span style={{ color: 'var(--red)', fontSize: 10 }}> {"\u2022 \u0645\u0637\u0644\u0648\u0628"}</span>}</label>
            <select style={fieldErrors.product_id ? inputErrorCls : (isEdit ? inputDisabledCls : inputCls)}
              value={form.product_id} disabled={isEdit}
              onChange={e => { setForm(f => ({ ...f, product_id: e.target.value })); setFieldErrors(er => ({ ...er, product_id: false })); }}>
              <option value="">{"\u0627\u062e\u062a\u0631 \u0645\u0646\u062a\u062c..."}</option>
              {(productsData ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.name}{p.ref ? ` (${p.ref})` : ''}</option>)}
            </select>
          </div>
          <div>
            <label style={labelCls}>{"\u0627\u0644\u0645\u0633\u062a\u0648\u062f\u0639 *"}{fieldErrors.warehouse_id && <span style={{ color: 'var(--red)', fontSize: 10 }}> {"\u2022 \u0645\u0637\u0644\u0648\u0628"}</span>}</label>
            <select style={fieldErrors.warehouse_id ? inputErrorCls : (isEdit ? inputDisabledCls : inputCls)}
              value={form.warehouse_id} disabled={isEdit}
              onChange={e => { setForm(f => ({ ...f, warehouse_id: e.target.value })); setFieldErrors(er => ({ ...er, warehouse_id: false })); }}>
              <option value="">{"\u0627\u062e\u062a\u0631 \u0645\u0633\u062a\u0648\u062f\u0639..."}</option>
              {(warehouses.data as any[] ?? []).map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
        </div>

        <div style={sectionTitleCls}><i className="ti ti-calendar" />{"\u0627\u0644\u062a\u0648\u0627\u0631\u064a\u062e"}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div>
            <label style={labelCls}>{"\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0635\u0646\u0639"}</label>
            <input style={inputCls} type="date" value={form.manufacturing_date}
              onChange={e => setForm(f => ({ ...f, manufacturing_date: e.target.value }))} />
          </div>
          <div>
            <label style={labelCls}>{"\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0627\u0646\u062a\u0647\u0627\u0621"}</label>
            <input style={inputCls} type="date" value={form.expiration_date}
              onChange={e => setForm(f => ({ ...f, expiration_date: e.target.value }))} />
          </div>
          <div>
            <label style={labelCls}>{"\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0634\u0631\u0627\u0621 *"}{fieldErrors.purchase_date && <span style={{ color: 'var(--red)', fontSize: 10 }}> {"\u2022 \u0645\u0637\u0644\u0648\u0628"}</span>}</label>
            <input style={fieldErrors.purchase_date ? inputErrorCls : inputCls} type="date" required value={form.purchase_date}
              onChange={e => { setForm(f => ({ ...f, purchase_date: e.target.value })); setFieldErrors(er => ({ ...er, purchase_date: false })); }} />
          </div>
        </div>

        <div style={sectionTitleCls}><i className="ti ti-currency-dollar" />{"\u0627\u0644\u062a\u0633\u0639\u064a\u0631"}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div>
            <label style={labelCls}>{"\u0627\u0644\u0643\u0645\u064a\u0629 *"}{fieldErrors.original_quantity && <span style={{ color: 'var(--red)', fontSize: 10 }}> {"\u2022 \u0645\u0637\u0644\u0648\u0628"}</span>}</label>
            <input style={fieldErrors.original_quantity ? inputErrorCls : inputCls} type="number" min="0.0001" step="0.0001" required value={form.original_quantity}
              onChange={e => { setForm(f => ({ ...f, original_quantity: e.target.value })); setFieldErrors(er => ({ ...er, original_quantity: false })); }} />
          </div>
          <div>
            <label style={labelCls}>{"\u0633\u0639\u0631 \u0627\u0644\u0634\u0631\u0627\u0621"}</label>
            <input style={inputCls} type="number" min="0" step="0.01" value={form.purchase_price}
              onChange={e => handlePriceChange('purchase_price', e.target.value)} />
          </div>
          <div>
            <label style={labelCls}>{"\u0627\u0644\u0647\u0645\u0634 \u0627\u0644\u0646\u0635\u0628\u064a (%)"}</label>
            <input style={inputCls} type="number" min="0" max="100" step="0.01" value={form.margin_percentage}
              onChange={e => handlePriceChange('margin_percentage', e.target.value)} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelCls}>{"\u0633\u0639\u0631 \u0627\u0644\u0628\u064a\u0639 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064a"}</label>
            <input style={{ ...inputCls, background: 'var(--bg3)', fontWeight: 700, color: 'var(--em)' }}
              type="number" readOnly value={form.legal_selling_price} />
          </div>
        </div>

        {isEdit && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
            background: form.active ? 'var(--em0)' : 'var(--bg3)', borderRadius: 'var(--r2)',
            border: `1px solid ${form.active ? 'var(--em2)' : 'var(--b2)'}`,
          }}>
            <label style={{ position: 'relative', display: 'inline-block', width: 36, height: 20, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.active}
                onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                style={{ opacity: 0, width: 0, height: 0 }} />
              <span style={{
                position: 'absolute', inset: 0, borderRadius: 10, transition: '.2s',
                background: form.active ? 'var(--em)' : 'var(--b3)',
              }} />
              <span style={{
                position: 'absolute', top: 2, left: form.active ? 18 : 2,
                width: 16, height: 16, borderRadius: '50%', background: '#fff',
                transition: '.2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
              }} />
            </label>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{form.active ? "\u0646\u0634\u0637\u0629" : "\u063a\u064a\u0631 \u0646\u0634\u0637\u0629"}</div>
              <div style={{ fontSize: 10, color: 'var(--t4)' }}>{form.active ? "\u0627\u0644\u062f\u0641\u0639\u0629 \u0645\u062a\u0627\u062d\u0629 \u0644\u0644\u0627\u0633\u062a\u062e\u062f\u0627\u0645" : "\u0627\u0644\u062f\u0641\u0639\u0629 \u063a\u064a\u0631 \u0645\u062a\u0627\u062d\u0629 \u0644\u0644\u0627\u0633\u062a\u062e\u062f\u0627\u0645"}</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="kpis" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="kpi kb"><div className="kpi-top"><div className="kpi-ic ic"><i className="ti ti-stack" /></div></div><div className="kpi-lbl">{"\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u062f\u0641\u0639\u0627\u062a"}</div><div className="kpi-val">{stats.total}</div></div>
        <div className="kpi ke"><div className="kpi-top"><div className="kpi-ic ic"><i className="ti ti-circle-check" /></div></div><div className="kpi-lbl">{"\u0646\u0634\u0637\u0629"}</div><div className="kpi-val">{stats.active}</div></div>
        <div className="kpi kr"><div className="kpi-top"><div className="kpi-ic ic"><i className="ti ti-circle-x" /></div></div><div className="kpi-lbl">{"\u0641\u0627\u0631\u063a\u0629"}</div><div className="kpi-val">{stats.depleted}</div></div>
        <div className="kpi ko"><div className="kpi-top"><div className="kpi-ic ic"><i className="ti ti-clock" /></div></div><div className="kpi-lbl">{"\u062a\u0646\u062a\u0647\u064a \u0642\u0631\u064a\u0628\u0627\u064b"}</div><div className="kpi-val">{stats.expiring}</div></div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }}
          placeholder={"\u0628\u062d\u062b \u0628\u0631\u0642\u0645 \u0627\u0644\u062f\u0641\u0639\u0629 \u0623\u0648 \u0627\u0633\u0645 \u0627\u0644\u0645\u0646\u062a\u062c..."} width={300} />
        <Button variant="primary" size="sm" icon={<i className="ti ti-plus" />} onClick={openCreate}>
          {"\u062f\u0641\u0639\u0629 \u062c\u062f\u064a\u062f\u0629"}
        </Button>
      </div>

      <Card noHeader padding={0} style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 24 }}><Skeleton variant="table" rows={6} /></div>
        ) : items.length === 0 ? (
          <EmptyState icon="ti-barcode" text={"\u0644\u0627 \u062a\u0648\u062c\u062f \u062f\u0641\u0639\u0627\u062a"}
            sub={"\u064a\u0645\u0643\u0646\u0643 \u0625\u0646\u0634\u0627\u0621 \u062f\u0641\u0639\u0629 \u062c\u062f\u064a\u062f\u0629 \u0623\u0648 \u064a\u062a\u0645 \u0625\u0646\u0634\u0627\u0621\u0647\u0627 \u062a\u0644\u0642\u0627\u0626\u064a\u0627\u064b \u0639\u0646\u062f \u062a\u0623\u0643\u064a\u062f \u0641\u0648\u0627\u062a\u064a\u0631 \u0627\u0644\u0634\u0631\u0627\u0621"}
            action={<Button variant="primary" size="sm" icon={<i className="ti ti-plus" />} onClick={openCreate}>{"\u0625\u0646\u0634\u0627\u0621 \u062f\u0641\u0639\u0629"}</Button>} />
        ) : (
          <>
            <SimpleTable
              className="plt-tbl"
              columns={[
                { key: 'lot_number', label: "\u0631\u0642\u0645 \u0627\u0644\u062f\u0641\u0639\u0629", render: (v) => (
                  <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 11 }}>{v as string}</span>
                )},
                { key: 'product', label: "\u0627\u0644\u0645\u0646\u062a\u062c", render: (_v, row) => {
                  const lot = row as unknown as ProductLot;
                  return (
                    <>
                      <div style={{ fontWeight: 600 }}>{lot.product?.name ?? '\u2014'}</div>
                      {lot.product?.ref && <div style={{ fontSize: 10, color: 'var(--t4)' }}>{lot.product.ref}</div>}
                    </>
                  );
                }},
                { key: 'warehouse', label: "\u0627\u0644\u0645\u0633\u062a\u0648\u062f\u0639", render: (_v, row) => {
                  const lot = row as unknown as ProductLot;
                  return <span style={{ color: 'var(--t3)' }}>{lot.warehouse?.name ?? '\u2014'}</span>;
                }},
                { key: 'original_quantity', label: "\u0627\u0644\u0643\u0645\u064a\u0629", align: 'start', render: (v) => (
                  <span style={{ textAlign: 'left', fontFamily: 'monospace', fontSize: 12 }}>{fmtNum(Number(v))}</span>
                )},
                { key: '_remaining', label: "\u0627\u0644\u0645\u062a\u0628\u0642\u064a", align: 'start', render: (_v, row) => {
                  const lot = row as unknown as ProductLot;
                  const rem = Number(lot.remaining_quantity ?? 0);
                  const orig = Number(lot.original_quantity ?? 0);
                  const pct = orig > 0 ? (rem / orig) * 100 : 0;
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 12, color: rem <= 0 ? 'var(--t4)' : pct < 20 ? 'var(--red)' : 'var(--t1)' }}>{fmtNum(rem)}</span>
                      <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--bg4)', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 2, background: pct < 20 ? 'var(--red)' : pct < 50 ? 'var(--gold)' : 'var(--em)', transition: 'width .3s' }} />
                      </div>
                    </div>
                  );
                }},
                { key: 'purchase_date', label: "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0634\u0631\u0627\u0621", render: (v) => (
                  <span style={{ color: 'var(--t3)', fontSize: 12 }}>{fmtDate(v as string)}</span>
                )},
                { key: 'expiration_date', label: "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0627\u0646\u062a\u0647\u0627\u0621", render: (v, row) => {
                  const lot = row as unknown as ProductLot;
                  const st = getLotStatus(lot);
                  return lot.expiration_date ? (
                    <span style={{ fontSize: 12, color: st.variant === 'danger' ? 'var(--red)' : st.variant === 'warning' ? 'var(--gold)' : 'var(--t3)' }}>{fmtDate(v as string)}</span>
                  ) : '\u2014';
                }},
                { key: '_status', label: "\u0627\u0644\u062d\u0627\u0644\u0629", render: (_v, row) => {
                  const lot = row as unknown as ProductLot;
                  const st = getLotStatus(lot);
                  return (
                    <Badge variant={st.variant} noDot>
                      <i className={`ti ${st.icon}`} style={{ marginLeft: 4, fontSize: 10 }} />{st.label}
                    </Badge>
                  );
                }},
                { key: 'actions', label: "\u0625\u062c\u0631\u0627\u0621\u0627\u062a", render: (_v, row) => {
                  const lot = row as unknown as ProductLot;
                  return (
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                      <button onClick={() => openEdit(lot)} title="\u062a\u0639\u062f\u064a\u0644" className="plt-action-btn plt-action-btn--edit"><i className="ti ti-pencil" /></button>
                      <button onClick={() => handleDelete(lot.id, lot.lot_number)} title="\u062d\u0630\u0641" className="plt-action-btn plt-action-btn--delete"><i className="ti ti-trash" /></button>
                    </div>
                  );
                }},
              ]}
              data={items as unknown as Record<string, unknown>[]}
              rowKey="id"
              emptyText="\u0644\u0627 \u062a\u0648\u062c\u062f \u062f\u0641\u0639\u0627\u062a"
            />
            {meta && meta.last_page > 1 && (
              <div style={{ padding: '0 16px', borderTop: '1px solid var(--b1)' }}>
                <Pagination meta={meta} onPageChange={setPage}
                  onPerPageChange={(_pp) => { setPage(1); }} />
              </div>
            )}
          </>
        )}
      </Card>

      <Modal open={createModal.open} onClose={createModal.closeModal} title={"\u0625\u0646\u0634\u0627\u0621 \u062f\u0641\u0639\u0629 \u062c\u062f\u064a\u062f\u0629"}
        footer={<><Button variant="default" onClick={createModal.closeModal}>{"\u0625\u0644\u063a\u0627\u0621"}</Button><Button variant="primary" onClick={handleSave} loading={mutations.createLot.isPending}>{"\u062d\u0641\u0638"}</Button></>}>
        <FormFields />
      </Modal>

      <Modal open={editModal.open} onClose={editModal.closeModal} title={"\u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u062f\u0641\u0639\u0629"}
        footer={<><Button variant="default" onClick={editModal.closeModal}>{"\u0625\u0644\u063a\u0627\u0621"}</Button><Button variant="primary" onClick={handleSave} loading={mutations.updateLot.isPending}>{"\u062a\u0639\u062f\u064a\u0644"}</Button></>}>
        <FormFields />
      </Modal>


    </div>
  );
}
