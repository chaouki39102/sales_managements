// resources/js/pages/finance/components/PaymentModal.tsx
// MODAL — دفعة جديدة / تعديل
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFiscalYear } from '@/context/FiscalYearContext';
import { apiGet, apiPost, apiPut } from '@/lib/api/core/client';
import Button       from '@/components/ui/Button';
import Modal        from '@/components/ui/Modal';
import AlertBar     from '@/components/ui/AlertBar';
import { fmt } from '../financeUtils';

export default function PaymentModal({ open, payment, accounts, paymentModes, selectedYearId, slug, onClose }: {
    open: boolean;
    payment: any | null;
    accounts: any[];
    paymentModes: any[];
    selectedYearId: number | null;
    slug: string;
    onClose: () => void;
}) {
    const isEdit = !!payment;
    const qc     = useQueryClient();
    const { selectedYear: sy } = useFiscalYear();

    const defaultDate = (): string => {
        const d = new Date().toISOString().split('T')[0];
        if (sy?.start_date && sy?.end_date) {
            const s = sy.start_date.substring(0, 10);
            const e = sy.end_date.substring(0, 10);
            if (d >= s && d <= e) return d;
            return e;
        }
        return d;
    };

    const emptyForm = {
        payment_number:      '',
        payment_date:        defaultDate(),
        amount:              '' as string | number,
        currency_id:         '',
        amount_local:        '' as string | number,
        payment_mode_id:     '' as string | number,
        treasury_account_id: '' as string | number,
        party_id:            '' as string | number,
        fiscal_year_id:      selectedYearId ?? '',
        reference:           '',
        bank_reference:      '',
        notes:               '',
        status:              'confirmed' as 'confirmed' | 'pending',
        direction:           'in' as 'in' | 'out',
    };

    const [form, setForm]   = useState(emptyForm);
    const [error, setError] = useState('');

    // جلب المتعاملين للاختيار (مع partyType للكشف التلقائي عن الاتجاه)
    const { data: rawParties } = useQuery({
        queryKey: [slug, 'parties', 'select'],
        queryFn:  () => apiGet<any>('/parties', { per_page: 200, active: 1, include: 'partyType' }),
        enabled:  open && !!slug,
        select:   (data: any) =>
            Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [],
        staleTime: 5 * 60_000,
    });
    const parties: any[] = rawParties ?? [];

    useEffect(() => {
        if (!open) return;
        if (payment) {
            setForm({
                payment_number:      payment.payment_number || '',
                payment_date:        payment.payment_date?.split('T')[0] || defaultDate(),
                amount:              payment.amount || '',
                currency_id:         payment.currency_id || '',
                amount_local:        payment.amount_local || '',
                payment_mode_id:     payment.payment_mode_id || '',
                treasury_account_id: payment.treasury_account_id || '',
                party_id:            payment.party_id || '',
                fiscal_year_id:      payment.fiscal_year_id || selectedYearId || '',
                reference:           payment.reference || '',
                bank_reference:      payment.bank_reference || '',
                notes:               payment.notes || '',
                status:              payment.status || 'confirmed',
                direction:           payment.direction || 'in',
            });
        } else {
            setForm({ ...emptyForm, fiscal_year_id: selectedYearId ?? '' });
        }
        setError('');
    }, [open, payment, selectedYearId]);

    // تصحيح تلقائي للاتجاه عند تعديل الدفعة حسب نوع المتعامل
    useEffect(() => {
        if (!open || !payment || !parties.length || !form.party_id) return;
        const p = parties.find((pp: any) => String(pp.id) === String(form.party_id));
        const typeName = p?.party_type?.name;
        if (typeName === 'supplier' && form.direction !== 'out') {
            set('direction', 'out');
        } else if (typeName === 'client' && form.direction !== 'in') {
            set('direction', 'in');
        }
    }, [open, payment, parties, form.party_id]);

    const set = (k: string, v: any) => { setForm(f => ({ ...f, [k]: v })); setError(''); };

    // عند اختيار طريقة الدفع: عبئ الحساب تلقائياً إن كان لها حساب افتراضي
    const handleModeChange = (modeId: string) => {
        set('payment_mode_id', modeId);
        if (!modeId) return;
        const mode = paymentModes.find((m: any) => String(m.id) === modeId);
        if (mode?.treasury_account_id && !form.treasury_account_id) {
            set('treasury_account_id', mode.treasury_account_id);
        }
    };

    const saveMutation = useMutation({
        mutationFn: (data: typeof form) => {
            const payload: any = {
                payment_date:        data.payment_date,
                amount:              Number(data.amount),
                payment_mode_id:     Number(data.payment_mode_id),
                treasury_account_id: Number(data.treasury_account_id),
                fiscal_year_id:      Number(data.fiscal_year_id),
                party_id:            data.party_id ? Number(data.party_id) : null,
                currency_id:         data.currency_id ? Number(data.currency_id) : null,
                amount_local:        data.amount_local ? Number(data.amount_local) : null,
                reference:           data.reference || null,
                bank_reference:      data.bank_reference || null,
                notes:               data.notes || null,
                status:              data.status,
                direction:           data.direction,
            };
            if (data.payment_number) payload.payment_number = data.payment_number;
            return isEdit
                ? apiPut<any>(`/payments/${payment.id}`, payload)
                : apiPost<any>('/payments', payload);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: [slug, 'payments'] });
            qc.invalidateQueries({ queryKey: [slug, 'treasury-accounts'] });
            onClose();
        },
        onError: (err: any) => setError(err?.message || err?.errors
            ? Object.values(err.errors || {}).flat().join(' | ')
            : 'فشل الحفظ. تحقق من البيانات.'),
    });

    const handleSave = () => {
        if (!form.payment_date)        { setError('تاريخ الدفعة مطلوب'); return; }
        if (!form.amount || Number(form.amount) <= 0) { setError('المبلغ يجب أن يكون أكبر من 0'); return; }
        if (!form.payment_mode_id)     { setError('طريقة الدفع مطلوبة'); return; }
        if (!form.treasury_account_id) { setError('الحساب المالي مطلوب'); return; }
        if (!form.fiscal_year_id)      { setError('السنة المالية مطلوبة'); return; }
        saveMutation.mutate(form);
    };

    return (
        <Modal open={open} onClose={onClose} size="lg"
            title={isEdit ? `تعديل دفعة — ${payment?.payment_number || ''}` : 'دفعة جديدة'}
            subtitle={isEdit ? '' : 'تسجيل دفعة مستقلة أو مرتبطة بمتعامل'}
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
            {error && <AlertBar variant="red" style={{ marginBottom: 12 }}>{error}</AlertBar>}
            <div className="fgrid c2">

                {/* الاتجاه */}
                <div className="fg s2">
                    <label className="req">اتجاه الدفعة</label>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        {[
                            { val: 'in',  label: 'مقبوض (من زبون)',  icon: 'ti-arrow-down-circle', color: 'var(--em)' },
                            { val: 'out', label: 'مدفوع (لمورد / مصروف)', icon: 'ti-arrow-up-circle', color: 'var(--red)' },
                        ].map(opt => (
                            <button key={opt.val}
                                onClick={() => set('direction', opt.val)}
                                style={{
                                    flex: 1, padding: '10px 14px', borderRadius: 'var(--r2)',
                                    border: `2px solid ${form.direction === opt.val ? opt.color : 'var(--b2)'}`,
                                    background: form.direction === opt.val ? 'var(--emb)' : 'var(--bg3)',
                                    color: form.direction === opt.val ? opt.color : 'var(--t3)',
                                    cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
                                    fontWeight: 700, fontSize: 13,
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    transition: '.15s',
                                }}>
                                <i className={`ti ${opt.icon}`}/>
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* التاريخ */}
                <div className="fg">
                    <label className="req">تاريخ الدفعة</label>
                    <input type="date" value={form.payment_date}
                        onChange={e => set('payment_date', e.target.value)} />
                </div>

                {/* المبلغ */}
                <div className="fg">
                    <label className="req">المبلغ</label>
                    <div className="inp-row">
                        <input type="number" step="0.01" min="0"
                            value={form.amount}
                            placeholder="0.00"
                            onChange={e => set('amount', e.target.value)} />
                        <div className="inp-suf">دج</div>
                    </div>
                </div>

                {/* طريقة الدفع */}
                <div className="fg">
                    <label className="req">طريقة الدفع</label>
                    <select value={form.payment_mode_id as string}
                        onChange={e => handleModeChange(e.target.value)}>
                        <option value="">— اختر —</option>
                        {paymentModes.filter((m: any) => m.active).map((m: any) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                </div>

                {/* الحساب */}
                <div className="fg">
                    <label className="req">الحساب المالي</label>
                    <select value={form.treasury_account_id as string}
                        onChange={e => set('treasury_account_id', e.target.value)}>
                        <option value="">— اختر —</option>
                        {accounts.filter((a: any) => a.active).map((a: any) => (
                            <option key={a.id} value={a.id}>
                                {a.name} — {fmt(Number(a.current_balance) || 0)} دج
                            </option>
                        ))}
                    </select>
                </div>

                {/* المتعامل */}
                <div className="fg">
                    <label>المتعامل (اختياري)</label>
                    <select value={form.party_id as string}
                        onChange={e => {
                            const pid = e.target.value;
                            set('party_id', pid);
                            // كشف تلقائي للاتجاه حسب نوع المتعامل
                            if (pid) {
                                const p = parties.find((pp: any) => String(pp.id) === String(pid));
                                const typeName = p?.party_type?.name;
                                if (typeName === 'supplier') {
                                    set('direction', 'out');
                                } else if (typeName === 'client') {
                                    set('direction', 'in');
                                }
                                // 'both' → لا يتغير، يبقى ما اختاره المستخدم
                            }
                        }}>
                        <option value="">— بدون متعامل —</option>
                        {parties.map((p: any) => {
                            const typeName = p.party_type?.name;
                            const tag = typeName === 'supplier' ? ' مورد' : typeName === 'client' ? ' زبون' : '';
                            return <option key={p.id} value={p.id}>{p.name}{tag}</option>;
                        })}
                    </select>
                </div>

                {/* الحالة */}
                <div className="fg">
                    <label>الحالة</label>
                    <select value={form.status}
                        onChange={e => set('status', e.target.value as 'confirmed' | 'pending')}>
                        <option value="confirmed">مؤكدة — يُحدَّث الرصيد فوراً</option>
                        <option value="pending">معلقة — لا يُحدَّث الرصيد</option>
                    </select>
                </div>

                {/* المرجع */}
                <div className="fg">
                    <label>رقم المرجع</label>
                    <input value={form.reference}
                        onChange={e => set('reference', e.target.value)}
                        placeholder="رقم الشيك، CCP، وصل..." />
                </div>

                {/* المرجع البنكي */}
                <div className="fg">
                    <label>المرجع البنكي</label>
                    <input value={form.bank_reference}
                        onChange={e => set('bank_reference', e.target.value)}
                        placeholder="مرجع التحويل..." />
                </div>

                {/* رقم الدفعة */}
                <div className="fg">
                    <label>رقم الدفعة</label>
                    <input value={form.payment_number}
                        onChange={e => set('payment_number', e.target.value)}
                        placeholder="يُولَّد تلقائياً إن تُرك فارغاً"
                        style={{ fontFamily: 'monospace' }} />
                </div>

                {/* ملاحظات */}
                <div className="fg s2">
                    <label>ملاحظات</label>
                    <textarea value={form.notes}
                        onChange={e => set('notes', e.target.value)}
                        placeholder="ملاحظات إضافية..." rows={2} />
                </div>
            </div>
        </Modal>
    );
}
