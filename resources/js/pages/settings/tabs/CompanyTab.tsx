// pages/settings/tabs/CompanyTab.tsx — بيانات الشركة (لا تستخدم settings API — تستخدم company API)

import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import AlertBar from "@/components/ui/AlertBar";
import {
    companiesApi,
    useUpdateCompany,
    useDeactivateCompany,
} from "@/lib/api/endpoints/companies";
import { apiGet, apiUpload } from "@/lib/api/core/client";
import { globalKeys, tenantKeys } from "@/lib/api/core/queryKeys";
import { useActiveSlug, useAppStore } from "@/lib/store/appStore";
import { useAuth } from "@/context/AuthContext";
import { useConfirm } from "@/hooks/useConfirm";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Modal from "@/components/ui/Modal";
import type { Company, ActiveCompany } from "@/lib/api/core/types";
import ImagePreviewModal from '../print-settings/components/ImagePreviewModal';
import {
    str,
    slugifyPortal,
    extractList,
    useDirtyState,
    SaveButton,
    SecHead,
    SettingsLastModified,
} from './_shared';

export function CompanyTab({
    onDirty,
    onClean,
}: {
    onDirty?: () => void;
    onClean?: () => void;
}) {
    const slug = useActiveSlug() ?? "";
    const { activeCompany: company, isLoading, setActiveCompany } = useAuth();
    const updateMutation = useUpdateCompany();
    const deactivateMutation = useDeactivateCompany();
    const navigate = useNavigate();
    const deleteConfirm = useConfirm();
    const _qc = useQueryClient();
    void _qc;
    const { isDirty, markDirty, markClean } = useDirtyState();

    const [form, setForm] = useState({
        name: "",
        commercial_name: "",
        activity: "",
        rc: "",
        rc_date: "",
        nif: "",
        nis: "",
        ai: "",
        legal_form_id: "" as string | number,
        capital_amount: "" as string | number,
        address: "",
        wilaya_id: "" as string | number,
        commune_id: "" as string | number,
        phone: "",
        mobile: "",
        fax: "",
        email: "",
        bank_name: "",
        rib: "",
        portal_slug: "",
    });
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [saveError, setSaveError] = useState<string | null>(null);

    const [qrData, setQrData] = useState<{ url: string; data_uri: string } | null>(null);
    const [qrLoading, setQrLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!company) return;
        const co = company as any;
        setForm({
            name: str(company.name),
            commercial_name: str(company.commercial_name),
            activity: str(co.activity),
            rc: str(co.rc),
            rc_date: str(co.rc_date),
            nif: str(company.nif),
            nis: str(company.nis),
            ai: str(co.ai),
            legal_form_id: co.legal_form_id ?? "",
            capital_amount: co.capital_amount ?? "",
            address: str(company.address),
            wilaya_id: co.wilaya_id ?? "",
            commune_id: co.commune_id ?? "",
            phone: str(company.phone),
            mobile: str(co.mobile),
            fax: str(co.fax),
            email: str(company.email),
            bank_name: str(co.bank_name),
            rib: str(co.rib),
            portal_slug: str(co.portal_slug ?? ""),
        });
    }, [company]);

    const set = (k: string, v: string | number) => {
        setForm((f) => ({ ...f, [k]: v }));
        setFieldErrors((p) => {
            const n = { ...p };
            delete n[k];
            return n;
        });
        markDirty();
        onDirty?.();
    };

    const effectivePortalSlug = (form.portal_slug ?? "").trim()
        ? slugifyPortal(form.portal_slug)
        : (company?.slug ?? "");
    const portalUrl = `${window.location.origin}/portal/${effectivePortalSlug}`;

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(portalUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            /* clipboard غير متاح */
        }
    };

    const handleQr = async () => {
        if (!slug || !effectivePortalSlug) return;
        setQrLoading(true);
        try {
            const res = await companiesApi.portalQr(slug, portalUrl);
            setQrData(res);
        } catch (err: unknown) {
            const e = err as any;
            setSaveError(e?.message ?? "فشل توليد رمز QR");
        } finally {
            setQrLoading(false);
        }
    };

    const handleWaShare = () => {
        window.open(
            `https://wa.me/?text=${encodeURIComponent(
                `بوابة الزبائن — ${portalUrl}`,
            )}`,
            "_blank",
            "noopener",
        );
    };

    const handleEmailShare = () => {
        const subject = encodeURIComponent("بوابة الزبائن");
        const body = encodeURIComponent(
            `مرحباً، يمكنكم الاطلاع على حسابكم من خلال الرابط التالي:\n${portalUrl}`,
        );
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
    };

    const { data: wilayas = [] } = useQuery({
        queryKey: globalKeys.wilayas,
        queryFn: () => apiGet<any>("/wilayas", { per_page: 60 }).then(r => r?.data ?? []),
        staleTime: 60 * 60_000,
    });
    const { data: communes = [] } = useQuery({
        queryKey: globalKeys.communes(Number(form.wilaya_id) || 0),
        queryFn: () => apiGet<any[]>(`/communes/by-wilaya/${form.wilaya_id}`),
        enabled: !!form.wilaya_id,
        staleTime: 30 * 60_000,
    });
    const { data: legalForms = [] } = useQuery({
        queryKey: [...tenantKeys.lookups.legalForms(slug), 'settings-company-tab'],
        queryFn: () => apiGet<any>("/legal-forms", { per_page: 50 }).then(extractList),
        enabled: !!slug,
        staleTime: 60 * 60_000,
        placeholderData: [],
    });

    const handleSave = async () => {
        setSaveError(null);
        setFieldErrors({});
        if (!slug) {
            setSaveError("لم يتم تحديد الشركة");
            return;
        }
        try {
            const updated = await updateMutation.mutateAsync({
                slug,
                data: {
                    ...form,
                    legal_form_id: form.legal_form_id
                        ? Number(form.legal_form_id)
                        : null,
                    wilaya_id: form.wilaya_id ? Number(form.wilaya_id) : null,
                    commune_id: form.commune_id
                        ? Number(form.commune_id)
                        : null,
                    capital_amount: form.capital_amount
                        ? Number(form.capital_amount)
                        : null,
                } as Partial<Company>,
            });

            // ✅ حدّث Zustand فوراً بالبيانات الجديدة
            if (updated) {
                setActiveCompany(updated as unknown as ActiveCompany);
            }

            markClean();
            onClean?.();
        } catch (err: unknown) {
            const e = err as any;
            // ✅ معالجة أخطاء الـ validation بشكل صحيح
            if (e?.errors) {
                const fe: Record<string, string> = {};
                for (const [k, v] of Object.entries(e.errors)) {
                    fe[k] = (v as string[])[0];
                }
                setFieldErrors(fe);
            } else {
                setSaveError(e?.message ?? "فشل حفظ البيانات");
            }
        }
    };

    if (isLoading)
        return (
            <div className="empty">
                <div className="empty-ic">
                    <i className="ti ti-loader" />
                </div>
                <div className="empty-tx">تحميل...</div>
            </div>
        );

    return (
        <div className="g65">
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {saveError && (
                    <AlertBar variant="red" dismissible>
                        {saveError}
                    </AlertBar>
                )}

                <Card>
                    <SecHead icon="ti-building" label="البيانات الرسمية" />
                    <div className="fgrid c2" style={{ gap: 12 }}>
                        <div className="fg s2">
                            <label className="req">الاسم القانوني</label>
                            <input
                                value={form.name}
                                onChange={(e) => set("name", e.target.value)}
                                style={{
                                    borderColor: fieldErrors.name
                                        ? "var(--red)"
                                        : undefined,
                                }}
                            />
                            {fieldErrors.name && (
                                <span
                                    style={{
                                        color: "var(--red)",
                                        fontSize: 11,
                                    }}
                                >
                                    {fieldErrors.name}
                                </span>
                            )}
                        </div>
                        <div className="fg">
                            <label>الاسم التجاري</label>
                            <input
                                value={form.commercial_name}
                                onChange={(e) =>
                                    set("commercial_name", e.target.value)
                                }
                                placeholder="يظهر على الفواتير"
                            />
                        </div>
                        <div className="fg">
                            <label>الشكل القانوني</label>
                            <select
                                value={str(form.legal_form_id)}
                                onChange={(e) =>
                                    set("legal_form_id", e.target.value)
                                }
                            >
                                <option value="">— اختر —</option>
                                {(legalForms as any[]).map((lf: any) => (
                                    <option key={lf.id} value={lf.id}>
                                        {lf.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="fg">
                            <label>رأس المال (دج)</label>
                            <input
                                type="number"
                                value={str(form.capital_amount)}
                                onChange={(e) =>
                                    set("capital_amount", e.target.value)
                                }
                            />
                        </div>
                        <div className="fg s2">
                            <label>قطاع النشاط</label>
                            <input
                                value={form.activity}
                                onChange={(e) =>
                                    set("activity", e.target.value)
                                }
                            />
                        </div>
                    </div>
                </Card>

                <Card>
                    <SecHead
                        icon="ti-id-badge"
                        label="المعرّفات الجبائية"
                        color="var(--blue)"
                    />
                    <div className="fgrid c3" style={{ gap: 12 }}>
                        {[
                            { k: "nif", l: "NIF" },
                            { k: "nis", l: "NIS" },
                            { k: "ai", l: "AI" },
                        ].map(({ k, l }) => (
                            <div className="fg" key={k}>
                                <label>{l}</label>
                                <input
                                    value={(form as any)[k]}
                                    onChange={(e) => set(k, e.target.value)}
                                    style={{
                                        fontFamily: "monospace",
                                        letterSpacing: 1,
                                    }}
                                />
                            </div>
                        ))}
                        <div className="fg s2">
                            <label>RC — السجل التجاري</label>
                            <input
                                value={form.rc}
                                onChange={(e) => set("rc", e.target.value)}
                                style={{ fontFamily: "monospace" }}
                            />
                        </div>
                        <div className="fg">
                            <label>تاريخ RC</label>
                            <input
                                type="date"
                                value={form.rc_date}
                                onChange={(e) => set("rc_date", e.target.value)}
                            />
                        </div>
                    </div>
                </Card>

                <Card>
                    <SecHead
                        icon="ti-map-pin"
                        label="العنوان والاتصال"
                        color="var(--teal)"
                    />
                    <div className="fgrid c3" style={{ gap: 12 }}>
                        <div className="fg">
                            <label>الولاية</label>
                            <select
                                value={str(form.wilaya_id)}
                                onChange={(e) => {
                                    set("wilaya_id", e.target.value);
                                    set("commune_id", "");
                                }}
                            >
                                <option value="">— الولاية —</option>
                                {(wilayas as any[]).map((w: any) => (
                                    <option key={w.id} value={w.id}>
                                        {w.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="fg">
                            <label>البلدية</label>
                            <select
                                value={str(form.commune_id)}
                                onChange={(e) =>
                                    set("commune_id", e.target.value)
                                }
                                disabled={!form.wilaya_id}
                            >
                                <option value="">— البلدية —</option>
                                {(communes as any[]).map((c: any) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="fg s3">
                            <label>العنوان التفصيلي</label>
                            <input
                                value={form.address}
                                onChange={(e) => set("address", e.target.value)}
                            />
                        </div>
                        <div className="fg">
                            <label>الهاتف</label>
                            <input
                                value={form.phone}
                                onChange={(e) => set("phone", e.target.value)}
                            />
                        </div>
                        <div className="fg">
                            <label>الجوال</label>
                            <input
                                value={form.mobile}
                                onChange={(e) => set("mobile", e.target.value)}
                            />
                        </div>
                        <div className="fg">
                            <label>الفاكس</label>
                            <input
                                value={form.fax}
                                onChange={(e) => set("fax", e.target.value)}
                            />
                        </div>
                        <div className="fg s3">
                            <label>البريد الإلكتروني</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) => set("email", e.target.value)}
                            />
                        </div>
                    </div>
                </Card>

                <Card>
                    <SecHead
                        icon="ti-building-bank"
                        label="المعلومات البنكية"
                        color="var(--gold)"
                    />
                    <div className="fgrid c2" style={{ gap: 12 }}>
                        <div className="fg">
                            <label>البنك</label>
                            <select
                                value={form.bank_name}
                                onChange={(e) =>
                                    set("bank_name", e.target.value)
                                }
                            >
                                <option value="">— اختر —</option>
                                {[
                                    "BNA",
                                    "BEA",
                                    "CPA",
                                    "BADR",
                                    "BDL",
                                    "CNEP",
                                    "AGB",
                                    "ABC",
                                    "Société Générale Algérie",
                                    "BNP Paribas El Djazaïr",
                                ].map((b) => (
                                    <option key={b} value={b}>
                                        {b}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="fg">
                            <label>رقم الحساب RIB</label>
                            <input
                                value={form.rib}
                                onChange={(e) => set("rib", e.target.value)}
                                style={{
                                    fontFamily: "monospace",
                                    letterSpacing: 1,
                                }}
                            />
                        </div>
                    </div>
                </Card>

                <Card>
                    <SecHead
                        icon="ti-user-share"
                        label="بوابة الزبائن"
                        color="var(--em)"
                    />
                    <div className="fgrid c1" style={{ gap: 12 }}>
                        <div className="fg">
                            <label>رابط قصير لبوابة الزبائن</label>
                            <input
                                dir="ltr"
                                placeholder="مثال: houda"
                                value={form.portal_slug}
                                onChange={(e) =>
                                    set("portal_slug", e.target.value)
                                }
                                style={{
                                    fontFamily: "monospace",
                                    borderColor: fieldErrors.portal_slug
                                        ? "var(--red)"
                                        : undefined,
                                }}
                            />
                            {fieldErrors.portal_slug && (
                                <span style={{ color: "var(--red)", fontSize: 11 }}>
                                    {fieldErrors.portal_slug}
                                </span>
                            )}
                            <span style={{ fontSize: 11, color: "var(--t4)" }}>
                                أحرف إنجليزية صغيرة وأرقام وشرطات فقط. إذا تُرك
                                فارغاً يُستخدم الرابط الداخلي الحالي.
                            </span>
                        </div>

                        <div className="fg">
                            <label>رابط البوابة</label>
                            <div
                                style={{
                                    display: "flex",
                                    gap: 8,
                                    alignItems: "center",
                                    flexWrap: "wrap",
                                }}
                            >
                                <code
                                    dir="ltr"
                                    style={{
                                        flex: 1,
                                        minWidth: 200,
                                        padding: "7px 9px",
                                        background: "var(--b3)",
                                        borderRadius: 6,
                                        fontSize: 12,
                                        wordBreak: "break-all",
                                    }}
                                >
                                    {portalUrl}
                                </code>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={handleCopyLink}
                                >
                                    <i
                                        className={`ti ${
                                            copied
                                                ? "ti-check"
                                                : "ti-copy"
                                        }`}
                                    />
                                    {copied ? "تم النسخ" : "نسخ الرابط"}
                                </Button>
                            </div>
                        </div>

                        <div
                            style={{
                                display: "flex",
                                gap: 8,
                                flexWrap: "wrap",
                            }}
                        >
                            <Button size="sm" onClick={handleQr} loading={qrLoading}>
                                <i className="ti ti-qrcode" />
                                رمز QR
                            </Button>
                            <Button size="sm" variant="secondary" onClick={handleWaShare}>
                                <i className="ti ti-brand-whatsapp" />
                                واتساب
                            </Button>
                            <Button size="sm" variant="secondary" onClick={handleEmailShare}>
                                <i className="ti ti-mail" />
                                البريد
                            </Button>
                        </div>
                    </div>
                </Card>

                <Modal
                    open={!!qrData}
                    onClose={() => setQrData(null)}
                    title="بوابة الزبائن — رمز QR"
                    size="sm"
                    footer={
                        <Button variant="primary" onClick={() => setQrData(null)}>
                            إغلاق
                        </Button>
                    }
                >
                    {qrData && (
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: 14,
                                padding: 8,
                            }}
                        >
                            <img
                                src={qrData.data_uri}
                                alt="QR بوابة الزبائن"
                                style={{ width: 240, height: 240 }}
                            />
                            <code
                                dir="ltr"
                                style={{
                                    fontSize: 12,
                                    wordBreak: "break-all",
                                    textAlign: "center",
                                }}
                            >
                                {qrData.url}
                            </code>
                            <a
                                href={qrData.data_uri}
                                download="portal-qr.svg"
                                className="btn btn-secondary btn-sm"
                            >
                                <i className="ti ti-download" />
                                تحميل الرمز
                            </a>
                        </div>
                    )}
                </Modal>

                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <SettingsLastModified group="company" />
                    <SaveButton
                        onClick={handleSave}
                        loading={updateMutation.isPending}
                        isDirty={isDirty}
                        onClean={() => {
                            markClean();
                            onClean?.();
                        }}
                    />
                </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <LogoUpload company={company} />
                <InvoicePreviewCard form={form} company={company} />
                <CompanyStatusCard company={company} />
                <Card>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16 }}>
                    <SecHead icon="ti-alert-triangle" label="إجراءات الحساب" color="var(--red)" />
                    <p style={{ fontSize: 12, color: "var(--t4)", lineHeight: 1.5 }}>
                      سيتم تعطيل الشركة ولن تظهر في قائمة الشركات. يمكنك التواصل مع الدعم لاستعادتها.
                    </p>
                    <Button variant="danger" fullWidth onClick={() => deleteConfirm.confirm(`هل تريد تعطيل الشركة «${company?.name}»؟`).then(ok => {
                      if (!ok) return;
                      deactivateMutation.mutateAsync(slug).then(() => {
                        useAppStore.getState().setActiveCompany(null);
                        navigate("/onboarding", { replace: true });
                      }).catch(() => {});
                    })}>
                      تعطيل الشركة
                    </Button>
                  </div>
                </Card>
                <ConfirmDialog {...deleteConfirm.confirmDialogProps} loading={deactivateMutation.isPending} />
            </div>
        </div>
    );
}

function LogoUpload({ company }: { company?: any }) {
    const slug = useActiveSlug() ?? "";
    const inputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [zoomImg, setZoomImg] = useState<string | null>(null);

    useEffect(() => {
        if (company?.avatar) setPreview(company.avatar);
    }, [company?.avatar]);

    const upload = async (file: File) => {
        if (!slug) return;
        setPreview(URL.createObjectURL(file));
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append("avatar", file);
            const res: any = await apiUpload(`/companies/${slug}/avatar`, fd);
            const newAvatar = res?.avatar ?? res?.avatar_url ?? null;
            if (newAvatar) {
                useAppStore.getState().setActiveCompany({
                    ...useAppStore.getState().activeCompany,
                    avatar: newAvatar,
                } as ActiveCompany);
                setPreview(newAvatar);
            }
        } catch {
            setPreview(company?.avatar ?? null);
        } finally {
            setUploading(false);
        }
    };

    return (
        <Card>
            <SecHead icon="ti-photo" label="الشعار" color="var(--purple)" />
            <div
                style={{
                    border: "2px dashed var(--b3)",
                    borderRadius: 10,
                    padding: 20,
                    textAlign: "center",
                    cursor: "pointer",
                    transition: ".15s",
                }}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files[0];
                    if (f) upload(f);
                }}
                onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = "var(--em)")
                }
                onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = "var(--b3)")
                }
            >
                {preview ? (
                    <img
                        src={preview}
                        alt="logo"
                        onClick={(e) => { e.stopPropagation(); setZoomImg(preview); }}
                        style={{
                            maxHeight: 70,
                            maxWidth: "100%",
                            objectFit: "contain",
                            marginBottom: 8,
                            cursor: 'zoom-in',
                        }}
                    />
                ) : (
                    <i
                        className="ti ti-cloud-upload"
                        style={{
                            fontSize: 30,
                            color: "var(--t4)",
                            display: "block",
                            marginBottom: 8,
                        }}
                    />
                )}
                <div
                    style={{
                        fontSize: 12,
                        color: "var(--t4)",
                        fontWeight: 600,
                    }}
                >
                    {uploading ? "جاري الرفع..." : "اضغط أو اسحب الشعار هنا"}
                </div>
                <div style={{ fontSize: 10, color: "var(--t4)", marginTop: 3 }}>
                    PNG, SVG, JPG — حد أقصى 2MB
                </div>
            </div>
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) upload(f);
                }}
            />
            <ImagePreviewModal open={!!zoomImg} src={zoomImg ?? ''} onClose={() => setZoomImg(null)} />
        </Card>
    );
}

function InvoicePreviewCard({ form, company }: { form: any; company?: any }) {
    return (
        <Card>
            <SecHead
                icon="ti-receipt"
                label="معاينة رأس الفاتورة"
                color="var(--teal)"
            />
            <div
                style={{
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    padding: "14px 16px",
                    direction: "rtl",
                    fontFamily: "Tajawal, sans-serif",
                }}
            >
                {company?.avatar && (
                    <img
                        src={company.avatar}
                        alt="logo"
                        style={{
                            height: 40,
                            objectFit: "contain",
                            marginBottom: 8,
                            display: "block",
                        }}
                    />
                )}
                <div
                    style={{
                        fontWeight: 900,
                        fontSize: 13,
                        color: "#0a7c52",
                        marginBottom: 3,
                    }}
                >
                    {form.commercial_name || form.name || "—"}
                </div>
                <div
                    style={{
                        fontSize: 10.5,
                        color: "#64748b",
                        lineHeight: 1.8,
                    }}
                >
                    {form.nif && (
                        <div style={{ fontFamily: "monospace" }}>
                            NIF: {form.nif}
                            {form.rc ? ` | RC: ${form.rc}` : ""}
                        </div>
                    )}
                    {form.ai && (
                        <div style={{ fontFamily: "monospace" }}>
                            AI: {form.ai}
                            {form.nis ? ` | NIS: ${form.nis}` : ""}
                        </div>
                    )}
                    {form.address && <div>{form.address}</div>}
                    {(form.phone || form.mobile) && (
                        <div>
                            Tél:{" "}
                            {[form.phone, form.mobile]
                                .filter(Boolean)
                                .join(" — ")}
                        </div>
                    )}
                    {form.email && <div>{form.email}</div>}
                    {form.rib && (
                        <div style={{ fontFamily: "monospace", fontSize: 9.5 }}>
                            RIB: {form.rib}
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
}

function CompanyStatusCard({ company }: { company?: any }) {
    if (!company) return null;
    const rows = [
        {
            l: "الحالة",
            n: company.is_suspended ? (
                <Badge variant="danger">معلّق</Badge>
            ) : company.active ? (
                <Badge variant="success">نشط</Badge>
            ) : (
                <Badge variant="warning">غير نشط</Badge>
            ),
        },
        {
            l: "التوثيق",
            n: company.is_verified ? (
                <Badge variant="success">موثّق</Badge>
            ) : (
                <Badge variant="default">غير موثّق</Badge>
            ),
        },
        {
            l: "الخطة",
            n: (
                <span
                    style={{
                        fontWeight: 800,
                        color: "var(--em)",
                        textTransform: "uppercase",
                        fontSize: 12,
                    }}
                >
                    {company.plan}
                </span>
            ),
        },
        {
            l: "Slug",
            n: (
                <span
                    style={{
                        fontFamily: "monospace",
                        fontSize: 11,
                        color: "var(--t4)",
                    }}
                >
                    {company.slug}
                </span>
            ),
        },
    ];
    if (company.trial_ends_at) {
        rows.push({
            l: "نهاية التجربة",
            n: (
                <span style={{ fontSize: 12, color: "var(--gold)" }}>
                    {new Date(company.trial_ends_at).toLocaleDateString(
                        "fr-DZ",
                    )}
                </span>
            ),
        });
    }
    return (
        <Card>
            <SecHead
                icon="ti-info-circle"
                label="حالة الحساب"
                color="var(--t4)"
            />
            {rows.map(({ l, n }) => (
                <div
                    key={l}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "7px 0",
                        borderBottom: "1px solid var(--b1)",
                    }}
                >
                    <span style={{ fontSize: 12, color: "var(--t4)" }}>
                        {l}
                    </span>
                    {n}
                </div>
            ))}
        </Card>
    );
}
