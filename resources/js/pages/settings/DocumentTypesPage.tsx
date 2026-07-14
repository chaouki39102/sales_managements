// resources/js/pages/settings/DocumentTypesPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useModal } from '@/hooks/useModal';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import KpiCard from '@/components/ui/KpiCard';
import EmptyState from '@/components/ui/EmptyState';
import AlertBar from '@/components/ui/AlertBar';
import Switch from '@/components/ui/Switch';
import { useTenantQuery, useTenantMutation } from '@/hooks/useTenantQuery';
import { documentTypesApi, useDocumentBaseOpsList } from '@/lib/api/endpoints/documentTypes';
import type { DocumentBaseOperation } from '@/lib/api/endpoints/documentTypes';
import { tenantKeys } from '@/lib/api/core/queryKeys';
import { useConfirm } from '@/hooks/useConfirm';
import { useNotification } from '@/hooks/useNotification';
import { ConfirmDialog } from '@/components/ui';
import { useActiveSlug } from '@/lib/store/appStore';
import type { DocumentType } from '@/types';

// ===============================================
// MAIN COMPONENT
// ===============================================
export default function DocumentTypesPage() {
    const [editing, setEditing] = useState<DocumentType | null>(null);
    const [filter, setFilter] = useState('');
    const modal = useModal();
    const deleteConfirm = useConfirm();
    const notify = useNotification();
    const slug = useActiveSlug();

    // 1. جلب أنواع المستندات
    const { data: items, isLoading, isError, refetch } = useTenantQuery<DocumentType[]>(
        (slug) => tenantKeys.lookups.documentTypes(slug),
        () => documentTypesApi.list({ filter: filter || undefined }),
    );

    // 2. جلب العمليات الأساسية لتحويل id -> اسم
    const { data: operationsData } = useDocumentBaseOpsList();

    // إنشاء خريطة id -> label
    const operationsArray = useMemo(() => {
        return Array.isArray(operationsData) ? operationsData : (operationsData as any)?.data ?? [];
    }, [operationsData]);

    const operationMap = useMemo(() => {
        const map: Record<number, string> = {};
        const ops = operationsArray;
        if (Array.isArray(ops)) {
            // دالة ترجمة احتياطية
            const translate = (name: string) => {
                const dict: Record<string, string> = {
                    sale: 'مبيعات', purchase: 'مشتريات', transfer: 'نقل مخزون', adjustment: 'تسوية (جرد)'
                };
                return dict[name] || name;
            };
            ops.forEach((op: any) => {
                map[op.id] = op.label || translate(op.name) || op.name;
            });
        }
        return map;
    }, [operationsArray]);

    const deleteMutation = useTenantMutation(
        (id: number) => documentTypesApi.delete(id),
        (slug) => tenantKeys.lookups.documentTypes(slug),
        {
            onSuccess: () => notify.success('تم الحذف'),
        },
    );

    const openAdd = () => { setEditing(null); modal.openModal(); };
    const openEdit = (item: DocumentType) => { setEditing(item); modal.openModal(); };
    const handleDelete = async (id: number) => {
        if (await deleteConfirm.confirm('هل تريد حذف نوع المستند هذا؟')) deleteMutation.mutate(id);
    };

    return (
        <div className="page on" id="p-document-types">
            <PageHeader
                title="أنواع المستندات"
                subtitle="تخصيص أسماء المستندات وتأثيرها على المخزون والترقيم"
                actions={
                    <Button variant="primary" size="sm" icon={<i className="ti ti-plus" />} onClick={openAdd}>
                        إضافة نوع جديد
                    </Button>
                }
            />

            {/* KPIs */}
            <div className="kpis" style={{ marginBottom: 16 }}>
                <KpiCard variant="green"  icon="ti-file-text"     label="أنواع المستندات" value={items?.length ?? 0} />
                <KpiCard variant="blue"   icon="ti-package"       label="تأثير على المخزون" value={items?.filter(d => d.affects_stock_direction !== 0).length ?? 0} />
                <KpiCard variant="gold"   icon="ti-calculator"    label="تأثير محاسبي"       value={items?.filter(d => d.affects_accounting).length ?? 0} />
                <KpiCard variant="purple" icon="ti-clipboard-check" label="يتطلب متعامل"        value={items?.filter(d => d.requires_party).length ?? 0} />
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <div className="srch" style={{ flex: 1, display: 'flex' }}>
                    <span className="srch-ic ic ic-xs"><i className="ti ti-search" /></span>
                    <input type="text" placeholder="بحث بالاسم أو الكود..." onChange={e => setFilter(e.target.value)} />
                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="empty"><span className="ic ic-xl"><i className="ti ti-loader" /></span><div className="empty-tx">جارٍ التحميل...</div></div>
            ) : isError ? (
                <AlertBar variant="red">فشل تحميل البيانات. <button onClick={() => refetch()} style={{ fontWeight: 700, textDecoration: 'underline' }}>إعادة المحاولة</button></AlertBar>
            ) : !items || items.length === 0 ? (
                <EmptyState icon="ti-file-off" text="لم يتم العثور على أنواع مستندات" sub="أضف نوعاً جديداً للبدء" action={<Button variant="primary" onClick={openAdd}>إضافة نوع جديد</Button>} />
            ) : (
                <Card noHeader style={{ padding: 0 }}>
                    <div className="tw">
                        <table>
                            <thead>
                                <tr>
                                    <th>الاسم (عربي)</th>
                                    <th>الاسم (لاتيني)</th>
                                    <th>الكود</th>
                                    <th>العملية الأساسية</th>
                                    <th>اتجاه المخزون</th>
                                    <th>يحتاج متعامل</th>
                                    <th>محاسبي</th>
                                    <th>نشط</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item: any) => {
                                    // الحصول على اسم العملية من الخريطة
                                    const operationName = operationMap[item.document_base_operation_id] || '-';
                                    const operationCode = operationsArray.find((o: any) => o.id === item.document_base_operation_id)?.name || '';
                                    // اختيار لون البادج
                                    let badgeVariant: any = 'info';
                                    if (operationCode === 'sale') badgeVariant = 'success';
                                    else if (operationCode === 'purchase') badgeVariant = 'warning';
                                    else if (operationCode === 'transfer') badgeVariant = 'info';
                                    else if (operationCode === 'adjustment') badgeVariant = 'info';

                                    return (
                                        <tr key={item.id}>
                                            <td className="s">{item.name}</td>
                                            <td style={{ color: 'var(--t3)' }}>{item.name_latin}</td>
                                            <td className="m">{item.code}</td>
                                            <td>
                                                <Badge variant={badgeVariant}>
                                                    {operationName}
                                                </Badge>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {item.affects_stock_direction === 1 ? (
                                                    <Badge variant="success">+ دخول</Badge>
                                                ) : item.affects_stock_direction === -1 ? (
                                                    <Badge variant="danger">- خروج</Badge>
                                                ) : (
                                                    <Badge variant="gray">لا تأثير</Badge>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span className="ic ic-xs" style={{ color: item.requires_party ? 'var(--em)' : 'var(--t4)' }}>
                                                    <i className={`ti ${item.requires_party ? 'ti-check' : 'ti-x'}`} />
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span className="ic ic-xs" style={{ color: item.affects_accounting ? 'var(--em)' : 'var(--t4)' }}>
                                                    <i className={`ti ${item.affects_accounting ? 'ti-check' : 'ti-x'}`} />
                                                </span>
                                            </td>
                                            <td><Badge variant={item.active ? 'success' : 'danger'}>{item.active ? 'نشط' : 'موقوف'}</Badge></td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 3 }}>
                                                    <Button size="xs" icon={<i className="ti ti-pencil" />} onClick={() => openEdit(item)} />
                                                    <Button size="xs" variant="danger" icon={<i className="ti ti-trash" />} onClick={() => handleDelete(item.id)} />
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

            {/* Modal */}
            <DocumentTypeModal
                open={modal.open}
                docType={editing}
                slug={slug}
                onClose={modal.closeModal}
            />
            <ConfirmDialog {...deleteConfirm.confirmDialogProps} />
        </div>
    );
}


// ===============================================
// MODAL: Add / Edit Document Type
// ===============================================
// داخل نفس ملف DocumentTypesPage.tsx، استبدلي مكون DocumentTypeModal بهذا:

// ===============================================
// MODAL: Add / Edit Document Type (محسّن)
// ===============================================
// ===============================================
// MODAL: Add / Edit Document Type (إصدار نهائي)
// ===============================================
// ===============================================
// MODAL: Add / Edit Document Type (كامل بعد التعديل)
// ===============================================
// ===============================================
// MODAL: Add / Edit Document Type (مع حماية البيانات التاريخية)
// ===============================================
function DocumentTypeModal({ open, docType, _slug, onClose }: {
    open: boolean; docType: DocumentType | null; _slug: string; onClose: () => void;
}) {
    const isEdit = !!docType;

    // ---------- العمليات الأساسية ----------
    const STATIC_OPERATIONS = [
        { id: 1, name: 'sale',       label: 'مبيعات' },
        { id: 2, name: 'purchase',   label: 'مشتريات' },
        { id: 3, name: 'transfer',   label: 'نقل مخزون' },
        { id: 4, name: 'adjustment', label: 'تسوية (جرد)' },
    ];

    const translateOperationName = (name: string) => {
        const map: Record<string, string> = {
            sale:       'مبيعات',
            purchase:   'مشتريات',
            transfer:   'نقل مخزون',
            adjustment: 'تسوية (جرد)',
        };
        return map[name] || name;
    };

    const { data: serverOps, isLoading: _opsLoading } = useTenantQuery<DocumentBaseOperation[]>(
        (slug) => tenantKeys.lookups.documentBaseOps(slug),
        () => documentTypesApi.listBaseOperations(),
        { enabled: open, staleTime: 2 * 60_000 },
    );

    const operations = React.useMemo(() => {
        const source = (Array.isArray(serverOps) && serverOps.length > 0) ? serverOps : STATIC_OPERATIONS;
        return source.map((op: any) => ({ id: op.id, label: op.label || translateOperationName(op.name) || op.name }));
    }, [serverOps]);

    // ---------- عدد المستندات المنشأة بهذا النوع ----------
    const [docsCount, setDocsCount] = useState(0);
    const [checkingDocs, setCheckingDocs] = useState(false);

    useEffect(() => {
        if (open && isEdit && docType?.id) {
            setCheckingDocs(true);
            documentTypesApi.countDocumentsForType(docType.id)
                .then(res => {
                    const meta = (res as any)?.meta;
                    setDocsCount(meta?.total ?? 0);
                })
                .catch(() => setDocsCount(0))
                .finally(() => setCheckingDocs(false));
        } else {
            setDocsCount(0);
        }
    }, [open, isEdit, docType]);

    // ---------- النموذج ----------
    const [form, setForm] = useState({
        name: '',
        name_latin: '',
        code: '',
        description: '',
        document_base_operation_id: '',
        affects_stock_direction: '0',
        requires_party: true,
        affects_accounting: true,
        is_printable: true,
        display_order: 0,
        active: true,
    });
    const [error, setError] = useState('');

    useEffect(() => {
        if (open) {
            if (docType) {
                setForm({
                    name: docType.name || '',
                    name_latin: docType.name_latin || '',
                    code: docType.code || '',
                    description: docType.description || '',
                    document_base_operation_id: String(docType.document_base_operation_id || ''),
                    affects_stock_direction: String(docType.affects_stock_direction ?? 0),
                    requires_party: docType.requires_party ?? true,
                    affects_accounting: docType.affects_accounting ?? true,
                    is_printable: docType.is_printable ?? true,
                    display_order: docType.display_order ?? 0,
                    active: docType.active ?? true,
                });
            } else {
                setForm({
                    name: '',
                    name_latin: '',
                    code: '',
                    description: '',
                    document_base_operation_id: '',
                    affects_stock_direction: '0',
                    requires_party: true,
                    affects_accounting: true,
                    is_printable: true,
                    display_order: 0,
                    active: true,
                });
            }
            setError('');
        }
    }, [open, docType]);

    const set = (k: string, v: any) => { setForm(f => ({ ...f, [k]: v })); setError(''); };

    const saveMutation = useTenantMutation(
        (data: typeof form) => {
            const payload = {
                ...data,
                document_base_operation_id: parseInt(data.document_base_operation_id) || null,
                affects_stock_direction: parseInt(data.affects_stock_direction),
                display_order: parseInt(String(data.display_order)) || 0,
            };
            return isEdit
                ? documentTypesApi.update(docType!.id, payload)
                : documentTypesApi.create(payload);
        },
        (slug) => tenantKeys.lookups.documentTypes(slug),
        {
            onSuccess: () => onClose(),
            onError: (err: any) => setError(err?.response?.data?.message || 'فشل الحفظ'),
        },
    );

    const handleSave = () => {
        if (!form.name.trim()) { setError('الاسم العربي مطلوب'); return; }
        if (!form.code.trim()) { setError('الكود مطلوب'); return; }
        if (!form.document_base_operation_id) { setError('يجب اختيار العملية الأساسية'); return; }
        saveMutation.mutate(form);
    };

    const hasDocuments = docsCount > 0;
    const criticalFieldsDisabled = isEdit && hasDocuments;

    return (
        <Modal open={open} onClose={onClose} size="md"
            title={isEdit ? `تعديل — ${docType?.name}` : 'إضافة نوع مستند جديد'}
            footer={
                <>
                    <Button onClick={onClose}>إلغاء</Button>
                    <Button variant="primary" icon={<i className="ti ti-device-floppy"/>}
                        onClick={handleSave} disabled={saveMutation.isPending}>
                        {saveMutation.isPending ? 'جارٍ الحفظ...' : 'حفظ'}
                    </Button>
                </>
            }>

            {/* رسالة تحذيرية عند وجود مستندات سابقة */}
            {checkingDocs ? (
                <div style={{ padding: '10px 14px', background: 'var(--bg3)', borderRadius: 'var(--r2)', marginBottom: 12, fontSize: 13, color: 'var(--t3)' }}>
                    جارٍ فحص المستندات المرتبطة...
                </div>
            ) : hasDocuments && (
                <AlertBar variant="gold">
                    <strong>تنبيه هام:</strong> يوجد <strong>{docsCount}</strong> مستند تم إنشاؤه بهذا النوع. لا يمكن تعديل الخصائص المؤثرة على المخزون أو المحاسبة أو العملية الأساسية حفاظاً على سلامة البيانات.
                </AlertBar>
            )}

            {error && <AlertBar variant="red">{error}</AlertBar>}

            <div className="fgrid">
                <div className="fg s2">
                    <label className="req">الاسم العربي</label>
                    <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="مثال: فاتورة البيع" autoFocus />
                </div>
                <div className="fg s2">
                    <label className="req">الاسم اللاتيني</label>
                    <input value={form.name_latin} onChange={e => set('name_latin', e.target.value)} placeholder="Sales Invoice" />
                </div>
                <div className="fg">
                    <label className="req">الكود</label>
                    <input value={form.code} onChange={e => set('code', e.target.value)} placeholder="FV, BL, BCC..." style={{ fontFamily: 'monospace' }} />
                </div>

                {/* العملية الأساسية – معطلة إذا كانت هناك مستندات */}
                <div className="fg">
                    <label className="req">العملية الأساسية</label>
                    <select
                        value={form.document_base_operation_id}
                        onChange={e => set('document_base_operation_id', e.target.value)}
                        disabled={criticalFieldsDisabled}
                        style={{
                            width: '100%', padding: '8px 12px', borderRadius: 'var(--r2)',
                            border: '1px solid var(--b3)', background: criticalFieldsDisabled ? 'var(--bg3)' : 'var(--bg2)',
                            color: form.document_base_operation_id ? 'var(--t1)' : 'var(--t4)',
                            fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none',
                            opacity: criticalFieldsDisabled ? 0.6 : 1,
                            cursor: criticalFieldsDisabled ? 'not-allowed' : 'pointer',
                        }}
                    >
                        <option value="">— اختر —</option>
                        {operations.map((op: any) => (
                            <option key={op.id} value={op.id} style={{ color: 'var(--t1)', background: 'var(--bg2)' }}>
                                {op.label}
                            </option>
                        ))}
                    </select>
                    {criticalFieldsDisabled && <span style={{ fontSize: 10, color: 'var(--gold)', marginTop: 2 }}>لا يمكن التعديل – مرتبط بمستندات سابقة</span>}
                </div>

                <div className="fg">
                    <label className="req">تأثير على المخزون</label>
                    <select value={form.affects_stock_direction} onChange={e => set('affects_stock_direction', e.target.value)}
                        disabled={criticalFieldsDisabled}
                        style={{ opacity: criticalFieldsDisabled ? 0.6 : 1, cursor: criticalFieldsDisabled ? 'not-allowed' : 'pointer', background: criticalFieldsDisabled ? 'var(--bg3)' : undefined }}
                    >
                        <option value="-1">خروج (-1)</option>
                        <option value="0">لا تأثير (0)</option>
                        <option value="1">دخول (+1)</option>
                    </select>
                </div>
                <div className="fg">
                    <label>الوصف</label>
                    <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="وصف اختياري..." />
                </div>
                <div className="fg">
                    <label>يتطلب متعامل (زبون/مورد)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, opacity: criticalFieldsDisabled ? 0.6 : 1 }}>
                        <Switch checked={form.requires_party} onChange={(v) => { if (!criticalFieldsDisabled) set('requires_party', v); }} />
                        {criticalFieldsDisabled && <span style={{ fontSize: 10, color: 'var(--gold)' }}>مُعطل مؤقتاً</span>}
                    </div>
                </div>
                <div className="fg">
                    <label>يؤثر على المحاسبة</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, opacity: criticalFieldsDisabled ? 0.6 : 1 }}>
                        <Switch checked={form.affects_accounting} onChange={(v) => { if (!criticalFieldsDisabled) set('affects_accounting', v); }} />
                        {criticalFieldsDisabled && <span style={{ fontSize: 10, color: 'var(--gold)' }}>مُعطل مؤقتاً</span>}
                    </div>
                </div>
                <div className="fg">
                    <label>قابل للطباعة</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <Switch checked={form.is_printable} onChange={(v) => set('is_printable', v)} />
                    </div>
                </div>
                <div className="fg">
                    <label>ترتيب العرض</label>
                    <input type="number" value={form.display_order} onChange={e => set('display_order', e.target.value)} />
                </div>
                <div className="fg">
                    <label>نشط</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <Switch checked={form.active} onChange={(v) => set('active', v)} />
                    </div>
                </div>
            </div>
        </Modal>
    );
}
