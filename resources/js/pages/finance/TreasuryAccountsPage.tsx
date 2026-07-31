// resources/js/pages/finance/TreasuryAccountsPage.tsx
// ════════════════════════════════════════════════════════════════════
// صفحة الحسابات المالية — نسخة مُصلَحة
// ════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useModal } from '@/hooks/useModal';
import PageHeader  from '@/components/ui/PageHeader';
import Card        from '@/components/ui/Card';
import Badge       from '@/components/ui/Badge';
import Button      from '@/components/ui/Button';
import Modal       from '@/components/ui/Modal';
import { useConfirm } from '@/hooks/useConfirm';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import KpiCard     from '@/components/ui/KpiCard';
import EmptyState  from '@/components/ui/EmptyState';
import SimpleTable from '@/components/ui/SimpleTable';
import AlertBar    from '@/components/ui/AlertBar';
import Switch      from '@/components/ui/Switch';
import { useTenantQuery, useTenantMutation } from '@/hooks/useTenantQuery';
import { treasuryAccountsApi } from '@/lib/api/endpoints/treasuryAccounts';
import { tenantKeys } from '@/lib/api/core/queryKeys';

// ─── أيقونات حسب كود النوع ───────────────────────────────────────────────────
const TYPE_ICONS: Record<string, string> = {
  bank:    'ti-building-bank',
  banque:  'ti-building-bank',
  cash:    'ti-cash-register',
  caisse:  'ti-cash-register',
  ccp:     'ti-mailbox',
  epargne: 'ti-piggy-bank',
};
const typeIcon = (code: string) =>
  TYPE_ICONS[code?.toLowerCase()] ?? 'ti-wallet';

// ─── KPI colors ──────────────────────────────────────────────────────────────
const KPI_COLORS = ['blue', 'gold', 'purple', 'teal', 'orange'] as const;
const KPI_ICONS  = [
  'ti-building-bank', 'ti-cash-register',
  'ti-piggy-bank', 'ti-coin', 'ti-wallet',
];

interface TreasuryAccount {
  id: number;
  name: string;
  code: string | null;
  treasury_account_type_id: number | null;
  bank_name?: string;
  account_number?: string;
  rib?: string;
  iban?: string;
  swift_bic?: string;
  currency: string;
  initial_balance: number;
  current_balance: number;
  is_default: boolean;
  active: boolean;
  notes?: string;
  is_bank_account?: boolean;
  is_cash_account?: boolean;
  relations?: {
    treasuryAccountType?: { id: number; name: string; code?: string };
  };
  // مُحسَّن داخلياً
  _typeId?:   number | null;
  _typeName?: string;
  _typeCode?: string;
}

// ════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════
export default function TreasuryAccountsPage() {
  const [search,      setSearch]      = useState('');
  const [typeTabId,   setTypeTabId]   = useState<number | null>(null);
  const [editing,     setEditing]     = useState<TreasuryAccount | null>(null);
  const modal       = useModal();
  const deleteConfirm = useConfirm();

  // ── أنواع الحسابات (مسار عام — بدون slug) ─────────────────────────────────
  const { data: rawTypes } = useQuery({
    queryKey: ['treasury-account-types'],
    queryFn:  () => treasuryAccountsApi.listAccountTypes().then((res: any) => {
      const d = res?.data;
      if (Array.isArray(d))       return d;
      if (Array.isArray(d?.data)) return d.data;
      return [];
    }),
    staleTime: Infinity,
  });
  const accountTypes: any[] = rawTypes ?? [];

  // ── الحسابات (مسار tenant — يُضاف إليه الـ slug تلقائياً) ─────────────────
  const {
    data: rawAccounts,
    isLoading,
    error: fetchError,
  } = useTenantQuery<TreasuryAccount[]>(
    (slug) => tenantKeys.lookups.treasuryAccounts(slug),
    () => treasuryAccountsApi.list({ include: 'treasuryAccountType' }).then((res: any) => {
      const d = res?.data;
      if (Array.isArray(d))       return d;
      if (Array.isArray(d?.data)) return d.data;
      return [];
    }),
  );

  // ── إثراء البيانات: نضيف _typeId/_typeName/_typeCode ─────────────────────
  const accounts: TreasuryAccount[] = useMemo(() => {
    if (!rawAccounts) return [];
    return (rawAccounts as any[]).map(acc => ({
      ...acc,
      _typeId:   acc.relations?.treasuryAccountType?.id   ?? acc.treasury_account_type_id ?? null,
      _typeName: acc.relations?.treasuryAccountType?.name ?? '',
      _typeCode: acc.relations?.treasuryAccountType?.code ?? '',
    }));
  }, [rawAccounts]);

  // ── فلترة: بحث + sub-tab ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = accounts;
    if (typeTabId !== null) {
      list = list.filter(a => a._typeId === typeTabId);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.name.toLowerCase().includes(q) ||
        (a.code ?? '').toLowerCase().includes(q) ||
        (a.bank_name ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [accounts, typeTabId, search]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalBalance = accounts.reduce((s, a) => s + (a.current_balance || 0), 0);

  const kpiByType = useMemo(() => {
    const map: Record<number, { name: string; code: string; total: number; count: number }> = {};
    accounts.forEach(a => {
      const id = a._typeId;
      if (!id) return;
      if (!map[id]) {
        const t = accountTypes.find((t: any) => t.id === id);
        map[id] = { name: t?.name ?? '—', code: t?.code ?? '', total: 0, count: 0 };
      }
      map[id].total += a.current_balance || 0;
      map[id].count += 1;
    });
    return map;
  }, [accounts, accountTypes]);

  // ── حذف ──────────────────────────────────────────────────────────────────
  const deleteMutation = useTenantMutation(
    (id: number) => treasuryAccountsApi.delete(id),
    (slug) => tenantKeys.lookups.treasuryAccounts(slug),
  );

  const openAdd  = () => { setEditing(null); modal.openModal(); };
  const openEdit = (acc: TreasuryAccount) => { setEditing(acc); modal.openModal(); };

  // ── Sub-tab style ─────────────────────────────────────────────────────────
  const subTabStyle = (active: boolean): React.CSSProperties => ({
    padding: '7px 14px', borderRadius: '8px 8px 0 0',
    border: 'none', borderBottom: `2px solid ${active ? 'var(--em)' : 'transparent'}`,
    background: active ? 'var(--emb)' : 'transparent',
    color: active ? 'var(--em)' : 'var(--t3)',
    fontSize: 13, fontWeight: 700, fontFamily: 'Tajawal, sans-serif',
    cursor: 'pointer', transition: '.15s',
    display: 'flex', alignItems: 'center', gap: 6,
  });
  const countBadge = (n: number, active: boolean) => (
    <span style={{
      fontSize: 10, fontWeight: 900, borderRadius: 20, padding: '1px 7px',
      background: active ? 'var(--em)' : 'var(--bg4)',
      color:      active ? '#fff'      : 'var(--t4)',
    }}>{n}</span>
  );

  return (
    <div className="page on" id="p-treasury-accounts">
      <PageHeader
        title="الحسابات المالية"
        subtitle={`إدارة الحسابات البنكية والصناديق — ${accounts.length} حساب`}
        actions={
          <Button variant="primary" size="sm" icon={<i className="ti ti-plus"/>} onClick={openAdd}>
            حساب جديد
          </Button>
        }
      />

      {/* KPIs */}
      <div className="kpis" style={{ marginBottom: 20 }}>
        <KpiCard
          variant="green" icon="ti-wallet"
          label="إجمالي الأرصدة"
          value={totalBalance.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })}
          unit="دج" sub={`${accounts.length} حساب`}
        />
        {Object.entries(kpiByType).map(([id, info], i) => (
          <KpiCard
            key={id}
            variant={KPI_COLORS[i % KPI_COLORS.length]}
            icon={KPI_ICONS[i % KPI_ICONS.length]}
            label={info.name}
            value={info.total.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })}
            unit="دج" sub={`${info.count} حساب`}
          />
        ))}
      </div>

      {/* خطأ جلب البيانات */}
      {fetchError && (
        <AlertBar variant="red" style={{ marginBottom: 12 }}>
          فشل جلب الحسابات المالية. تأكد من أن الخادم يعمل وأن لديك صلاحية الوصول.
        </AlertBar>
      )}

      {/* Sub-tabs الأنواع */}
      {accountTypes.length > 0 && (
        <div style={{
          display: 'flex', gap: 4, marginBottom: 0,
          borderBottom: '1px solid var(--b2)', overflowX: 'auto',
        }}>
          <button style={subTabStyle(typeTabId === null)} onClick={() => setTypeTabId(null)}>
            <i className="ti ti-layout-grid" style={{ fontSize: 12 }} />
            الكل {countBadge(accounts.length, typeTabId === null)}
          </button>
          {accountTypes.map((type: any) => {
            const count    = accounts.filter(a => a._typeId === type.id).length;
            const isActive = typeTabId === type.id;
            return (
              <button key={type.id} style={subTabStyle(isActive)} onClick={() => setTypeTabId(type.id)}>
                <i className={`ti ${typeIcon(type.code)}`} style={{ fontSize: 12 }} />
                {type.name}
                {countBadge(count, isActive)}
              </button>
            );
          })}
        </div>
      )}

      {/* شريط البحث */}
      <div className="filters" style={{ margin: '12px 0' }}>
        <div className="srch" style={{ flex: 1, display: 'flex' }}>
          <span className="srch-ic ic ic-xs"><i className="ti ti-search"/></span>
          <input
            type="text"
            placeholder="ابحث باسم أو كود أو اسم البنك..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* المحتوى */}
      {isLoading ? (
        <div className="empty">
          <div className="empty-ic"><i className="ti ti-loader"/></div>
          <div className="empty-tx">جاري التحميل...</div>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="ti-building-bank"
          text="لا توجد حسابات مالية"
          sub={
            search || typeTabId !== null
              ? 'لا توجد نتائج تطابق بحثك'
              : 'أضف أول حساب بنكي أو صندوق نقدي'
          }
          action={<Button variant="primary" onClick={openAdd}>حساب جديد</Button>}
        />
      ) : (
        <Card noHeader style={{ padding: 0, marginTop: 0 }}>
          <SimpleTable
            columns={[
              { key: 'name', label: 'الاسم', className: 's' },
              {
                key: '_typeName', label: 'النوع',
                render: (_v, row) => {
                  const acc = row as any;
                  return (
                    <Badge variant="gray" style={{ fontSize: 10 }}>
                      <i className={`ti ${typeIcon(acc._typeCode || '')}`} style={{ marginLeft: 4 }}/>
                      {acc._typeName || '—'}
                    </Badge>
                  );
                },
              },
              { key: 'code', label: 'الكود', className: 'm' },
              {
                key: 'bank_name', label: 'البنك / التفاصيل',
                render: (v) => <span style={{ fontSize: 12, color: 'var(--t3)' }}>{(v as string) || '—'}</span>,
              },
              {
                key: 'accountNumber', label: 'رقم الحساب', className: 'm',
                render: (_v, row) => {
                  const acc = row as any;
                  return <span style={{ fontSize: 11, fontFamily: 'monospace' }}>{acc.account_number || acc.rib || acc.iban || '—'}</span>;
                },
              },
              {
                key: 'current_balance', label: 'الرصيد الحالي', className: 'e',
                render: (v) => <>{((v as number) || 0).toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج</>,
              },
              {
                key: 'is_default', label: 'افتراضي',
                render: (v) => v
                  ? <span className="ic ic-xs" style={{ color: 'var(--em)' }}><i className="ti ti-circle-check"/></span>
                  : '—',
              },
              {
                key: 'active', label: 'الحالة',
                render: (v) => <Badge variant={v ? 'success' : 'danger'}>{v ? 'نشط' : 'موقوف'}</Badge>,
              },
              {
                key: 'actions', label: '', align: 'center',
                render: (_v, row) => {
                  const acc = row as any;
                  return (
                    <div style={{ display: 'flex', gap: 3 }}>
                      <Button size="xs" icon={<i className="ti ti-pencil"/>} onClick={() => openEdit(acc)}/>
                      <Button size="xs" variant="danger" icon={<i className="ti ti-trash"/>} onClick={async () => { if (await deleteConfirm.confirm('حذف الحساب المالي؟')) deleteMutation.mutate(acc.id); }}/>
                    </div>
                  );
                },
              },
            ]}
            data={filtered as any}
            rowKey="id"
          />
        </Card>
      )}

      {/* مودال الإضافة/التعديل */}
      <TreasuryAccountModal
        open={modal.open}
        account={editing}
        accountTypes={accountTypes}
        onClose={modal.closeModal}
      />

      {/* مودال تأكيد الحذف */}
      <ConfirmDialog {...deleteConfirm.confirmDialogProps} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// TREASURY ACCOUNT MODAL
// ════════════════════════════════════════════════════════════════════
function TreasuryAccountModal({
  open, account, accountTypes, onClose,
}: {
  open:         boolean;
  account:      TreasuryAccount | null;
  accountTypes: any[];
  onClose:      () => void;
}) {
  const isEdit = !!account;

  // تحديد كود النوع المختار (لإظهار حقول البنك فقط عند الحاجة)
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const selectedType = accountTypes.find((t: any) => t.id === selectedTypeId);
  const isBankType   = ['bank', 'banque'].includes(selectedType?.code?.toLowerCase() ?? '');

  const emptyForm = () => ({
    name:                     '',
    code:                     '',
    treasury_account_type_id: accountTypes[0]?.id ?? null as number | null,
    bank_name:                '',
    account_number:           '',
    rib:                      '',
    iban:                     '',
    swift_bic:                '',
    currency:                 'DZD',
    initial_balance:          0,
    is_default:               false,
    active:                   true,
    notes:                    '',
  });

  const [form,  setForm]  = useState(emptyForm());
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    if (account) {
      const a = account as any;
      const typeId = a._typeId ?? a.treasury_account_type_id ?? null;
      setForm({
        name:                     a.name                 || '',
        code:                     a.code                 || '',
        treasury_account_type_id: typeId,
        bank_name:                a.bank_name            || '',
        account_number:           a.account_number       || '',
        rib:                      a.rib                  || '',
        iban:                     a.iban                 || '',
        swift_bic:                a.swift_bic            || '',
        currency:                 a.currency             || 'DZD',
        initial_balance:          a.initial_balance      ?? 0,
        is_default:               a.is_default           ?? false,
        active:                   a.active               ?? true,
        notes:                    a.notes                || '',
      });
      setSelectedTypeId(typeId);
    } else {
      const f = emptyForm();
      setForm(f);
      setSelectedTypeId(f.treasury_account_type_id ?? null);
    }
    setError('');
  }, [open, account]);

  const set = (k: string, v: any) => {
    setForm(f => ({ ...f, [k]: v }));
    if (k === 'treasury_account_type_id') setSelectedTypeId(v);
  };

  const saveMutation = useTenantMutation(
    (data: typeof form) => {
      const payload = {
        ...data,
        treasury_account_type_id: data.treasury_account_type_id
          ? Number(data.treasury_account_type_id) : null,
        initial_balance: Number(data.initial_balance) || 0,
        bank_name:      isBankType ? (data.bank_name     || null) : null,
        account_number: isBankType ? (data.account_number|| null) : null,
        rib:            isBankType ? (data.rib            || null) : null,
        iban:           isBankType ? (data.iban           || null) : null,
        swift_bic:      isBankType ? (data.swift_bic      || null) : null,
      };
      return isEdit
            ? treasuryAccountsApi.update(account!.id, payload as any)
            : treasuryAccountsApi.create(payload as any);
    },
    (slug) => tenantKeys.lookups.treasuryAccounts(slug),
    {
      onSuccess: () => onClose(),
      onError: (err: any) =>
        setError(err?.response?.data?.message || 'فشل الحفظ، تحقق من البيانات.'),
    },
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? `تعديل الحساب — ${account?.name || ''}` : 'حساب مالي جديد'}
      footer={
        <>
          <Button onClick={onClose}>إلغاء</Button>
          <Button
            variant="primary"
            icon={<i className="ti ti-device-floppy"/>}
            onClick={() => saveMutation.mutate(form)}
            disabled={saveMutation.isPending || !form.name.trim()}
          >
            {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </>
      }
    >
      {error && <AlertBar variant="red" style={{ marginBottom: 12 }}>{error}</AlertBar>}

      <div className="fgrid">
        {/* الاسم */}
        <div className="fg s2">
          <label className="req">الاسم</label>
          <input
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="مثال: الصندوق الرئيسي، BNA الجزائر..."
            autoFocus
          />
        </div>

        {/* الكود */}
        <div className="fg">
          <label>الكود</label>
          <input
            value={form.code}
            onChange={e => set('code', e.target.value)}
            placeholder="CASH01, BNA01..."
            style={{ fontFamily: 'monospace' }}
          />
        </div>

        {/* النوع */}
        <div className="fg">
          <label>النوع</label>
          <select
            value={form.treasury_account_type_id ?? ''}
            onChange={e => set('treasury_account_type_id', e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">— اختر النوع —</option>
            {accountTypes.map((t: any) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {/* حقول البنك — تظهر فقط عند اختيار نوع بنكي */}
        {isBankType && (
          <>
            <div className="fg s2">
              <label>اسم البنك</label>
              <input
                value={form.bank_name}
                onChange={e => set('bank_name', e.target.value)}
                placeholder="BNA, BEA, CPA, BADR..."
              />
            </div>
            <div className="fg">
              <label>رقم الحساب</label>
              <input
                value={form.account_number}
                onChange={e => set('account_number', e.target.value)}
                placeholder="00123456789"
                style={{ fontFamily: 'monospace' }}
              />
            </div>
            <div className="fg">
              <label>RIB</label>
              <input
                value={form.rib}
                onChange={e => set('rib', e.target.value)}
                placeholder="00020 00001 00000012345 67"
                style={{ fontFamily: 'monospace' }}
              />
            </div>
            <div className="fg">
              <label>IBAN</label>
              <input
                value={form.iban}
                onChange={e => set('iban', e.target.value)}
                placeholder="DZ58 0002 0000 0000 0012 3456 789"
                style={{ fontFamily: 'monospace' }}
              />
            </div>
            <div className="fg">
              <label>SWIFT / BIC</label>
              <input
                value={form.swift_bic}
                onChange={e => set('swift_bic', e.target.value)}
                placeholder="BNALDZBX"
                style={{ fontFamily: 'monospace' }}
              />
            </div>
          </>
        )}

        {/* الرصيد الافتتاحي */}
        <div className="fg">
          <label>الرصيد الافتتاحي</label>
          <div className="inp-row">
            <input
              type="number"
              value={form.initial_balance}
              onChange={e => set('initial_balance', parseFloat(e.target.value) || 0)}
            />
            <div className="inp-suf">دج</div>
          </div>
        </div>

        {/* العملة */}
        <div className="fg">
          <label>العملة</label>
          <select value={form.currency} onChange={e => set('currency', e.target.value)}>
            <option value="DZD">دينار جزائري (DZD)</option>
            <option value="EUR">يورو (EUR)</option>
            <option value="USD">دولار (USD)</option>
          </select>
        </div>

        {/* ملاحظات */}
        <div className="fg s2">
          <label>ملاحظات</label>
          <textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="ملاحظات إضافية..."
            rows={2}
          />
        </div>

        {/* افتراضي */}
        <div className="fg" style={{ justifyContent: 'flex-end' }}>
          <label>افتراضي</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <Switch checked={form.is_default} onChange={v => set('is_default', v)} />
          </div>
        </div>

        {/* نشط */}
        <div className="fg" style={{ justifyContent: 'flex-end' }}>
          <label>نشط</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <Switch checked={form.active} onChange={v => set('active', v)} />
          </div>
        </div>
      </div>
    </Modal>
  );
}


