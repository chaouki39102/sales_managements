// resources/js/pages/finance/components/PaymentModeModal.tsx
// MODAL — طريقة دفع
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut } from '@/lib/api/core/client';
import Button       from '@/components/ui/Button';
import Modal        from '@/components/ui/Modal';
import Switch       from '@/components/ui/Switch';
import AlertBar     from '@/components/ui/AlertBar';
import type { TreasuryAccount, PaymentMode } from '@/types';

export default function PaymentModeModal({ open, mode, slug, onClose }: {
    open: boolean; mode: PaymentMode | null; slug: string; onClose: () => void;
}) {
    const isEdit = !!mode;
    const qc     = useQueryClient();

    const { data: rawAccounts } = useQuery({
        queryKey: [slug, 'treasury-accounts'],
        queryFn:  () => apiGet<TreasuryAccount[]>('/treasury-accounts'),
        enabled:  open && !!slug,
        staleTime: 60_000,
    });
    const accounts: any[] = Array.isArray(rawAccounts) ? rawAccounts
        : Array.isArray((rawAccounts as any)?.data) ? (rawAccounts as any).data
        : [];

    const emptyForm = {
        name: '', code: '', description: '',
        treasury_account_id: '' as string | number,
        requires_reference: false, is_cash: false, active: true, display_order: 0,
    };
    const [form, setForm]   = useState(emptyForm);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;
        if (mode) {
            const m = mode as any;
            setForm({
                name:               m.name || '',
                code:               m.code || '',
                description:        m.description || '',
                treasury_account_id: m.treasury_account_id || '',
                requires_reference: m.requires_reference || false,
                is_cash:            m.is_cash || false,
                active:             m.active ?? true,
                display_order:      m.display_order || 0,
            });
        } else {
            setForm(emptyForm);
        }
        setError('');
    }, [open, mode]);

    const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

    const saveMutation = useMutation({
        mutationFn: (data: typeof form) => {
            const payload: any = {
                name: data.name, code: data.code,
                description:         data.description || null,
                treasury_account_id: data.treasury_account_id ? Number(data.treasury_account_id) : null,
                requires_reference:  data.requires_reference,
                is_cash:             data.is_cash,
                active:              data.active,
                display_order:       data.display_order,
            };
            return isEdit
                ? apiPut(`/payment-modes/${(mode as any).id}`, payload)
                : apiPost('/payment-modes', payload);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: [slug, 'payment-modes'] });
            onClose();
        },
        onError: (err: any) => setError(err?.message || 'فشل الحفظ.'),
    });

    return (
        <Modal open={open} onClose={onClose} size="md"
            title={isEdit ? `تعديل — ${(mode as any)?.name || ''}` : 'طريقة دفع جديدة'}
            footer={
                <>
                    <Button onClick={onClose}>إلغاء</Button>
                    <Button variant="primary" icon={<i className="ti ti-device-floppy"/>}
                        onClick={() => saveMutation.mutate(form)}
                        disabled={saveMutation.isPending || !form.name.trim() || !form.code.trim()}>
                        {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
                    </Button>
                </>
            }
        >
            {error && <AlertBar variant="red">{error}</AlertBar>}
            <div className="fgrid">
                <div className="fg s2">
                    <label className="req">الاسم</label>
                    <input value={form.name} onChange={e => set('name', e.target.value)}
                        placeholder="نقداً، شيك، CIB..." autoFocus />
                </div>
                <div className="fg">
                    <label className="req">الكود</label>
                    <input value={form.code} onChange={e => set('code', e.target.value)}
                        placeholder="cash, check, cib" style={{ fontFamily: 'monospace' }} />
                </div>
                <div className="fg">
                    <label>الحساب الافتراضي</label>
                    <select value={form.treasury_account_id as string}
                        onChange={e => set('treasury_account_id', e.target.value)}>
                        <option value="">— اختر —</option>
                        {accounts.map((acc: any) => (
                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                    </select>
                </div>
                <div className="fg">
                    <label>ترتيب العرض</label>
                    <input type="number" value={form.display_order}
                        onChange={e => set('display_order', parseInt(e.target.value) || 0)} />
                </div>
                <div className="fg">
                    <label>نقدي</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <Switch checked={form.is_cash} onChange={v => set('is_cash', v)} />
                    </div>
                </div>
                <div className="fg">
                    <label>يتطلب مرجع</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <Switch checked={form.requires_reference} onChange={v => set('requires_reference', v)} />
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
