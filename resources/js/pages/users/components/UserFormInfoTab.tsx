// resources/js/pages/users/components/UserFormInfoTab.tsx — تبويب المعلومات الأساسية
import type React from "react";
import type { Role, UserFormState } from "../types";
import { inputStyle } from "../constants";
import Field from "./Field";

export default function UserFormInfoTab({
    form,
    f,
    nameRef,
    isEdit,
    roles,
}: {
    form: UserFormState;
    f: <T extends keyof UserFormState>(k: T) => (v: UserFormState[T]) => void;
    nameRef: React.RefObject<HTMLInputElement>;
    isEdit: boolean;
    roles: Role[];
}) {
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
            }}
        >
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                }}
            >
                <Field label="الاسم الكامل" req>
                    <input
                        ref={nameRef}
                        value={form.name}
                        onChange={(e) => f("name")(e.target.value)}
                        style={inputStyle}
                        onFocus={(e) =>
                            (e.target.style.borderColor =
                                "var(--em)")
                        }
                        onBlur={(e) =>
                            (e.target.style.borderColor =
                                "var(--b3)")
                        }
                        placeholder="أحمد محمد"
                    />
                </Field>
                <Field label="اسم المستخدم">
                    <input
                        value={form.username}
                        onChange={(e) =>
                            f("username")(e.target.value)
                        }
                        style={{ ...inputStyle, direction: "ltr" }}
                        onFocus={(e) =>
                            (e.target.style.borderColor =
                                "var(--em)")
                        }
                        onBlur={(e) =>
                            (e.target.style.borderColor =
                                "var(--b3)")
                        }
                        placeholder="ahmed.mohammed"
                    />
                </Field>
            </div>

            <Field label="البريد الإلكتروني" req>
                <input
                    type="email"
                    value={form.email}
                    onChange={(e) => f("email")(e.target.value)}
                    style={{ ...inputStyle, direction: "ltr" }}
                    onFocus={(e) =>
                        (e.target.style.borderColor = "var(--em)")
                    }
                    onBlur={(e) =>
                        (e.target.style.borderColor = "var(--b3)")
                    }
                    placeholder="ahmed@example.com"
                />
            </Field>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                }}
            >
                <Field label="رقم الهاتف">
                    <input
                        value={form.phone}
                        onChange={(e) => f("phone")(e.target.value)}
                        style={{ ...inputStyle, direction: "ltr" }}
                        onFocus={(e) =>
                            (e.target.style.borderColor =
                                "var(--em)")
                        }
                        onBlur={(e) =>
                            (e.target.style.borderColor =
                                "var(--b3)")
                        }
                        placeholder="0550 000 000"
                    />
                </Field>
                <Field label="المسمى الوظيفي">
                    <input
                        value={form.job_title}
                        onChange={(e) =>
                            f("job_title")(e.target.value)
                        }
                        style={inputStyle}
                        onFocus={(e) =>
                            (e.target.style.borderColor =
                                "var(--em)")
                        }
                        onBlur={(e) =>
                            (e.target.style.borderColor =
                                "var(--b3)")
                        }
                        placeholder="محاسب / مدير المبيعات..."
                    />
                </Field>
            </div>

            <Field
                label={
                    isEdit
                        ? "كلمة المرور (اتركها فارغة للإبقاء)"
                        : "كلمة المرور"
                }
                req={!isEdit}
            >
                <input
                    type="password"
                    value={form.password}
                    onChange={(e) => f("password")(e.target.value)}
                    style={{ ...inputStyle, direction: "ltr" }}
                    onFocus={(e) =>
                        (e.target.style.borderColor = "var(--em)")
                    }
                    onBlur={(e) =>
                        (e.target.style.borderColor = "var(--b3)")
                    }
                    placeholder={
                        isEdit ? "••••••••" : "كلمة مرور قوية"
                    }
                />
            </Field>

            <Field label="الدور">
                <select
                    value={form.role}
                    onChange={(e) => f("role")(e.target.value)}
                    style={{ ...inputStyle, cursor: "pointer" }}
                >
                    <option value="">بدون دور</option>
                    {roles.map((r) => (
                        <option key={r.id} value={r.name}>
                            {r.display_name ?? r.name}
                        </option>
                    ))}
                </select>
            </Field>

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: "var(--bg3)",
                    border: "1px solid var(--b1)",
                }}
            >
                <span
                    style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "var(--t2)",
                        flex: 1,
                    }}
                >
                    حالة الحساب
                </span>
                <div
                    className={`sw ${form.active ? "on" : ""}`}
                    onClick={() => f("active")(!form.active)}
                />
                <span
                    style={{
                        fontSize: 12,
                        color: form.active
                            ? "var(--em)"
                            : "var(--red)",
                        fontWeight: 700,
                        minWidth: 40,
                    }}
                >
                    {form.active ? "نشط" : "موقوف"}
                </span>
            </div>
        </div>
    );
}
