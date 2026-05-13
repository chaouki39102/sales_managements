// ════════════════════════════════════════════════════════════
// resources/js/pages/fiscal/FiscalYearsPage.tsx
// النسخة النهائية المُحسَّنة — تجمع أفضل الميزات
// ════════════════════════════════════════════════════════════
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useModal } from '@/hooks/useModal';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import KpiCard from '@/components/ui/KpiCard';
import AlertBar from '@/components/ui/AlertBar';
import ProgressBar from '@/components/ui/ProgressBar';
import EmptyState from '@/components/ui/EmptyState';
import apiClient from '@/lib/api/core/client';
import type { FiscalYear } from '@/types';

// ─────────────────────────────────────────────────────────────
// Date helpers — timezone-safe (من النسخة المُحسَّنة)
// ─────────────────────────────────────────────────────────────
const extractDate = (date: unknown): string => {
    if (!date) return '';
    const m = String(date).match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : '';
};

const fmtDate = (date: unknown): string => {
    const d = extractDate(date);
    if (!d) return '—';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
};

const daysBetween = (start: string, end: string): number => {
    const [y1, m1, d1] = start.split('-').map(Number);
    const [y2, m2, d2] = end.split('-').map(Number);
    return Math.round((new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime()) / 86_400_000);
};

const calcProgress = (startStr: string, endStr: string): number => {
    const total = daysBetween(startStr, endStr);
    if (total <= 0) return 0;
    const [y1, m1, d1] = startStr.split('-').map(Number);
    const elapsed = Math.max(0, Math.min(
        (Date.now() - new Date(y1, m1 - 1, d1).getTime()) / 86_400_000,
        total
    ));
    return Math.round((elapsed / total) * 100);
};

const toInput = extractDate;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const safeNextYear = (yearName: string): number => {
    const m = String(yearName ?? '').match(/(\d{4})/);
    if (m) { const n = parseInt(m[1], 10); if (!isNaN(n)) return n + 1; }
    const direct = parseInt(String(yearName ?? ''), 10);
    if (!isNaN(direct)) return direct + 1;
    return new Date().getFullYear() + 1;
};

const resolveClosedByName = (year: FiscalYear): string => {
    const y = year as unknown as Record<string, unknown>;
    for (const key of ['closed_by_user', 'closedBy', 'relations']) {
        const v = y[key];
        if (v && typeof v === 'object') {
            const obj = v as Record<string, unknown>;
            // relations.closedBy
            const inner = (obj as any)?.closedBy || obj;
            if (typeof inner?.name === 'string' && inner.name.trim()) return inner.name.trim();
            if (inner?.id) return `المستخدم #${inner.id}`;
        }
    }
    const cb = y['closed_by'];
    if (cb && (typeof cb === 'number' || (typeof cb === 'string' && !isNaN(Number(cb))))) {
        return `المستخدم #${cb}`;
    }
    return '—';
};

const parseApiError = (err: unknown, fallback: string): string => {
    const e = err as {
        response?: {
            data?: {
                message?: string;
                error?: string;
                errors?: Record<string, string[]>;
            };
        };
        message?: string;
    };
    if (e?.response?.data?.errors) {
        const first = Object.values(e.response.data.errors)[0];
        if (first?.[0]) return first[0];
    }
    if (e?.response?.data?.message) return e.response.data.message;
    if (e?.response?.data?.error) return e.response.data.error;
    if (e?.message) return e.message;
    return fallback;
};

// ─────────────────────────────────────────────────────────────
// Checklist الإقفال
// ─────────────────────────────────────────────────────────────
const CLOSURE_CHECKLIST = [
    { id: 1, label: 'التحقق من توازن الميزانية (Balance Sheet)', dz: 'المادة 131 SCF' },
    { id: 2, label: "مراجعة قيود التسوية الجردية (Écritures d'inventaire)", dz: 'المادة 132 SCF' },
    { id: 3, label: 'ترحيل نتيجة الدورة إلى الأموال الخاصة', dz: 'المادة 137 SCF' },
    { id: 4, label: 'تسوية الأرصدة الدائنة والمدينة مع الأطراف', dz: 'دليل المحاسبة الوطني' },
    { id: 5, label: 'الإقرار بالضرائب (TVA G50 + IBS/IRG)', dz: 'قانون الضرائب المباشرة' },
    { id: 6, label: 'التحقق من جرد المخزون (CUMP/FIFO)', dz: 'المادة 218 SCF' },
];

// ─────────────────────────────────────────────────────────────
// Status Badge
// ─────────────────────────────────────────────────────────────
function StatusBadge({ year }: { year: FiscalYear }) {
    if (year.is_current) return <Badge variant="success"><i className="ti ti-star-filled" style={{ fontSize: 11, color: 'var(--gold)' }}/> الحالية</Badge>;
    if (year.is_closed) return <Badge variant="danger"><i className="ti ti-lock" style={{ fontSize: 11 }}/> مقفلة</Badge>;
    return <Badge variant="info">مفتوحة</Badge>;
}

// ════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════
export default function FiscalYearsPage() {
    const qc = useQueryClient();

    const [editingYear, setEditingYear] = useState<FiscalYear | null>(null);
    const [closingYear, setClosingYear] = useState<FiscalYear | null>(null);
    const [viewingYear, setViewingYear] = useState<FiscalYear | null>(null);

    const addModal = useModal();
    const closeModal = useModal();
    const detailModal = useModal();

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['fiscal-years'],
        queryFn: () => apiClient
            .get('/fiscal-years', { params: { include: 'closedBy', per_page: 50 } })
            .then(r => r.data.data as FiscalYear[]),
        staleTime: 60_000,
    });

    const years = data ?? [];
    const currentYear = years.find(y => y.is_current);
    const openYears = years.filter(y => !y.is_closed);
    const closedYears = years.filter(y => y.is_closed);

    // تذكير G50
    const g50Reminder = useMemo(() => {
        if (!currentYear) return null;
        const endDate = extractDate(currentYear.end_date);
        const diff = Math.round((new Date(endDate).getTime() - Date.now()) / 86_400_000);
        return diff > 0 && diff <= 60 ? diff : null;
    }, [currentYear]);

    // تعيين سنة كحالية
    const setCurrent = useMutation({
        mutationFn: (id: number) => apiClient.put(`/fiscal-years/${id}`, { is_current: true }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['fiscal-years'] }),
    });

    // حذف سنة
    const deleteYear = useMutation({
        mutationFn: (id: number) => apiClient.delete(`/fiscal-years/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['fiscal-years'] }),
    });

    const openAdd = () => { setEditingYear(null); addModal.openModal(); };
    const openEdit = (y: FiscalYear) => { if (!y.is_closed) { setEditingYear(y); addModal.openModal(); } };
    const openClose = (y: FiscalYear) => { setClosingYear(y); closeModal.openModal(); };
    const openDetail = (y: FiscalYear) => { setViewingYear(y); detailModal.openModal(); };

    const handleDelete = async (y: FiscalYear) => {
        if (y.is_closed || y.is_current) return;
        if (!confirm(`هل أنت متأكد من حذف السنة المالية "${y.name}"؟`)) return;
        deleteYear.mutate(y.id);
    };

    return (
        <div className="page on" id="p-fiscalyears">

            <PageHeader
                title="السنوات المالية"
                subtitle={`إدارة الفترات المحاسبية وفق SCF — الحالية: ${currentYear?.name ?? 'غير محددة'}`}
                actions={
                    <Button variant="primary" size="sm" icon={<i className="ti ti-calendar-plus"/>} onClick={openAdd}>
                        سنة مالية جديدة
                    </Button>
                }
            />

            {/* تنبيهات */}
            {isError && (
                <AlertBar variant="red">
                    فشل تحميل السنوات المالية.{' '}
                    <button onClick={() => refetch()} style={{ fontWeight: 700, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
                        إعادة المحاولة
                    </button>
                </AlertBar>
            )}

            {g50Reminder !== null && (
                <AlertBar variant="gold">
                    <strong>تذكير G50:</strong> تبقّى <strong>{g50Reminder} يوماً</strong> على نهاية السنة المالية {currentYear?.name}.
                </AlertBar>
            )}

            {openYears.length > 1 && (
                <AlertBar variant="gold">
                    يوجد <strong>{openYears.length} سنوات مفتوحة</strong> — يُنصح بإقفال السنوات القديمة.
                </AlertBar>
            )}

            {/* KPIs */}
            <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
                <KpiCard variant="green" icon="ti-calendar-check"
                    label="السنة المالية الحالية" value={currentYear?.name ?? '—'}
                    sub={currentYear ? `${fmtDate(currentYear.start_date)} — ${fmtDate(currentYear.end_date)}` : 'لم تُحدَّد بعد'} />
                <KpiCard variant="blue" icon="ti-lock-open"
                    label="سنوات مفتوحة" value={openYears.length}
                    sub={`${openYears.filter(y => y.is_current).length} حالية`} />
                <KpiCard variant="red" icon="ti-lock"
                    label="سنوات مقفلة" value={closedYears.length}
                    sub="مؤرشفة نهائياً" />
                <KpiCard variant="gold" icon="ti-calendar"
                    label="إجمالي الفترات" value={years.length}
                    sub={currentYear && !currentYear.is_closed ? `${calcProgress(toInput(currentYear.start_date), toInput(currentYear.end_date))}٪ مكتمل` : '—'} />
            </div>

            {/* شريط تقدم السنة الحالية */}
            {currentYear && !currentYear.is_closed && (() => {
                const s = toInput(currentYear.start_date), e = toInput(currentYear.end_date);
                const progress = calcProgress(s, e), total = daysBetween(s, e);
                const elapsed = Math.round(progress / 100 * total), remaining = total - elapsed;
                return (
                    <Card
                        title={<><span className="ic ic-sm" style={{ color: 'var(--em)' }}><i className="ti ti-calendar-stats"/></span> تقدم السنة المالية — {currentYear.name}</>}
                        style={{ marginBottom: 18 }}
                    >
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, alignItems: 'center' }}>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
                                    <span style={{ color: 'var(--t4)' }}>{fmtDate(s)}</span>
                                    <span style={{ fontWeight: 700, color: 'var(--em)' }}>{progress}٪</span>
                                    <span style={{ color: 'var(--t4)' }}>{fmtDate(e)}</span>
                                </div>
                                <ProgressBar value={progress} color={progress > 80 ? 'var(--gold)' : 'var(--em)'} height={10} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--t4)' }}>
                                    <span>مضى: <strong style={{ color: 'var(--t2)' }}>{elapsed} يوم</strong></span>
                                    <span>متبقي: <strong style={{ color: remaining < 90 ? 'var(--gold)' : 'var(--t2)' }}>{remaining} يوم</strong></span>
                                    <span>الإجمالي: <strong style={{ color: 'var(--t2)' }}>{total} يوم</strong></span>
                                </div>
                            </div>
                            {remaining < 90 && (
                                <div style={{ padding: '10px 16px', background: 'var(--goldb)', border: '1px solid var(--goldbo)', borderRadius: 'var(--r2)', textAlign: 'center', minWidth: 140 }}>
                                    <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--gold)', lineHeight: 1 }}>{remaining}</div>
                                    <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>يوماً على نهاية السنة</div>
                                </div>
                            )}
                        </div>
                    </Card>
                );
            })()}

            {/* جدول السنوات */}
            {isLoading ? (
                <div className="empty">
                    <div className="empty-ic"><i className="ti ti-loader"/></div>
                    <div className="empty-tx">جاري التحميل...</div>
                </div>
            ) : years.length === 0 ? (
                <EmptyState icon="ti-calendar-off" text="لا توجد سنوات مالية" sub="أنشئ سنتك المالية الأولى"
                    action={<Button variant="primary" onClick={openAdd}><i className="ti ti-plus"/> سنة مالية جديدة</Button>} />
            ) : (
                <Card noHeader style={{ padding: 0 }}>
                    <div className="tw">
                        <table>
                            <thead>
                                <tr>
                                    <th>السنة المالية</th>
                                    <th>بداية الفترة</th>
                                    <th>نهاية الفترة</th>
                                    <th>المدة</th>
                                    <th>التقدم</th>
                                    <th>الحالة</th>
                                    <th>الإقفال</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {years.map(y => {
                                    const s = toInput(y.start_date), e = toInput(y.end_date);
                                    const total = daysBetween(s, e);
                                    const months = Math.round(total / 30.44);
                                    const progress = y.is_closed ? 100 : calcProgress(s, e);
                                    const closedByName = resolveClosedByName(y);

                                    return (
                                        <tr key={y.id} style={{ ...(y.is_current ? { background: 'var(--emb)' } : {}), cursor: 'pointer' }}
                                            onClick={() => openDetail(y)}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{
                                                        width: 36, height: 36, borderRadius: 10,
                                                        background: y.is_closed ? 'var(--bg4)' : y.is_current ? 'var(--emb)' : 'var(--blueb)',
                                                        border: `1px solid ${y.is_closed ? 'var(--b2)' : y.is_current ? 'var(--embo)' : 'var(--bluebo)'}`,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    }}>
                                                        <i className={`ti ${y.is_closed ? 'ti-lock' : y.is_current ? 'ti-star-filled' : 'ti-calendar'}`}
                                                            style={{ fontSize: 16, color: y.is_closed ? 'var(--t4)' : y.is_current ? 'var(--gold)' : 'var(--blue)' }}/>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--t1)' }}>{y.name}</div>
                                                        <div style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'monospace' }}>
                                                            {y.is_current ? '★ الحالية' : y.is_closed ? '🔒 مقفلة' : 'مفتوحة'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="m">{fmtDate(y.start_date)}</td>
                                            <td className="m">{fmtDate(y.end_date)}</td>
                                            <td style={{ fontSize: 12, color: 'var(--t3)' }}>{months} شهراً</td>
                                            <td style={{ minWidth: 120 }}>
                                                {y.is_closed ? (
                                                    <span style={{ fontSize: 11, color: 'var(--t4)', fontStyle: 'italic' }}>مكتملة</span>
                                                ) : (
                                                    <div>
                                                        <ProgressBar value={progress} color={y.is_current ? 'var(--em)' : 'var(--blue)'} height={6}/>
                                                        <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 3, textAlign: 'left' }}>{progress}٪</div>
                                                    </div>
                                                )}
                                            </td>
                                            <td><StatusBadge year={y}/></td>
                                            <td style={{ fontSize: 11, color: 'var(--t4)' }}>
                                                {y.is_closed ? (
                                                    <div>
                                                        <div>{fmtDate(y.closed_at)}</div>
                                                        {closedByName !== '—' && <div style={{ color: 'var(--t3)' }}>{closedByName}</div>}
                                                    </div>
                                                ) : '—'}
                                            </td>
                                            <td onClick={e => e.stopPropagation()}>
                                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                    <Button size="xs" icon={<i className="ti ti-eye"/>} onClick={() => openDetail(y)}/>
                                                    {!y.is_closed && (
                                                        <>
                                                            {!y.is_current && (
                                                                <Button size="xs" variant="info" icon={<i className="ti ti-star"/>}
                                                                    onClick={() => setCurrent.mutate(y.id)} disabled={setCurrent.isPending}/>
                                                            )}
                                                            <Button size="xs" icon={<i className="ti ti-pencil"/>} onClick={() => openEdit(y)}/>
                                                            {y.is_current && (
                                                                <Button size="xs" variant="warning" icon={<i className="ti ti-lock"/>} onClick={() => openClose(y)}>إقفال</Button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Modals */}
            <FiscalYearModal open={addModal.open} year={editingYear} years={years} onClose={addModal.closeModal}/>
            <CloseYearModal open={closeModal.open} year={closingYear} onClose={closeModal.closeModal}/>
            <FiscalYearDetailModal open={detailModal.open} year={viewingYear}
                onClose={detailModal.closeModal}
                onClose2={() => { detailModal.closeModal(); openClose(viewingYear!); }}/>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// MODAL: إضافة / تعديل
// ─────────────────────────────────────────────────────────────
function FiscalYearModal({ open, year, years, onClose }: {
    open: boolean; year: FiscalYear | null; years: FiscalYear[]; onClose: () => void;
}) {
    const isEdit = !!year;
    const qc = useQueryClient();
    const nextY = new Date().getFullYear();

    const [form, setForm] = useState({ name: '', start_date: '', end_date: '', is_current: false });
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;
        setError('');
        if (year) {
            setForm({ name: year.name, start_date: toInput(year.start_date), end_date: toInput(year.end_date), is_current: year.is_current });
        } else {
            const suggested = years.length > 0
                ? Math.max(...years.map(y => safeNextYear(y.name) - 1)) + 1
                : nextY;
            setForm({
                name: String(suggested),
                start_date: `${suggested}-01-01`,
                end_date: `${suggested}-12-31`,
                is_current: years.length === 0,
            });
        }
    }, [open, year, years.length]);

    const set = (k: string, v: string | boolean) => { setForm(f => ({ ...f, [k]: v })); setError(''); };

    const overlapError = useMemo(() => {
        if (!form.start_date || !form.end_date) return '';
        for (const y of years.filter(y => !isEdit || y.id !== year?.id)) {
            const s = toInput(y.start_date), e = toInput(y.end_date);
            if (form.start_date <= e && form.end_date >= s)
                return `تتداخل مع السنة المالية ${y.name} (${fmtDate(s)} — ${fmtDate(e)})`;
        }
        if (form.start_date >= form.end_date) return 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية';
        return '';
    }, [form.start_date, form.end_date, years, year?.id, isEdit]);

    const duration = form.start_date && form.end_date && !overlapError
        ? `${Math.round(daysBetween(form.start_date, form.end_date) / 30.44)} شهراً`
        : null;

    const saveMut = useMutation({
        mutationFn: (d: typeof form) => {
            const payload = { name: d.name, start_date: d.start_date, end_date: d.end_date, is_current: d.is_current };
            return isEdit ? apiClient.put(`/fiscal-years/${year!.id}`, payload) : apiClient.post('/fiscal-years', payload);
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['fiscal-years'] }); onClose(); },
        onError: (err: unknown) => {
            const msg = parseApiError(err, 'فشل الحفظ. تحقق من البيانات.');
            setError(msg.toLowerCase().includes('unique') || msg.toLowerCase().includes('already')
                ? `اسم السنة المالية "${form.name}" موجود مسبقاً` : msg);
        },
    });

    return (
        <Modal open={open} onClose={onClose} size="md"
            title={isEdit ? `تعديل — ${year?.name}` : 'سنة مالية جديدة'}
            subtitle={isEdit ? 'تعديل بيانات السنة المالية' : 'وفق النظام المحاسبي المالي SCF'}
            footer={
                <>
                    <Button onClick={onClose}>إلغاء</Button>
                    <Button variant="primary" icon={<i className="ti ti-device-floppy"/>}
                        onClick={() => saveMut.mutate(form)}
                        disabled={!(form.name && form.start_date && form.end_date && !overlapError && !saveMut.isPending)}>
                        {saveMut.isPending ? 'جاري الحفظ...' : 'حفظ'}
                    </Button>
                </>
            }>
            {(error || overlapError) && <AlertBar variant="red">{error || overlapError}</AlertBar>}

            <div style={{ background: 'var(--blueb)', border: '1px solid var(--bluebo)', borderRadius: 'var(--r2)', padding: '8px 14px', marginBottom: 16, display: 'flex', gap: 8, fontSize: 12, color: 'var(--t2)' }}>
                <i className="ti ti-info-circle" style={{ color: 'var(--blue)', fontSize: 15, flexShrink: 0 }}/>
                السنة المالية في الجزائر: <strong>01 يناير — 31 ديسمبر</strong> (المرسوم 08-156)
            </div>

            <div className="fgrid" style={{ gap: 14 }}>
                <div className="fg s2">
                    <label className="req">اسم السنة المالية</label>
                    <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="مثال: 2025" autoFocus/>
                    <span style={{ fontSize: 10, color: 'var(--t4)', marginTop: 2 }}>يُنصح باستخدام السنة الميلادية</span>
                </div>
                <div className="fg">
                    <label className="req">تاريخ البداية</label>
                    <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)}/>
                </div>
                <div className="fg">
                    <label className="req">تاريخ النهاية</label>
                    <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} min={form.start_date}/>
                </div>
                {duration && !overlapError && (
                    <div className="fg s2">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'var(--emb)', border: '1px solid var(--embo)', borderRadius: 'var(--r2)' }}>
                            <i className="ti ti-check" style={{ color: 'var(--em)', fontSize: 16 }}/>
                            <span style={{ fontSize: 13, color: 'var(--em)', fontWeight: 700 }}>
                                المدة: {duration} ({daysBetween(form.start_date, form.end_date)} يوم)
                            </span>
                        </div>
                    </div>
                )}
                <div className="fg s2">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg3)', border: '1px solid var(--b2)', borderRadius: 'var(--r2)' }}>
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>تعيين كسنة حالية</div>
                            <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>ستُلغى الحالية الأخرى تلقائياً</div>
                        </div>
                        <div className={`sw ${form.is_current ? 'on' : ''}`} onClick={() => set('is_current', !form.is_current)}/>
                    </div>
                </div>
            </div>
        </Modal>
    );
}

// ─────────────────────────────────────────────────────────────
// MODAL: إقفال السنة المالية (مع Checklist)
// ─────────────────────────────────────────────────────────────
function CloseYearModal({ open, year, onClose }: {
    open: boolean; year: FiscalYear | null; onClose: () => void;
}) {
    const qc = useQueryClient();
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');
    const [checked, setChecked] = useState<Set<number>>(new Set());
    const [step, setStep] = useState<'checklist' | 'confirm' | 'success'>('checklist');

    useEffect(() => {
        if (open) { setNotes(''); setError(''); setChecked(new Set()); setStep('checklist'); }
    }, [open]);

    const allChecked = checked.size === CLOSURE_CHECKLIST.length;
    const nextYearName = year ? safeNextYear(year.name) : null;

    const closeMut = useMutation({
        mutationFn: (id: number) => apiClient.post(`/fiscal-years/${id}/close`, { notes: notes || null }),
        onSuccess: async () => {
            setStep('success');
            await qc.refetchQueries({ queryKey: ['fiscal-years'] });
            setTimeout(onClose, 800);
        },
        onError: (err: unknown) => {
            setError(parseApiError(err, 'فشل إقفال السنة المالية. تحقق من المتطلبات.'));
        },
    });

    if (!year) return null;

    return (
        <Modal
            open={open} onClose={onClose} size="md"
            title={
                step === 'success'
                    ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="ti ti-circle-check" style={{ color: 'var(--em)', fontSize: 20 }}/>
                        تم الإقفال بنجاح
                    </span>
                    : <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="ti ti-alert-triangle" style={{ color: 'var(--red)', fontSize: 20 }}/>
                        إقفال السنة المالية {year.name}
                    </span>
            }
            footer={
                step === 'success' ? null : (
                    <>
                        <Button onClick={onClose} disabled={closeMut.isPending}>إلغاء</Button>
                        {step === 'checklist' ? (
                            <Button variant="warning" icon={<i className="ti ti-arrow-left"/>}
                                onClick={() => setStep('confirm')} disabled={!allChecked}>
                                المتابعة للتأكيد
                            </Button>
                        ) : (
                            <Button variant="danger" icon={<i className="ti ti-lock"/>}
                                onClick={() => closeMut.mutate(year.id)} disabled={closeMut.isPending}>
                                {closeMut.isPending ? 'جاري الإقفال...' : 'تأكيد الإقفال النهائي'}
                            </Button>
                        )}
                    </>
                )
            }>
            {step === 'success' ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: '50%',
                        background: 'var(--emb)', border: '2px solid var(--embo)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 16px',
                    }}>
                        <i className="ti ti-circle-check" style={{ fontSize: 32, color: 'var(--em)' }}/>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--t1)', marginBottom: 6 }}>
                        تم إقفال {year.name} بنجاح
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--t4)' }}>
                        جاري إنشاء السنة {nextYearName} وترحيل الأرصدة...
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* تحذير */}
                    <div style={{ display: 'flex', gap: 10, padding: '10px 14px', background: 'var(--redb)', border: '1px solid var(--redbo)', borderRadius: 'var(--r2)' }}>
                        <i className="ti ti-lock" style={{ color: 'var(--red)', fontSize: 18, flexShrink: 0, marginTop: 1 }}/>
                        <div style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.7 }}>
                            <strong>تحذير نهائي:</strong> بعد الإقفال لا يمكن إضافة أو تعديل أي مستند في هذه السنة.
                        </div>
                    </div>

                    {step === 'checklist' && (
                        <>
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', display: 'flex', justifyContent: 'space-between' }}>
                                <span>قائمة تحقق الإقفال — SCF</span>
                                <span style={{ color: allChecked ? 'var(--em)' : 'var(--t4)' }}>{checked.size}/{CLOSURE_CHECKLIST.length}</span>
                            </div>
                            {CLOSURE_CHECKLIST.map(item => (
                                <label key={item.id} style={{
                                    display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
                                    background: checked.has(item.id) ? 'var(--emb)' : 'var(--bg3)',
                                    border: `1px solid ${checked.has(item.id) ? 'var(--embo)' : 'var(--b2)'}`,
                                    borderRadius: 'var(--r2)', cursor: 'pointer',
                                }}>
                                    <input type="checkbox" checked={checked.has(item.id)}
                                        onChange={() => setChecked(prev => {
                                            const n = new Set(prev);
                                            n.has(item.id) ? n.delete(item.id) : n.add(item.id);
                                            return n;
                                        })}
                                        style={{ accentColor: 'var(--em)', width: 16, height: 16, flexShrink: 0 }}/>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: checked.has(item.id) ? 'var(--em)' : 'var(--t1)' }}>{item.label}</div>
                                        <div style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'monospace' }}>{item.dz}</div>
                                    </div>
                                </label>
                            ))}
                        </>
                    )}

                    {step === 'confirm' && (
                        <>
                            {error && <AlertBar variant="red">{error}</AlertBar>}
                            <div className="fg">
                                <label>ملاحظات الإقفال (اختياري)</label>
                                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                                    placeholder="ملاحظات للمدقق..." rows={3} style={{ resize: 'vertical' }}/>
                            </div>
                            <div style={{ padding: '10px 14px', background: 'var(--bg3)', border: '1px solid var(--b2)', borderRadius: 'var(--r2)', fontSize: 12, color: 'var(--t4)' }}>
                                <i className="ti ti-calendar-plus" style={{ fontSize: 14, marginLeft: 6 }}/>
                                سيتم إنشاء السنة المالية <strong>{nextYearName ?? '(التالية)'}</strong> تلقائياً.
                            </div>
                        </>
                    )}
                </div>
            )}
        </Modal>
    );
}

// ─────────────────────────────────────────────────────────────
// MODAL: تفاصيل السنة المالية
// ─────────────────────────────────────────────────────────────
function FiscalYearDetailModal({ open, year, onClose, onClose2 }: {
    open: boolean; year: FiscalYear | null; onClose: () => void; onClose2: () => void;
}) {
    if (!year) return null;

    const s = toInput(year.start_date), e = toInput(year.end_date);
    const totalDays = daysBetween(s, e);
    const progress = year.is_closed ? 100 : calcProgress(s, e);
    const elapsed = Math.round(progress / 100 * totalDays);
    const closedByName = resolveClosedByName(year);
    const closingNotes = (year as unknown as { closing_notes?: string }).closing_notes;

    return (
        <Modal open={open} onClose={onClose} size="md"
            title={`السنة المالية — ${year.name}`}
            subtitle={year.is_closed ? 'مقفلة نهائياً' : year.is_current ? 'السنة الحالية' : 'مفتوحة'}
            footer={
                <>
                    {!year.is_closed && year.is_current && (
                        <Button variant="warning" icon={<i className="ti ti-lock"/>} onClick={onClose2}>إقفال السنة</Button>
                    )}
                    <Button onClick={onClose}>إغلاق</Button>
                </>
            }>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Status */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                    background: year.is_closed ? 'var(--redb)' : year.is_current ? 'var(--emb)' : 'var(--blueb)',
                    border: `1px solid ${year.is_closed ? 'var(--redbo)' : year.is_current ? 'var(--embo)' : 'var(--bluebo)'}`,
                    borderRadius: 'var(--r2)',
                }}>
                    <i className={`ti ${year.is_closed ? 'ti-lock' : year.is_current ? 'ti-star-filled' : 'ti-calendar'}`}
                        style={{ fontSize: 24, color: year.is_closed ? 'var(--red)' : year.is_current ? 'var(--gold)' : 'var(--blue)' }}/>
                    <div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1)' }}>
                            {year.is_closed ? 'مقفلة' : year.is_current ? 'السنة الحالية' : 'مفتوحة'}
                        </div>
                    </div>
                </div>

                {/* Info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                        { label: 'اسم السنة', value: year.name },
                        { label: 'المدة', value: `${Math.round(totalDays / 30.44)} شهراً — ${totalDays} يوم` },
                        { label: 'تاريخ البداية', value: fmtDate(year.start_date) },
                        { label: 'تاريخ النهاية', value: fmtDate(year.end_date) },
                    ].map(({ label, value }) => (
                        <div key={label} style={{ padding: '10px 12px', background: 'var(--bg3)', border: '1px solid var(--b1)', borderRadius: 'var(--r2)' }}>
                            <div style={{ fontSize: 10, color: 'var(--t4)', marginBottom: 4 }}>{label}</div>
                            <div style={{ fontWeight: 700, color: 'var(--t1)', fontSize: 13 }}>{value}</div>
                        </div>
                    ))}
                </div>

                {/* Progress */}
                {!year.is_closed && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                            <span style={{ color: 'var(--t3)' }}>نسبة الإنجاز</span>
                            <span style={{ fontWeight: 700, color: 'var(--em)' }}>{progress}٪</span>
                        </div>
                        <ProgressBar value={progress} height={8}/>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--t4)' }}>
                            <span>مضى: {elapsed} يوم</span>
                            <span>متبقي: {totalDays - elapsed} يوم</span>
                        </div>
                    </div>
                )}

                {/* Closure info */}
                {year.is_closed && (
                    <div style={{ padding: '12px 14px', background: 'var(--bg3)', border: '1px solid var(--b2)', borderRadius: 'var(--r2)' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)', marginBottom: 10 }}>معلومات الإقفال</div>
                        <div className="sr"><span className="sr-l">تاريخ الإقفال</span><span className="sr-v">{fmtDate(year.closed_at)}</span></div>
                        <div className="sr"><span className="sr-l">أُقفلت بواسطة</span><span className="sr-v">{closedByName}</span></div>
                        {closingNotes && <div className="sr"><span className="sr-l">ملاحظات</span><span className="sr-v" style={{ fontSize: 11 }}>{closingNotes}</span></div>}
                    </div>
                )}
            </div>
        </Modal>
    );
}
