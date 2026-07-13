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
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Skeleton from '@/components/ui/Skeleton';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import SearchInput from '@/components/ui/SearchInput';
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
  original_quantity: string; supplier_lot_number: string;
}

const emptyForm: LotFormData = {
  lot_number: '', product_id: '', warehouse_id: '',
  manufacturing_date: '', expiration_date: '', purchase_date: '',
  purchase_price: '', legal_selling_price: '', margin_percentage: '5',
  original_quantity: '', supplier_lot_number: '',
};

const inputCls: React.CSSProperties = {
  width: '100%', padding: '7px 10px', borderRadius: 'var(--r2)',
  border: '1px solid var(--b3)', background: 'var(--bg1)', color: 'var(--t1)',
  fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none', boxSizing: 'border-box',
};
const labelCls: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--t3)', marginBottom: 4, display: 'block' };

export default function ProductLotsTab() {
  const slug = useActiveSlug();
  const qc = useQueryClient();
  const { notify } = useNotification();
  const deleteConfirm = useConfirm();
  const createModal = useModal();
  const editModal = useModal();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<LotFormData>(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);

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

  const openCreate = () => { setForm(emptyForm); setEditId(null); createModal.openModal(); };

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
    });
    setEditId(lot.id);
    editModal.openModal();
  };

  const handleSave = async () => {
    if (!form.product_id || !form.warehouse_id || !form.purchase_date || !form.original_quantity) {
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
      setEditId(null); setForm(emptyForm);
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

  const FormFields = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <div>
        <label style={labelCls}>{"\u0631\u0642\u0645 \u0627\u0644\u062f\u0641\u0639\u0629"}</label>
        <input style={inputCls} placeholder={"\u0645\u0639\u0631\u0641 (يتم توليده تلقائياً)"} value={form.lot_number}
          onChange={e => setForm(f => ({ ...f, lot_number: e.target.value }))} />
      </div>
      <div>
        <label style={labelCls}>{"\u0627\u0644\u0645\u0646\u062a\u062c *"}</label>
        <select style={inputCls} value={form.product_id}
          onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))}>
          <option value="">{"\u0627\u062e\u062a\u0631 \u0645\u0646\u062a\u062c..."}</option>
          {(productsData ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.name}{p.ref ? ` (${p.ref})` : ''}</option>)}
        </select>
      </div>
      <div>
        <label style={labelCls}>{"\u0627\u0644\u0645\u0633\u062a\u0648\u062f\u0639 *"}</label>
        <select style={inputCls} value={form.warehouse_id}
          onChange={e => setForm(f => ({ ...f, warehouse_id: e.target.value }))}>
          <option value="">{"\u0627\u062e\u062a\u0631 \u0645\u0633\u062a\u0648\u062f\u0639..."}</option>
          {(warehouses.data as any[] ?? []).map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </div>
      <div>
        <label style={labelCls}>{"\u0639\u062f\u062f \u0627\u0644\u0645\u0631\u062c\u0639"}</label>
        <input style={inputCls} value={form.supplier_lot_number}
          onChange={e => setForm(f => ({ ...f, supplier_lot_number: e.target.value }))} />
      </div>
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
        <label style={labelCls}>{"\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0634\u0631\u0627\u0621 *"}</label>
        <input style={inputCls} type="date" required value={form.purchase_date}
          onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))} />
      </div>
      <div>
        <label style={labelCls}>{"\u0627\u0644\u0643\u0645\u064a\u0629 *"}</label>
        <input style={inputCls} type="number" min="0.0001" step="0.0001" required value={form.original_quantity}
          onChange={e => setForm(f => ({ ...f, original_quantity: e.target.value }))} />
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
  );

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

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 24 }}><Skeleton variant="table" rows={6} /></div>
        ) : items.length === 0 ? (
          <EmptyState icon="ti-barcode" text={"\u0644\u0627 \u062a\u0648\u062c\u062f \u062f\u0641\u0639\u0627\u062a"}
            sub={"\u064a\u0645\u0643\u0646\u0643 \u0625\u0646\u0634\u0627\u0621 \u062f\u0641\u0639\u0629 \u062c\u062f\u064a\u062f\u0629 \u0623\u0648 \u064a\u062a\u0645 \u0625\u0646\u0634\u0627\u0621\u0647\u0627 \u062a\u0644\u0642\u0627\u0626\u064a\u0627\u064b \u0639\u0646\u062f \u062a\u0623\u0643\u064a\u062f \u0641\u0648\u0627\u062a\u064a\u0631 \u0627\u0644\u0634\u0631\u0627\u0621"}
            action={<Button variant="primary" size="sm" icon={<i className="ti ti-plus" />} onClick={openCreate}>{"\u0625\u0646\u0634\u0627\u0621 \u062f\u0641\u0639\u0629"}</Button>} />
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th className="th">{"\u0631\u0642\u0645 \u0627\u0644\u062f\u0641\u0639\u0629"}</th>
                    <th className="th">{"\u0627\u0644\u0645\u0646\u062a\u062c"}</th>
                    <th className="th">{"\u0627\u0644\u0645\u0633\u062a\u0648\u062f\u0639"}</th>
                    <th className="th" style={{ textAlign: 'left' }}>{"\u0627\u0644\u0643\u0645\u064a\u0629"}</th>
                    <th className="th" style={{ textAlign: 'left' }}>{"\u0627\u0644\u0645\u062a\u0628\u0642\u064a"}</th>
                    <th className="th">{"\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0634\u0631\u0627\u0621"}</th>
                    <th className="th">{"\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0627\u0646\u062a\u0647\u0627\u0621"}</th>
                    <th className="th">{"\u0627\u0644\u062d\u0627\u0644\u0629"}</th>
                    <th className="th" style={{ textAlign: 'center', width: 80 }}>{"\u0625\u062c\u0631\u0627\u0621\u0627\u062a"}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(lot => {
                    const st = getLotStatus(lot);
                    const rem = Number(lot.remaining_quantity ?? 0);
                    const orig = Number(lot.original_quantity ?? 0);
                    const pct = orig > 0 ? (rem / orig) * 100 : 0;
                    return (
                      <tr key={lot.id} className="tr-hover">
                        <td className="td" style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 11 }}>{lot.lot_number}</td>
                        <td className="td">
                          <div style={{ fontWeight: 600 }}>{lot.product?.name ?? '\u2014'}</div>
                          {lot.product?.ref && <div style={{ fontSize: 10, color: 'var(--t4)' }}>{lot.product.ref}</div>}
                        </td>
                        <td className="td" style={{ color: 'var(--t3)' }}>{lot.warehouse?.name ?? '\u2014'}</td>
                        <td className="td" style={{ textAlign: 'left', fontFamily: 'monospace', fontSize: 12 }}>{fmtNum(orig)}</td>
                        <td className="td" style={{ textAlign: 'left' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 12, color: rem <= 0 ? 'var(--t4)' : pct < 20 ? 'var(--red)' : 'var(--t1)' }}>{fmtNum(rem)}</span>
                            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--bg4)', overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', borderRadius: 2, background: pct < 20 ? 'var(--red)' : pct < 50 ? 'var(--gold)' : 'var(--em)', transition: 'width .3s' }} />
                            </div>
                          </div>
                        </td>
                        <td className="td" style={{ color: 'var(--t3)', fontSize: 12 }}>{fmtDate(lot.purchase_date)}</td>
                        <td className="td" style={{ fontSize: 12 }}>
                          {lot.expiration_date ? (
                            <span style={{ color: st.variant === 'danger' ? 'var(--red)' : st.variant === 'warning' ? 'var(--gold)' : 'var(--t3)' }}>{fmtDate(lot.expiration_date)}</span>
                          ) : '\u2014'}
                        </td>
                        <td className="td">
                          <Badge variant={st.variant} noDot>
                            <i className={`ti ${st.icon}`} style={{ marginLeft: 4, fontSize: 10 }} />{st.label}
                          </Badge>
                        </td>
                        <td className="td" style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                            <button onClick={() => openEdit(lot)} title="\u062a\u0639\u062f\u064a\u0644" className="action-btn action-btn--edit"><i className="ti ti-pencil" /></button>
                            <button onClick={() => handleDelete(lot.id, lot.lot_number)} title="\u062d\u0630\u0641" className="action-btn action-btn--delete"><i className="ti ti-trash" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {meta && meta.last_page > 1 && (
              <div style={{ padding: '0 16px', borderTop: '1px solid var(--b1)' }}>
                <Pagination meta={meta} onPageChange={setPage}
                  onPerPageChange={(pp) => { setPage(1); }} />
              </div>
            )}
          </>
        )}
      </div>

      <Modal open={createModal.open} onClose={createModal.closeModal} title={"\u0625\u0646\u0634\u0627\u0621 \u062f\u0641\u0639\u0629 \u062c\u062f\u064a\u062f\u0629"}
        footer={<><Button variant="default" onClick={createModal.closeModal}>{"\u0625\u0644\u063a\u0627\u0621"}</Button><Button variant="primary" onClick={handleSave} loading={mutations.createLot.isPending}>{"\u062d\u0641\u0638"}</Button></>}>
        <FormFields />
      </Modal>

      <Modal open={editModal.open} onClose={editModal.closeModal} title={"\u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u062f\u0641\u0639\u0629"}
        footer={<><Button variant="default" onClick={editModal.closeModal}>{"\u0625\u0644\u063a\u0627\u0621"}</Button><Button variant="primary" onClick={handleSave} loading={mutations.updateLot.isPending}>{"\u062a\u0639\u062f\u064a\u0644"}</Button></>}>
        <FormFields />
      </Modal>

      <style>{`
        .tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
        .th { padding: 10px 16px; text-align: right; font-weight: 700; font-size: 11px; color: var(--t4); white-space: nowrap; background: var(--bg3); border-bottom: 2px solid var(--b2); }
        .td { padding: 10px 16px; text-align: right; vertical-align: middle; }
        .tr-hover { transition: background .1s; border-bottom: 1px solid var(--b1); }
        .tr-hover:hover { background: var(--bg3); }
        .action-btn {
          width: 28px; height: 28px; border-radius: var(--r1); border: 1px solid var(--b1);
          background: var(--bg2); color: var(--t3); font-size: 13px; cursor: pointer;
          display: inline-flex; align-items: center; justify-content: center; transition: all .15s;
        }
        .action-btn--edit:hover { background: var(--blueb); color: var(--blue); border-color: var(--bluebo); }
        .action-btn--delete:hover { background: var(--redb); color: var(--red); border-color: var(--redbo); }
      `}</style>
    </div>
  );
}
