// resources/js/pages/profile/components/SecurityTab.tsx
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiPost } from "@/lib/api/core/client";
import type { UserProfile } from "../types";
import { err2str, fmtDate } from "../utils";
import SectionCard from "./SectionCard";

// ─────────────────────────────────────────────────────────────
// Security Tab
// ─────────────────────────────────────────────────────────────
export default function SecurityTab({ profile, canEdit }: { profile: UserProfile; canEdit: boolean }) {
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
      apiPost(`/me/change-password`, {
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
