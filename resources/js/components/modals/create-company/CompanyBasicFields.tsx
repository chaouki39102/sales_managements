// Step 1: basic info + contact fields
import Field from "./Field";
import SectionTitle from "./SectionTitle";

export default function CompanyBasicFields({
    nameRef,
    name,
    setName,
    setError,
    commercialName,
    setCommercialName,
    activity,
    setActivity,
    phone,
    setPhone,
    mobile,
    setMobile,
    email,
    setEmail,
    address,
    setAddress,
}: {
    nameRef: React.RefObject<HTMLInputElement>;
    name: string;
    setName: React.Dispatch<React.SetStateAction<string>>;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
    commercialName: string;
    setCommercialName: React.Dispatch<React.SetStateAction<string>>;
    activity: string;
    setActivity: React.Dispatch<React.SetStateAction<string>>;
    phone: string;
    setPhone: React.Dispatch<React.SetStateAction<string>>;
    mobile: string;
    setMobile: React.Dispatch<React.SetStateAction<string>>;
    email: string;
    setEmail: React.Dispatch<React.SetStateAction<string>>;
    address: string;
    setAddress: React.Dispatch<React.SetStateAction<string>>;
}) {
    return (
        <>
            {/* ── المعلومات الأساسية */}
            <SectionTitle icon="ti-building" label="المعلومات الأساسية" />

            {/* اسم الشركة — مميز وإلزامي */}
            <div style={{ marginBottom: 14 }}>
                <label
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 12,
                        fontWeight: 800,
                        color: "var(--t2)",
                        marginBottom: 6,
                    }}
                >
                    <i
                        className="ti ti-building-store"
                        style={{ color: "var(--em)", fontSize: 13 }}
                    />
                    اسم الشركة
                    <span style={{ color: "var(--red)", fontSize: 14 }}>
                        *
                    </span>
                    <span
                        style={{
                            fontSize: 9,
                            padding: "1px 8px",
                            borderRadius: 20,
                            background: "var(--emb)",
                            color: "var(--em)",
                            fontWeight: 700,
                            marginRight: 2,
                        }}
                    >
                        إلزامي
                    </span>
                </label>
                <input
                    ref={nameRef}
                    value={name}
                    onChange={(e) => {
                        setName(e.target.value);
                        setError(null);
                    }}
                    placeholder="مثال: شركة الأمل للتجارة والخدمات"
                    dir="rtl"
                    style={{
                        width: "100%",
                        padding: "12px 14px",
                        borderRadius: 11,
                        outline: "none",
                        border: `2px solid ${name.trim() ? "var(--em)" : "var(--b2)"}`,
                        background: name.trim()
                            ? "var(--emb)"
                            : "var(--bg3)",
                        color: "var(--t1)",
                        fontFamily: "Tajawal, sans-serif",
                        fontSize: 14,
                        fontWeight: 700,
                        transition: "all .15s",
                        boxShadow: name.trim()
                            ? "0 0 0 3px var(--emb)"
                            : "none",
                    }}
                    onFocus={(e) => {
                        e.target.style.borderColor = "var(--em)";
                        e.target.style.background = "var(--emb)";
                    }}
                    onBlur={(e) => {
                        if (!e.target.value.trim()) {
                            e.target.style.borderColor = "var(--b2)";
                            e.target.style.background = "var(--bg3)";
                        }
                    }}
                />
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0 12px",
                }}
            >
                <Field
                    label="الاسم التجاري"
                    icon="ti-certificate"
                    value={commercialName}
                    onChange={setCommercialName}
                    placeholder="الاسم التجاري (اختياري)"
                />
                <Field
                    label="النشاط / القطاع"
                    icon="ti-briefcase"
                    value={activity}
                    onChange={setActivity}
                    placeholder="مثال: تجارة جملة"
                />
            </div>

            {/* ── معلومات التواصل */}
            <SectionTitle icon="ti-phone" label="معلومات التواصل" />

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0 12px",
                }}
            >
                <Field
                    label="الهاتف"
                    icon="ti-phone"
                    value={phone}
                    onChange={setPhone}
                    placeholder="023 xx xx xx"
                    type="tel"
                    dir="ltr"
                />
                <Field
                    label="الجوال"
                    icon="ti-device-mobile"
                    value={mobile}
                    onChange={setMobile}
                    placeholder="06 xx xx xx xx"
                    type="tel"
                    dir="ltr"
                />
            </div>

            <Field
                label="البريد الإلكتروني"
                icon="ti-mail"
                value={email}
                onChange={setEmail}
                placeholder="contact@company.dz"
                type="email"
                dir="ltr"
            />

            <Field
                label="العنوان"
                icon="ti-map-pin"
                value={address}
                onChange={setAddress}
                placeholder="الشارع، البلدية، الولاية"
            />
        </>
    );
}
