// resources/js/pages/finance/components/AccountModal.tsx
// MODAL — حساب مالي
import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPost, apiPut } from '@/lib/api/core/client';
import Button       from '@/components/ui/Button';
import Modal        from '@/components/ui/Modal';
import Switch       from '@/components/ui/Switch';
import AlertBar     from '@/components/ui/AlertBar';
import type { TreasuryAccount } from '@/types';

export default function AccountModal({ open, account, accountTypes, slug, onClose }: {
    open: boolean; account: TreasuryAccount | null;
    accountTypes: any[]; slug: string; onClose: () => void;
}) {
    const isEdit = !!account;
    const qc     = useQueryClient();

    const buildEmpty = (types: any[]) => ({
        name: '', code: '',
        treasury_account_type_id: types[0]?.id ?? (null as number | null),
        bank_name: '', account_number: '', rib: '', iban: '', swift_bic: '',
        currency: 'DZD', initial_balance: 0, is_default: false, active: true, notes: '',
    });

    const [form, setForm]   = useState(() => buildEmpty(accountTypes));
    const [error, setError] = useState('');

    const selectedType = accountTypes.find((t: any) => t.id === form.treasury_account_type_id);
    const isBankType   = selectedType
        ? ['bank', 'banque', 'بنك'].some(k =>
            selectedType.code?.toLowerCase().includes(k) ||
            selectedType.name?.toLowerCase().includes(k))
        : false;

    useEffect(() => {
        if (!open) return;
        if (account) {
            const acc = account as any;
            setForm({
                name:                     acc.name || '',
                code:                     acc.code || '',
                treasury_account_type_id: acc.treasury_account_type_id ?? accountTypes[0]?.id ?? null,
                bank_name:      acc.bank_name || '',
                account_number: acc.account_number || '',
                rib:            acc.rib || '',
                iban:           acc.iban || '',
                swift_bic:      acc.swift_bic || '',
                currency:       acc.currency || 'DZD',
                initial_balance: acc.initial_balance || 0,
                is_default:     acc.is_default || false,
                active:         acc.active ?? true,
                notes:          acc.notes || '',
            });
        } else {
            setForm(buildEmpty(accountTypes));
        }
        setError('');
    }, [open, account]);

    const set = (k: string, v: any) => { setForm(f => ({ ...f, [k]: v })); setError(''); };

    const saveMutation = useMutation({
        mutationFn: (data: typeof form) => {
            const payload: any = {
                name: data.name, code: data.code || null,
                treasury_account_type_id: data.treasury_account_type_id,
                bank_name:      isBankType ? data.bank_name      : null,
                account_number: isBankType ? data.account_number : null,
                rib:            isBankType ? data.rib            : null,
                iban:           isBankType ? data.iban           : null,
                swift_bic:      isBankType ? data.swift_bic      : null,
                currency:       data.currency,
                initial_balance: data.initial_balance,
                is_default:     data.is_default,
                active:         data.active,
                notes:          data.notes || null,
            };
            return isEdit
                ? apiPut(`/treasury-accounts/${(account as any).id}`, payload)
                : apiPost('/treasury-accounts', payload);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: [slug, 'treasury-accounts'] });
            onClose();
        },
        onError: (err: any) =>
            setError(err?.message || err?.response?.data?.message || 'فشل الحفظ.'),
    });

    const handleSave = () => {
        if (!form.name.trim())              { setError('اسم الحساب مطلوب'); return; }
        if (!form.treasury_account_type_id) { setError('نوع الحساب مطلوب'); return; }
        saveMutation.mutate(form);
    };

    return (
        <Modal open={open} onClose={onClose} size="lg"
            title={isEdit ? `تعديل — ${(account as any)?.name || ''}` : 'حساب مالي جديد'}
            subtitle={isEdit ? '' : 'إضافة حساب بنكي أو صندوق نقدي'}
            footer={
                <>
                    <Button onClick={onClose}>إلغاء</Button>
                    <Button variant="primary" icon={<i className="ti ti-device-floppy"/>}
                        onClick={handleSave} disabled={saveMutation.isPending}>
                        {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
                    </Button>
                </>
            }
        >
            {error && <AlertBar variant="red">{error}</AlertBar>}
            <div className="fgrid c2">
                <div className="fg s2">
                    <label className="req">اسم الحساب</label>
                    <input value={form.name} onChange={e => set('name', e.target.value)}
                        placeholder="مثال: الحساب الجاري BNA" autoFocus />
                </div>
                <div className="fg">
                    <label>الكود</label>
                    <input value={form.code} onChange={e => set('code', e.target.value)} placeholder="CP01" />
                </div>
                <div className="fg">
                    <label className="req">نوع الحساب</label>
                    <select value={form.treasury_account_type_id ?? ''}
                        onChange={e => set('treasury_account_type_id', parseInt(e.target.value) || null)}>
                        <option value="">— اختر —</option>
                        {accountTypes.map((t: any) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>
                {isBankType && (
                    <>
                        <div className="fg">
                            <label>اسم البنك</label>
                            <input value={form.bank_name} onChange={e => set('bank_name', e.target.value)} placeholder="BNA" />
                        </div>
                        <div className="fg">
                            <label>رقم الحساب</label>
                            <input value={form.account_number} onChange={e => set('account_number', e.target.value)}
                                style={{ fontFamily: 'monospace' }} />
                        </div>
                        <div className="fg">
                            <label>RIB</label>
                            <input value={form.rib} onChange={e => set('rib', e.target.value)}
                                style={{ fontFamily: 'monospace' }} />
                        </div>
                        <div className="fg">
                            <label>IBAN</label>
                            <input value={form.iban} onChange={e => set('iban', e.target.value)}
                                placeholder="DZ..." style={{ fontFamily: 'monospace' }} />
                        </div>
                        <div className="fg">
                            <label>SWIFT / BIC</label>
                            <input value={form.swift_bic} onChange={e => set('swift_bic', e.target.value)}
                                placeholder="BNALDZBX" style={{ fontFamily: 'monospace' }} />
                        </div>
                    </>
                )}
                <div className="fg">
                    <label>الرصيد الافتتاحي</label>
                    <div className="inp-row">
                        <input type="number" value={form.initial_balance}
                            onChange={e => set('initial_balance', parseFloat(e.target.value) || 0)} />
                        <div className="inp-suf">دج</div>
                    </div>
                </div>
                <div className="fg">
                    <label>العملة</label>
                    <select value={form.currency} onChange={e => set('currency', e.target.value)}>
                        <option value="DZD">دينار جزائري (DZD)</option>
                        <option value="EUR">يورو (EUR)</option>
                        <option value="USD">دولار (USD)</option>
                    </select>
                </div>
                <div className="fg s2">
                    <label>ملاحظات</label>
                    <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
                </div>
                <div className="fg">
                    <label>افتراضي</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <Switch checked={form.is_default} onChange={v => set('is_default', v)} />
                    </div>
                </div>
                <div className="fg">
                    <label>نشط</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <Switch checked={form.active} onChange={v => set('active', v)} />
                    </div>
                </div>
            </div>
        </Modal>
    );
}
