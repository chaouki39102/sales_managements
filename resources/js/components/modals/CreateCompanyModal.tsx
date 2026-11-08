// ════════════════════════════════════════════════
// components/modals/CreateCompanyModal.tsx
// مودال إنشاء شركة متكامل بخطوتين:
//   الخطوة 1: معلومات الشركة (اسم إلزامي، باقي اختياري)
//   الخطوة 2: السنة المالية الأولى (إلزامية)
// ════════════════════════════════════════════════
import { useState, useCallback } from "react";
import type { Company, FiscalYear, CreateCompanyModalProps } from "./create-company/types";
import StepCompany from "./create-company/StepCompany";
import StepFiscalYear from "./create-company/StepFiscalYear";
import StepSuccess from "./create-company/StepSuccess";

// ── Main Modal ────────────────────────────────────────────────────
export function CreateCompanyModal({
    onCreated,
    onClose,
}: CreateCompanyModalProps) {
    type Step = "company" | "fiscal" | "success";
    const [step, setStep] = useState<Step>("company");
    const [company, setCompany] = useState<Company | null>(null);
    const [fiscalYear, setFiscalYear] = useState<FiscalYear | null>(null);

    const handleCompanyCreated = useCallback((c: Company) => {
        setCompany(c);
        setStep("fiscal");
    }, []);

    const handleFiscalDone = useCallback(
        (fy: FiscalYear) => {
            setFiscalYear(fy);
            setStep("success");
            // نستدعي onCreated فوراً — التأخير كان يسبب فقدان navigate state في SetupHub
            // StepSuccess تعرض رسالة النجاح لكن onCreated يُطلق الـ navigate فوراً
            if (company) onCreated(company, fy);
        },
        [company, onCreated],
    );

    return (
        <>
            {/* Overlay */}
            <div
                style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 10010,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(0,0,0,.72)",
                    backdropFilter: "blur(8px)",
                    padding: 16,
                    animation: "fadein .18s ease",
                }}
                onClick={(e) => {
                    if (e.target === e.currentTarget && step !== "success")
                        onClose();
                }}
            >
                {/* Modal */}
                <div
                    style={{
                        background: "var(--bg2)",
                        borderRadius: 20,
                        width: "100%",
                        maxWidth: 520,
                        border: "1px solid var(--b3)",
                        boxShadow: "0 28px 72px rgba(0,0,0,.4)",
                        overflow: "hidden",
                        animation: "slideup .25s cubic-bezier(.34,1.4,.64,1)",
                        direction: "rtl",
                    }}
                >
                    {step === "company" && (
                        <StepCompany
                            onNext={handleCompanyCreated}
                            onClose={onClose}
                        />
                    )}
                    {step === "fiscal" && company && (
                        <StepFiscalYear
                            company={company}
                            onDone={handleFiscalDone}
                            onBack={() => setStep("company")}
                        />
                    )}
                    {step === "success" && company && fiscalYear && (
                        <StepSuccess
                            company={company}
                            fiscalYear={fiscalYear}
                        />
                    )}
                </div>
            </div>
        </>
    );
}

export default CreateCompanyModal;