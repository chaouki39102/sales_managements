// resources/js/pages/profile/components/InfoTab.tsx
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPut } from "@/lib/api/core/client";
import type { Gender, Wilaya, Commune, UserProfile, ProfileFormData } from "../types";
import { err2str, fmtDate, fmtDT } from "../utils";
import InfoRow from "./InfoRow";
import SectionCard from "./SectionCard";

// ─────────────────────────────────────────────────────────────
// Info Tab
// ─────────────────────────────────────────────────────────────
export default function InfoTab({ profile, canEdit }: { profile: UserProfile; canEdit: boolean }) {
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
    queryFn: () => apiGet<Gender[]>("/genders"),
    staleTime: 10 * 60_000,
  });

  const { data: wilayas }  = useQuery<Wilaya[]>({
    queryKey: ["wilayas"],
    queryFn: () => apiGet<Wilaya[]>("/wilayas", { per_page: 100 }),
    staleTime: 60 * 60_000,
    enabled:  editing,
  });

  const { data: communes } = useQuery<Commune[]>({
    queryKey: ["communes", form.wilaya_id],
    queryFn: () => apiGet<Commune[]>("/communes", {
      per_page: 1000, "filter[wilaya_id]": form.wilaya_id,
    }),
    staleTime: 60 * 60_000,
    enabled:  editing && !!form.wilaya_id,
  });

  const saveMut = useMutation({
    mutationFn: (data: ProfileFormData) => apiPut("/me", {
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
