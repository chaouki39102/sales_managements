// Step 1: Company Info
import { useState, useEffect, useRef } from "react";
import { apiPost } from "@/lib/api/core/client";
import type { Company } from "./types";
import StepCompanyHeader from "./StepCompanyHeader";
import CompanyBasicFields from "./CompanyBasicFields";
import LegalDocsSection from "./LegalDocsSection";
import StepCompanyFooter from "./StepCompanyFooter";

export default function StepCompany({
    onNext,
    onClose,
}: {
    onNext: (company: Company) => void;
    onClose: () => void;
}) {
    // بيانات أساسية (إلزامي: name فقط)
    const [name, setName] = useState("");
    const [commercialName, setCommercialName] = useState("");
    const [activity, setActivity] = useState("");
    const [phone, setPhone] = useState("");
    const [mobile, setMobile] = useState("");
    const [email, setEmail] = useState("");
    const [address, setAddress] = useState("");
    // وثائق قانونية
    const [nif, setNif] = useState("");
    const [nis, setNis] = useState("");
    const [rc, setRc] = useState("");
    const [ai, setAi] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showDocs, setShowDocs] = useState(false);
    const nameRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        nameRef.current?.focus();
    }, []);

    const handleSubmit = async () => {
        const n = name.trim();
        if (!n) {
            setError("اسم الشركة إلزامي");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const payload: Record<string, string> = { name: n };
            if (commercialName.trim())
                payload.commercial_name = commercialName.trim();
            if (activity.trim()) payload.activity = activity.trim();
            if (phone.trim()) payload.phone = phone.trim();
            if (mobile.trim()) payload.mobile = mobile.trim();
            if (email.trim()) payload.email = email.trim();
            if (address.trim()) payload.address = address.trim();
            if (nif.trim()) payload.nif = nif.trim();
            if (nis.trim()) payload.nis = nis.trim();
            if (rc.trim()) payload.rc = rc.trim();
            if (ai.trim()) payload.ai = ai.trim();

            const company = await apiPost<Company>("/companies", payload);
            onNext(company);
        } catch (e: any) {
            const msg =
                e?.response?.data?.message ??
                e?.response?.data?.error ??
                "فشل إنشاء الشركة";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Header */}
            <StepCompanyHeader onClose={onClose} />

            {/* Body */}
            <div
                style={{
                    padding: "20px 22px",
                    overflowY: "auto",
                    maxHeight: "calc(85vh - 200px)",
                }}
            >
                {error && (
                    <div
                        style={{
                            padding: "9px 13px",
                            borderRadius: 10,
                            marginBottom: 14,
                            background: "var(--redb)",
                            border: "1px solid var(--redbo)",
                            color: "var(--red)",
                            fontSize: 12,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                        }}
                    >
                        <i
                            className="ti ti-alert-circle"
                            style={{ fontSize: 14 }}
                        />
                        {error}
                    </div>
                )}

                <CompanyBasicFields
                    nameRef={nameRef}
                    name={name}
                    setName={setName}
                    setError={setError}
                    commercialName={commercialName}
                    setCommercialName={setCommercialName}
                    activity={activity}
                    setActivity={setActivity}
                    phone={phone}
                    setPhone={setPhone}
                    mobile={mobile}
                    setMobile={setMobile}
                    email={email}
                    setEmail={setEmail}
                    address={address}
                    setAddress={setAddress}
                />

                <LegalDocsSection
                    showDocs={showDocs}
                    setShowDocs={setShowDocs}
                    nif={nif}
                    setNif={setNif}
                    nis={nis}
                    setNis={setNis}
                    rc={rc}
                    setRc={setRc}
                    ai={ai}
                    setAi={setAi}
                />
            </div>

            {/* Footer */}
            <StepCompanyFooter
                onClose={onClose}
                handleSubmit={handleSubmit}
                loading={loading}
                name={name}
            />
        </>
    );
}
