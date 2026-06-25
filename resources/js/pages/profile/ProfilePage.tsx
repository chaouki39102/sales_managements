// ════════════════════════════════════════════════════════════
// resources/js/pages/profile/ProfilePage.tsx
// ════════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/api/core/client";

interface Gender   { id: number; name: string; label: string }
interface Wilaya   { id: number; name: string; arabic_name?: string }
interface Commune  { id: number; name: string; arabic_name?: string; wilaya_id: number }
interface Role     { id: number; name: string; display_name?: string }
interface Permission { id: number; name: string; display_name?: string; group?: string }

interface UserProfile {
  id:                 number;
  name:               string;
  email:              string;
  username?:          string;
  phone?:             string;
  bio?:               string;
  avatar?:            string;
  job_title?:         string;
  birth_date?:        string;
  address?:           string;
  active:             boolean;
  last_login_at?:     string;
  email_verified_at?: string;
  created_at:         string;
  gender_id?:         number;
  commune_id?:        number;
  wilaya_id?:         number;
  gender?:            Gender;
  commune?:           Commune;
  wilaya?:            Wilaya;
  roles?:             Role[];
  permissions?:       Permission[];
}

const err2str = (e: unknown, fb = "حدث خطأ") => {
  const ae = e as any;
  // استخرج أول خطأ من errors إن وجد
  const firstErr = ae?.response?.data?.errors
    ? Object.values(ae.response.data.errors as Record<string, string[]>)[0]?.[0]
    : null;
  return firstErr ?? ae?.response?.data?.message ?? ae?.message ?? fb;
};

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("ar-DZ") : "—";

const fmtDT = (d?: string | null) =>
  d
    ? `${new Date(d).toLocaleDateString("ar-DZ")} — ${new Date(d).toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" })}`
    : "—";

const AV_COLORS = [
  "linear-gradient(135deg,#0a8a5c,#0dbf84)",
  "linear-gradient(135deg,#1a4fd6,#60a5fa)",
  "linear-gradient(135deg,#6920d4,#a78bfa)",
  "linear-gradient(135deg,#b87d0a,#fbbf24)",
  "linear-gradient(135deg,#0d7a8c,#22d3ee)",
  "linear-gradient(135deg,#c43a0a,#fb923c)",
];
const avColor = (id: number) => AV_COLORS[id % AV_COLORS.length];

const ROLE_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  "super-admin": { label: "مدير النظام",  color: "#c43a0a", bg: "#c43a0a18", icon: "ti-crown"      },
  "admin":        { label: "مدير الشركة", color: "#6920d4", bg: "#6920d418", icon: "ti-shield"     },
  "manager":      { label: "مشرف",        color: "#1a4fd6", bg: "#1a4fd618", icon: "ti-user-star"  },
  "accountant":   { label: "محاسب",       color: "#0d7a8c", bg: "#0d7a8c18", icon: "ti-calculator" },
  "seller":       { label: "بائع",        color: "#0a8a5c", bg: "#0a8a5c18", icon: "ti-receipt"    },
  "cashier":      { label: "أمين صندوق",  color: "#b87d0a", bg: "#b87d0a18", icon: "ti-cash"       },
  "viewer":       { label: "مشاهد",       color: "#666",    bg: "#66666618", icon: "ti-eye"        },
};
const getRoleMeta = (name: string) =>
  ROLE_META[name] ?? { label: name, color: "var(--em)", bg: "var(--emb)", icon: "ti-user" };

// يزيل التكرار حسب id أولاً، ثم حسب الاسم ثانياً (لأن الباكاند يُرجع أدواراً متعددة بنفس الاسم ولكن بمعرفات مختلفة)
function dedup<T extends { id: number; name?: string }>(arr: T[]): T[] {
  const seen = new Set<number>();

  // أولاً: dedup حسب id (التكرار الحقيقي)
  let result = arr.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });

  // ثانياً: dedup حسب الاسم للأدوار فقط — نبقي الأول فقط لكل اسم
  const seenName = new Set<string>();
  return result.filter(item => {
    const key = item.name;
    if (key && seenName.has(key)) return false;
    if (key) seenName.add(key);
    return true;
  });
}

function extractPermissionGroup(p: Permission): string {
  if (p.group) return p.group;
  const parts = p.name.split("_");
  if (parts.length >= 2) {
    const resource = parts.slice(1).join("_");
    const AR: Record<string, string> = {
      user: "المستخدمون", role: "الأدوار", permission: "الصلاحيات",
      product: "المنتجات", party: "الأطراف", document: "الوثائق",
      payment: "المدفوعات", expense: "المصاريف", employee: "الموظفون",
      company: "الشركة", setting: "الإعدادات", report: "التقارير",
      fiscal_year: "السنة المالية", inventory: "المخزون",
      warehouse: "المستودعات", stock_movement: "حركة المخزون",
      family: "الفئات", brand: "العلامات التجارية", unit: "الوحدات",
      price_level: "مستويات الأسعار", audit: "السجلات",
      any_user: "المستخدمون", any_role: "الأدوار",
    };
    return AR[resource] ?? resource;
  }
  return "أخرى";
}

function UserAvatar({ user, size = 72 }: { user: UserProfile; size?: number }) {
  const initials = user.name
    .trim()
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  if (user.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.name}
        style={{
          width: size, height: size,
          borderRadius: size * 0.28,
          objectFit: "cover",
          flexShrink: 0,
          border: "3px solid var(--b1)",
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size, height: size,
        borderRadius: size * 0.28,
        flexShrink: 0,
        background: avColor(user.id),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.35,
        fontWeight: 900,
        color: "#fff",
        letterSpacing: -1,
        boxShadow: "0 4px 20px rgba(0,0,0,.15)",
      }}
    >
      {initials}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value?: React.ReactNode }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      gap: 12,
      padding: "10px 0",
      borderBottom: "1px solid var(--b1)",
    }}>
      <div style={{
        width: 32, height: 32,
        borderRadius: 8,
        background: "var(--emb)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <i className={`ti ${icon}`} style={{ color: "var(--em)", fontSize: 15 }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: "var(--t4)", fontWeight: 600, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 14, color: "var(--t1)", fontWeight: 600, wordBreak: "break-word" }}>
          {value ?? <span style={{ color: "var(--t4)", fontStyle: "italic" }}>غير محدد</span>}
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "var(--bg2)",
      borderRadius: 16,
      border: "1px solid var(--b2)",
      overflow: "hidden",
      marginBottom: 16,
    }}>
      <div style={{
        padding: "14px 18px",
        borderBottom: "1px solid var(--b1)",
        background: "var(--bg3)",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}>
        <i className={`ti ${icon}`} style={{ color: "var(--em)", fontSize: 17 }} />
        <span style={{ fontWeight: 800, fontSize: 14, color: "var(--t1)" }}>{title}</span>
      </div>
      <div style={{ padding: "6px 18px 14px" }}>
        {children}
      </div>
    </div>
  );
}

type Tab = "info" | "security" | "permissions";
function TabBar({ active, onChange, canSeePermissions }: {
  active: Tab; onChange: (t: Tab) => void; canSeePermissions: boolean
}) {
  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "info",        label: "المعلومات الشخصية", icon: "ti-user"        },
    { key: "security",    label: "الأمان",             icon: "ti-lock"        },
    ...(canSeePermissions ? [{ key: "permissions" as Tab, label: "الصلاحيات", icon: "ti-shield-check" }] : []),
  ];
  return (
    <div style={{
      display: "flex",
      gap: 4,
      background: "var(--bg3)",
      borderRadius: 12,
      padding: 4,
      marginBottom: 20,
      border: "1px solid var(--b1)",
    }}>
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: 9,
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            transition: "all .15s",
            background: active === t.key ? "var(--em)" : "transparent",
            color: active === t.key ? "#fff" : "var(--t3)",
          }}
        >
          <i className={`ti ${t.icon}`} style={{ fontSize: 15 }} />
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Info Tab
// ─────────────────────────────────────────────────────────────
interface ProfileFormData {
  name:       string;
  username:   string;
  phone:      string;
  bio:        string;
  birth_date: string;
  gender_id:  string;
  address:    string;
  commune_id: string;
  wilaya_id:  string;
}

function InfoTab({ profile, canEdit }: { profile: UserProfile; canEdit: boolean }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form,    setForm]    = useState<ProfileFormData>({
    name:       profile.name       ?? "",
    username:   profile.username   ?? "",
    phone:      profile.phone      ?? "",
    bio:        profile.bio        ?? "",
    birth_date: profile.birth_date ? profile.birth_date.split("T")[0] : "",
    gender_id:  profile.gender_id  ? String(profile.gender_id)  : "",
    address:    profile.address    ?? "",
    commune_id: profile.commune_id ? String(profile.commune_id) : "",
    wilaya_id:  profile.wilaya_id  ? String(profile.wilaya_id)  : "",
  });
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");

  const set = useCallback((k: keyof ProfileFormData, v: string) => {
    setForm(f => {
      const next = { ...f, [k]: v };
      if (k === "wilaya_id") next.commune_id = "";
      return next;
    });
    setError(""); setSuccess("");
  }, []);

  const { data: genders }  = useQuery<Gender[]>({
    queryKey: ["genders"],
    queryFn: () => apiClient.get("/genders").then(r => r.data.data ?? r.data),
    staleTime: 10 * 60_000,
  });

  const { data: wilayas }  = useQuery<Wilaya[]>({
    queryKey: ["wilayas"],
    queryFn: () => apiClient.get("/wilayas", { params: { per_page: 100 } }).then(r => r.data.data ?? r.data),
    staleTime: 60 * 60_000,
    enabled:  editing,
  });

  const { data: communes } = useQuery<Commune[]>({
    queryKey: ["communes", form.wilaya_id],
    queryFn: () => apiClient.get("/communes", {
      params: { per_page: 1000, "filter[wilaya_id]": form.wilaya_id },
    }).then(r => r.data.data ?? r.data),
    staleTime: 60 * 60_000,
    enabled:  editing && !!form.wilaya_id,
  });

  const saveMut = useMutation({
    mutationFn: (data: ProfileFormData) => apiClient.put("/me", {
      name:       data.name,
      username:   data.username  || undefined,
      phone:      data.phone     || undefined,
      bio:        data.bio       || undefined,
      birth_date: data.birth_date|| undefined,
      gender_id:  data.gender_id ? parseInt(data.gender_id)  : undefined,
      address:    data.address   || undefined,
      commune_id: data.commune_id? parseInt(data.commune_id) : undefined,
      wilaya_id:  data.wilaya_id ? parseInt(data.wilaya_id)  : undefined,
    }),
    onSuccess: () => {
      setSuccess("✓ تم حفظ البيانات بنجاح");
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: unknown) => setError(err2str(e, "فشل حفظ البيانات")),
  });

  const handleSave = () => {
    if (!form.name.trim()) { setError("الاسم مطلوب"); return; }
    saveMut.mutate(form);
  };

  if (!editing) {
    return (
      <>
        {success && (
          <div style={{ padding: "10px 14px", borderRadius: 10, background: "var(--emb)", border: "1px solid var(--embo)", color: "var(--em)", fontSize: 13, fontWeight: 600, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <i className="ti ti-check" /> {success}
          </div>
        )}

        <SectionCard title="المعلومات الأساسية" icon="ti-id-badge">
          <InfoRow icon="ti-user"     label="الاسم الكامل"    value={profile.name} />
          <InfoRow icon="ti-at"       label="اسم المستخدم"   value={profile.username ? `@${profile.username}` : undefined} />
          <InfoRow icon="ti-mail"     label="البريد الإلكتروني" value={
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {profile.email}
              {profile.email_verified_at && (
                <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: "var(--emb)", color: "var(--em)", fontWeight: 700 }}>
                  <i className="ti ti-check" /> موثق
                </span>
              )}
            </span>
          } />
          <InfoRow icon="ti-phone"    label="رقم الهاتف"      value={profile.phone} />
          <InfoRow icon="ti-briefcase" label="المسمى الوظيفي" value={profile.job_title} />
          <InfoRow icon="ti-gender-bigender" label="الجنس"   value={profile.gender?.label} />
          <InfoRow icon="ti-cake"     label="تاريخ الميلاد"  value={fmtDate(profile.birth_date)} />
        </SectionCard>

        <SectionCard title="بيانات التواجد" icon="ti-map-pin">
          <InfoRow icon="ti-building-community" label="الولاية"  value={profile.wilaya?.arabic_name  ?? profile.wilaya?.name} />
          <InfoRow icon="ti-home-2"             label="البلدية"  value={profile.commune?.arabic_name ?? profile.commune?.name} />
          <InfoRow icon="ti-map-2"              label="العنوان" value={profile.address} />
        </SectionCard>

        {profile.bio && (
          <SectionCard title="نبذة شخصية" icon="ti-writing">
            <div style={{ padding: "10px 0", fontSize: 14, color: "var(--t2)", lineHeight: 1.7 }}>
              {profile.bio}
            </div>
          </SectionCard>
        )}

        <SectionCard title="إحصائيات الحساب" icon="ti-chart-bar">
          <InfoRow icon="ti-calendar-plus" label="تاريخ الإنشاء"     value={fmtDate(profile.created_at)} />
          <InfoRow icon="ti-login"         label="آخر تسجيل دخول"  value={fmtDT(profile.last_login_at)} />
          <InfoRow icon="ti-toggle-right"  label="حالة الحساب"
            value={
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                background: profile.active ? "var(--emb)" : "var(--redb)",
                color: profile.active ? "var(--em)" : "var(--red)",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
                {profile.active ? "نشط" : "موقوف"}
              </span>
            }
          />
        </SectionCard>

        {canEdit && (
          <button
            onClick={() => { setEditing(true); setSuccess(""); }}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 12,
              border: "2px dashed var(--b2)",
              background: "transparent",
              color: "var(--em)",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all .15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--emb)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <i className="ti ti-pencil" style={{ fontSize: 16 }} />
            تعديل المعلومات الشخصية
          </button>
        )}
      </>
    );
  }

  return (
    <div>
      {error && (
        <div style={{ padding: "10px 14px", borderRadius: 10, background: "var(--redb)", border: "1px solid var(--redbo, #fca5a5)", color: "var(--red)", fontSize: 13, fontWeight: 600, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <i className="ti ti-alert-circle" /> {error}
        </div>
      )}

      <SectionCard title="المعلومات الأساسية" icon="ti-user">
        <div className="fgrid c2" style={{ paddingTop: 10 }}>
          <div className="fg">
            <label className="req">الاسم الكامل</label>
            <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="الاسم الكامل" />
          </div>
          <div className="fg">
            <label>اسم المستخدم</label>
            <input value={form.username} onChange={e => set("username", e.target.value)} placeholder="@username" style={{ fontFamily: "monospace" }} />
          </div>
          <div className="fg">
            <label>رقم الهاتف</label>
            <input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="0XX XXX XXXX" />
          </div>
          <div className="fg">
            <label>الجنس</label>
            <select value={form.gender_id} onChange={e => set("gender_id", e.target.value)}>
              <option value="">— اختر —</option>
              {genders?.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
            </select>
          </div>
          <div className="fg">
            <label>تاريخ الميلاد</label>
            <input type="date" value={form.birth_date} onChange={e => set("birth_date", e.target.value)} />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="بيانات التواجد" icon="ti-map-pin">
        <div className="fgrid c2" style={{ paddingTop: 10 }}>
          <div className="fg">
            <label>الولاية</label>
            <select value={form.wilaya_id} onChange={e => set("wilaya_id", e.target.value)}>
              <option value="">— اختر الولاية —</option>
              {wilayas?.map(w => <option key={w.id} value={w.id}>{w.arabic_name ?? w.name}</option>)}
            </select>
          </div>
          <div className="fg">
            <label>البلدية</label>
            <select value={form.commune_id} onChange={e => set("commune_id", e.target.value)} disabled={!form.wilaya_id}>
              <option value="">— اختر البلدية —</option>
              {communes?.map(c => <option key={c.id} value={c.id}>{c.arabic_name ?? c.name}</option>)}
            </select>
          </div>
          <div className="fg" style={{ gridColumn: "1/-1" }}>
            <label>العنوان التفصيلي</label>
            <input value={form.address} onChange={e => set("address", e.target.value)} placeholder="رقم، شارع، حي..." />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="نبذة شخصية" icon="ti-writing">
        <div className="fg" style={{ paddingTop: 10 }}>
          <label>نبذة عنك</label>
          <textarea
            value={form.bio}
            onChange={e => set("bio", e.target.value)}
            placeholder="اكتب نبذة مختصرة عنك..."
            rows={3}
            style={{ resize: "vertical" }}
          />
        </div>
      </SectionCard>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          onClick={() => { setEditing(false); setError(""); }}
          style={{
            padding: "10px 20px", borderRadius: 10, border: "1px solid var(--b2)",
            background: "var(--bg3)", color: "var(--t2)", fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}
        >
          إلغاء
        </button>
        <button
          onClick={handleSave}
          disabled={saveMut.isPending}
          style={{
            padding: "10px 20px", borderRadius: 10, border: "none",
            background: "var(--em)", color: "#fff", fontSize: 13, fontWeight: 700,
            cursor: saveMut.isPending ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", gap: 7, opacity: saveMut.isPending ? .7 : 1,
          }}
        >
          <i className={`ti ${saveMut.isPending ? "ti-loader" : "ti-device-floppy"}`} />
          {saveMut.isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Security Tab
// ─────────────────────────────────────────────────────────────
function SecurityTab({ profile, canEdit }: { profile: UserProfile; canEdit: boolean }) {
  // الـ backend (AuthController::changePassword) يتوقع:
  //   current_password, new_password, new_password_confirmation
  const [form, setForm] = useState({
    current_password:          "",
    new_password:              "",
    new_password_confirmation: "",
  });
  const [show, setShow] = useState({ current: false, new: false, confirm: false });
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");

  const set = (k: keyof typeof form, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setError(""); setSuccess("");
  };

  const strength = (pw: string): { score: number; label: string; color: string } => {
    if (!pw) return { score: 0, label: "", color: "transparent" };
    let s = 0;
    if (pw.length >= 8)  s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    const labels = ["ضعيفة",  "مقبولة",  "جيدة",  "قوية"];
    const colors  = ["#ef4444", "#f59e0b", "#3b82f6", "#10b981"];
    return { score: s, label: labels[s - 1] ?? "", color: colors[s - 1] ?? "transparent" };
  };

  const pw  = form.new_password;
  const str = strength(pw);

  const changeMut = useMutation({
    mutationFn: (data: typeof form) =>
      apiClient.post(`/me/change-password`, {
        current_password:          data.current_password,
        new_password:              data.new_password,
        new_password_confirmation: data.new_password_confirmation,
      }),
    onSuccess: () => {
      setSuccess("✓ تم تغيير كلمة المرور بنجاح");
      setForm({ current_password: "", new_password: "", new_password_confirmation: "" });
    },
    onError: (e: unknown) => setError(err2str(e, "فشل تغيير كلمة المرور")),
  });

  const handleSave = () => {
    if (!form.current_password) { setError("أدخل كلمة المرور الحالية"); return; }
    if (!form.new_password) { setError("أدخل كلمة المرور الجديدة"); return; }
    if (form.new_password.length < 8) { setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل"); return; }
    if (form.new_password !== form.new_password_confirmation) { setError("كلمتا المرور غير متطابقتين"); return; }
    changeMut.mutate(form);
  };

  return (
    <div>
      {/* Account Status */}
      <SectionCard title="حالة الحساب" icon="ti-shield-check">
        <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 10 }}>
          <div style={{
            padding: "14px 16px",
            borderRadius: 12,
            background: profile.active ? "var(--emb)" : "var(--redb)",
            border: `1px solid ${profile.active ? "var(--embo)" : "var(--redbo, #fca5a5)"}`,
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <i className={`ti ${profile.active ? "ti-shield-check" : "ti-shield-off"}`}
               style={{ fontSize: 22, color: profile.active ? "var(--em)" : "var(--red)" }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: profile.active ? "var(--em)" : "var(--red)" }}>
                {profile.active ? "الحساب نشط ويعمل بشكل طبيعي" : "الحساب موقوف"}
              </div>
              <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 2 }}>
                {profile.active
                  ? "لديك صلاحية الوصول الكاملة وفقاً لدورك"
                  : "تواصل مع مدير النظام لإعادة التفعيل"}
              </div>
            </div>
          </div>

          {profile.email_verified_at && (
            <div style={{
              padding: "12px 16px",
              borderRadius: 12,
              background: "var(--emb)",
              border: "1px solid var(--embo)",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <i className="ti ti-mail-check" style={{ color: "var(--em)", fontSize: 18 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--em)" }}>البريد الإلكتروني موثق</div>
                <div style={{ fontSize: 11, color: "var(--t4)" }}>تم التوثيق: {fmtDate(profile.email_verified_at)}</div>
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      {/* ✅ FIX 1: Change Password — 3 حقول بدل 2 */}
      {canEdit && (
        <SectionCard title="تغيير كلمة المرور" icon="ti-lock">
          {error && (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: "var(--redb)", color: "var(--red)", fontSize: 13, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <i className="ti ti-alert-circle" /> {error}
            </div>
          )}
          {success && (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: "var(--emb)", color: "var(--em)", fontSize: 13, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <i className="ti ti-check" /> {success}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 10 }}>
            {/* حقل كلمة المرور الحالية — جديد */}
            <div className="fg">
              <label className="req">كلمة المرور الحالية</label>
              <div style={{ position: "relative" }}>
                <input
                  type={show.current ? "text" : "password"}
                  value={form.current_password}
                  onChange={e => set("current_password", e.target.value)}
                  placeholder="••••••••"
                  style={{ paddingLeft: 38 }}
                />
                <button
                  onClick={() => setShow(s => ({ ...s, current: !s.current }))}
                  style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--t4)", fontSize: 16 }}
                  type="button"
                >
                  <i className={`ti ${show.current ? "ti-eye-off" : "ti-eye"}`} />
                </button>
              </div>
            </div>

            <div className="fgrid c2">
              <div className="fg">
                <label className="req">كلمة المرور الجديدة</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={show.new ? "text" : "password"}
                    value={form.new_password}
                    onChange={e => set("new_password", e.target.value)}
                    placeholder="••••••••"
                    style={{ paddingLeft: 38 }}
                  />
                  <button
                    onClick={() => setShow(s => ({ ...s, new: !s.new }))}
                    style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--t4)", fontSize: 16 }}
                    type="button"
                  >
                    <i className={`ti ${show.new ? "ti-eye-off" : "ti-eye"}`} />
                  </button>
                </div>
                {pw && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} style={{
                          flex: 1, height: 4, borderRadius: 4,
                          background: str.score >= i ? str.color : "var(--b2)",
                          transition: "background .2s",
                        }} />
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: str.color, fontWeight: 600 }}>
                      قوة كلمة المرور: {str.label}
                    </div>
                  </div>
                )}
              </div>

              <div className="fg">
                <label className="req">تأكيد كلمة المرور</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={show.confirm ? "text" : "password"}
                    value={form.new_password_confirmation}
                    onChange={e => set("new_password_confirmation", e.target.value)}
                    placeholder="••••••••"
                    style={{
                      paddingLeft: 38,
                      borderColor: form.new_password_confirmation && form.new_password !== form.new_password_confirmation
                        ? "var(--red)" : undefined,
                    }}
                  />
                  <button
                    onClick={() => setShow(s => ({ ...s, confirm: !s.confirm }))}
                    style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--t4)", fontSize: 16 }}
                    type="button"
                  >
                    <i className={`ti ${show.confirm ? "ti-eye-off" : "ti-eye"}`} />
                  </button>
                </div>
                {form.new_password_confirmation && form.new_password !== form.new_password_confirmation && (
                  <div style={{ fontSize: 11, color: "var(--red)", marginTop: 4 }}>كلمتا المرور غير متطابقتين</div>
                )}
              </div>
            </div>
          </div>

          {/* Requirements */}
          <div style={{
            marginTop: 12,
            padding: "10px 14px",
            borderRadius: 10,
            background: "var(--bg3)",
            border: "1px solid var(--b1)",
          }}>
            <div style={{ fontSize: 11, color: "var(--t4)", fontWeight: 700, marginBottom: 8 }}>متطلبات كلمة المرور:</div>
            {[
              { test: pw.length >= 8,          label: "8 أحرف على الأقل"          },
              { test: /[A-Z]/.test(pw),        label: "حرف كبير واحد على الأقل"   },
              { test: /[0-9]/.test(pw),        label: "رقم واحد على الأقل"        },
              { test: /[^A-Za-z0-9]/.test(pw), label: "رمز خاص (!, @, # ...)"    },
            ].map((req, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: req.test ? "var(--em)" : "var(--t4)", marginBottom: 3 }}>
                <i className={`ti ${req.test ? "ti-check" : "ti-point"}`} style={{ fontSize: req.test ? 13 : 8 }} />
                {req.label}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
            <button
              onClick={handleSave}
              disabled={changeMut.isPending}
              style={{
                padding: "10px 24px", borderRadius: 10, border: "none",
                background: "var(--em)", color: "#fff", fontSize: 13, fontWeight: 700,
                cursor: changeMut.isPending ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", gap: 7,
                opacity: changeMut.isPending ? .7 : 1,
              }}
            >
              <i className={`ti ${changeMut.isPending ? "ti-loader" : "ti-lock"}`} />
              {changeMut.isPending ? "جاري الحفظ..." : "تغيير كلمة المرور"}
            </button>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Permissions Tab — FIX: dedup الأدوار + إظهار الصلاحيات دائماً
// ─────────────────────────────────────────────────────────────
function PermissionsTab({ profile }: { profile: UserProfile }) {
  // ✅ FIX 2: dedup الأدوار بالـ id
  const roles = React.useMemo(() => dedup(profile.roles ?? []), [profile.roles]);
  const permissions = React.useMemo(() => dedup(profile.permissions ?? []), [profile.permissions]);

  const grouped = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    const g = extractPermissionGroup(p);
    if (!acc[g]) acc[g] = [];
    acc[g].push(p);
    return acc;
  }, {});

  const GC = ["#0a8a5c","#1a4fd6","#6920d4","#b87d0a","#0d7a8c","#c43a0a"];
  const gc = (i: number) => GC[i % GC.length];

  return (
    <div>
      {/* Roles */}
      <SectionCard title="الأدوار المُعيَّنة" icon="ti-shield">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, paddingTop: 10 }}>
          {roles.length === 0 ? (
            <div style={{ color: "var(--t4)", fontSize: 13, padding: "8px 0" }}>لا توجد أدوار معيّنة</div>
          ) : roles.map(r => {
            const meta = getRoleMeta(r.name);
            return (
              <div key={r.id} style={{
                padding: "10px 16px",
                borderRadius: 12,
                background: meta.bg,
                border: `1px solid ${meta.color}30`,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <i className={`ti ${meta.icon}`} style={{ color: meta.color, fontSize: 18 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: meta.color }}>{r.display_name ?? meta.label}</div>
                  <div style={{ fontSize: 10, color: "var(--t4)", fontFamily: "monospace" }}>{r.name}</div>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* ✅ FIX 3: إذا لم تكن هناك صلاحيات مباشرة — اعرض رسالة واضحة */}
      {permissions.length > 0 ? (
        <SectionCard title={`الصلاحيات المباشرة — ${permissions.length} صلاحية`} icon="ti-lock-open">
          <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 10 }}>
            {Object.entries(grouped).map(([group, perms], gi) => (
              <div key={group} style={{
                background: "var(--bg3)",
                borderRadius: 12,
                border: "1px solid var(--b1)",
                overflow: "hidden",
                borderRight: `3px solid ${gc(gi)}`,
              }}>
                <div style={{
                  padding: "10px 14px",
                  borderBottom: "1px solid var(--b1)",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <i className="ti ti-folders" style={{ color: gc(gi), fontSize: 15 }} />
                  <span style={{ fontWeight: 800, fontSize: 13, color: gc(gi) }}>{group}</span>
                  <span style={{
                    marginRight: "auto",
                    fontSize: 11, padding: "1px 8px", borderRadius: 20,
                    background: `${gc(gi)}18`, color: gc(gi), fontWeight: 700,
                  }}>{perms.length}</span>
                </div>
                <div style={{ padding: "10px 14px", display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {perms.map(p => (
                    <span key={p.id} style={{
                      fontSize: 11, padding: "3px 10px", borderRadius: 20,
                      background: "var(--bg4, var(--bg2))",
                      border: `1px solid ${gc(gi)}30`,
                      color: "var(--t2)", fontWeight: 600,
                      display: "flex", alignItems: "center", gap: 5,
                    }}>
                      <i className="ti ti-check" style={{ color: gc(gi), fontSize: 10 }} />
                      {p.display_name ?? p.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : (
        <div style={{
          padding: "20px 24px",
          borderRadius: 14,
          border: "1px dashed var(--b2)",
          background: "var(--bg3)",
          display: "flex",
          alignItems: "center",
          gap: 14,
          color: "var(--t3)",
        }}>
          <i className="ti ti-shield-check" style={{ fontSize: 28, color: "var(--em)", opacity: .6, flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--t2)", marginBottom: 3 }}>
              الصلاحيات مُدارة عبر الأدوار
            </div>
            <div style={{ fontSize: 12 }}>
              جميع صلاحياتك تأتي من {roles.length > 0
                ? `الدور «${roles[0].display_name ?? getRoleMeta(roles[0].name).label}»`
                : "الأدوار المُعيَّنة"}. لا توجد صلاحيات مباشرة مُضافة.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Avatar Upload
// ─────────────────────────────────────────────────────────────
function AvatarUpload({ profile }: { profile: UserProfile }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState("");

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) { setError("الملف يجب أن يكون صورة"); return; }
    if (file.size > 2 * 1024 * 1024)    { setError("حجم الصورة يجب ألا يتجاوز 2 ميجابايت"); return; }
    setUploading(true); setError("");
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      await apiClient.post("/me/avatar", fd, { headers: { "Content-Type": "multipart/form-data" } });
      qc.invalidateQueries({ queryKey: ["profile"] });
    } catch (e) {
      setError(err2str(e, "فشل رفع الصورة"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <UserAvatar user={profile} size={80} />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        title="تغيير الصورة الشخصية"
        style={{
          position: "absolute",
          bottom: -4, left: -4,
          width: 26, height: 26,
          borderRadius: "50%",
          background: "var(--em)",
          border: "2px solid var(--bg1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: uploading ? "not-allowed" : "pointer",
          color: "#fff",
          fontSize: 12,
        }}
      >
        <i className={`ti ${uploading ? "ti-loader" : "ti-camera"}`} />
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      {error && (
        <div style={{
          position: "absolute", top: "110%", right: 0,
          background: "var(--red)", color: "#fff",
          fontSize: 11, padding: "4px 10px", borderRadius: 8,
          whiteSpace: "nowrap", zIndex: 10,
        }}>{error}</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main ProfilePage
// ─────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const [tab, setTab] = useState<Tab>("info");

  const { data: profile, isLoading, isError, refetch } = useQuery<UserProfile>({
    queryKey: ["profile"],
    // GET /{company}/me → UserController::profile() يُحمّل roles+permissions
    // الـ interceptor يُضيف slug تلقائياً لأن /me ليست public path
    queryFn: () => apiClient.get("/me", { params: { include: "roles,permissions,gender,commune,wilaya" } })
      .then(r => r.data?.data ?? r.data),
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="page on">
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "80px 0", gap: 14,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: "var(--emb)", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>
            <i className="ti ti-loader" style={{ color: "var(--em)", fontSize: 24, animation: "spin 1s linear infinite" }} />
          </div>
          <span style={{ color: "var(--t4)", fontSize: 13 }}>جاري تحميل الملف الشخصي...</span>
        </div>
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="page on">
        <div style={{
          padding: "40px", borderRadius: 16, border: "1px solid var(--b2)",
          background: "var(--bg2)", textAlign: "center",
        }}>
          <i className="ti ti-alert-circle" style={{ fontSize: 36, color: "var(--red)", display: "block", marginBottom: 12 }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--t1)", marginBottom: 8 }}>فشل تحميل الملف الشخصي</div>
          <button
            onClick={() => refetch()}
            style={{
              padding: "8px 20px", borderRadius: 10, border: "none",
              background: "var(--em)", color: "#fff", fontWeight: 700, cursor: "pointer",
            }}
          >
            <i className="ti ti-refresh" /> إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  // ✅ FIX 2: dedup الأدوار في الـ hero card أيضاً
  const uniqueRoles = dedup(profile.roles ?? []);
  const primaryRole = uniqueRoles[0];
  const roleMeta    = primaryRole ? getRoleMeta(primaryRole.name) : null;
  const canEdit     = true;
  // ✅ FIX 3: إظهار تبويب الصلاحيات دائماً إذا كان لدى المستخدم أدوار
  const canSeePerms = (profile.roles?.length ?? 0) > 0 || (profile.permissions?.length ?? 0) > 0;

  return (
    <div className="page on" style={{ maxWidth: 800, margin: "0 auto" }}>

      {/* Hero Card */}
      <div style={{
        background: "var(--bg2)",
        borderRadius: 20,
        border: "1px solid var(--b2)",
        overflow: "hidden",
        marginBottom: 20,
      }}>
        {/* Banner */}
        <div style={{
          height: 100,
          background: roleMeta
            ? `linear-gradient(135deg, ${roleMeta.color}30, ${roleMeta.color}10)`
            : "linear-gradient(135deg, var(--emb), var(--bg3))",
          borderBottom: "1px solid var(--b1)",
          position: "relative",
        }}>
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: .08 }}
               viewBox="0 0 400 100" preserveAspectRatio="none">
            {Array.from({ length: 10 }, (_, i) => (
              <circle key={i} cx={i * 45 + 20} cy={50} r={30 + i * 5}
                      fill="none" stroke={roleMeta?.color ?? "var(--em)"} strokeWidth="1" />
            ))}
          </svg>
        </div>

        {/* Profile section */}
        <div style={{ padding: "0 24px 24px", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginTop: -36, marginBottom: 16 }}>
            <div style={{
              padding: 4,
              background: "var(--bg2)",
              borderRadius: 22,
              boxShadow: "0 4px 24px rgba(0,0,0,.12)",
            }}>
              <AvatarUpload profile={profile} />
            </div>

            <div style={{ paddingBottom: 4, flex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: "var(--t1)", lineHeight: 1.2 }}>
                {profile.name}
              </div>
              {profile.job_title && (
                <div style={{ fontSize: 13, color: "var(--t3)", marginTop: 2 }}>{profile.job_title}</div>
              )}
            </div>

            <div style={{ paddingBottom: 4 }}>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                background: profile.active ? "var(--emb)" : "var(--redb)",
                color: profile.active ? "var(--em)" : "var(--red)",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
                {profile.active ? "نشط" : "موقوف"}
              </span>
            </div>
          </div>

          {/* Meta row */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 12px", borderRadius: 10,
              background: "var(--bg3)", border: "1px solid var(--b1)",
              fontSize: 13, color: "var(--t2)",
            }}>
              <i className="ti ti-mail" style={{ color: "var(--em)", fontSize: 14 }} />
              {profile.email}
            </div>

            {profile.phone && (
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "5px 12px", borderRadius: 10,
                background: "var(--bg3)", border: "1px solid var(--b1)",
                fontSize: 13, color: "var(--t2)",
              }}>
                <i className="ti ti-phone" style={{ color: "var(--em)", fontSize: 14 }} />
                {profile.phone}
              </div>
            )}

            {/* ✅ FIX 2: عرض الأدوار بعد dedup فقط */}
            {uniqueRoles.map(r => {
              const m = getRoleMeta(r.name);
              return (
                <div key={r.id} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "5px 12px", borderRadius: 10,
                  background: m.bg, border: `1px solid ${m.color}30`,
                  fontSize: 13, color: m.color, fontWeight: 700,
                }}>
                  <i className={`ti ${m.icon}`} style={{ fontSize: 14 }} />
                  {r.display_name ?? m.label}
                </div>
              );
            })}

            {(profile.wilaya || profile.commune) && (
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "5px 12px", borderRadius: 10,
                background: "var(--bg3)", border: "1px solid var(--b1)",
                fontSize: 13, color: "var(--t2)",
              }}>
                <i className="ti ti-map-pin" style={{ color: "var(--em)", fontSize: 14 }} />
                {[profile.commune?.arabic_name ?? profile.commune?.name,
                  profile.wilaya?.arabic_name ?? profile.wilaya?.name]
                  .filter(Boolean).join("، ")}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs + Content */}
      <TabBar active={tab} onChange={setTab} canSeePermissions={canSeePerms} />

      {tab === "info"        && <InfoTab        profile={profile} canEdit={canEdit} />}
      {tab === "security"    && <SecurityTab    profile={profile} canEdit={canEdit} />}
      {tab === "permissions" && <PermissionsTab profile={profile}                   />}

    </div>
  );
}
