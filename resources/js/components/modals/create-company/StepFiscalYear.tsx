// Step 2: Fiscal Year
import { useState, useEffect } from "react";
import { apiPost } from "@/lib/api/core/client";
import type { Company, FiscalYear } from "./types";
import { currentYear } from "./helpers";
import StepFiscalYearHeader from "./StepFiscalYearHeader";
import YearPicker from "./YearPicker";
import CustomDatesSection from "./CustomDatesSection";
import FiscalYearPreview from "./FiscalYearPreview";
import StepFiscalYearFooter from "./StepFiscalYearFooter";

export default function StepFiscalYear({
    company,
    onDone,
    onBack,
}: {
    company: Company;
    onDone: (fy: FiscalYear) => void;
    onBack: () => void;
}) {
    const [yearNum, setYearNum] = useState(String(currentYear));
    const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
    const [endDate, setEndDate] = useState(`${currentYear}-12-31`);
    const [useCustom, setUseCustom] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // تحديث التواريخ تلقائياً عند تغيير السنة
    useEffect(() => {
        const y = parseInt(yearNum);
        if (!isNaN(y) && y >= 2000 && y <= 2100 && !useCustom) {
            setStartDate(`${y}-01-01`);
            setEndDate(`${y}-12-31`);
        }
    }, [yearNum, useCustom]);

    const handleCreate = async () => {
        const y = parseInt(yearNum);
        if (isNaN(y) || y < 2000 || y > 2100) {
            setError("أدخل سنة صحيحة بين 2000 و 2100");
            return;
        }
        if (startDate >= endDate) {
            setError("تاريخ البداية يجب أن يكون قبل تاريخ النهاية");
            return;
        }
        setLoading(true);
  setError(null);
  try {
    const fy = await apiPost<FiscalYear>(`/${company.slug}/fiscal-years`, {
      name: yearNum,
      start_date: startDate,
      end_date: endDate,
      is_current: true,
    }, { _skipSlug: true } as any);
    onDone(fy);
  } catch (e: any) {
    setError(e?.response?.data?.message ?? "فشل إنشاء السنة المالية");
  } finally {
    setLoading(false);
  }
};

    const validYear =
        !isNaN(parseInt(yearNum)) &&
        parseInt(yearNum) >= 2000 &&
        parseInt(yearNum) <= 2100;

    return (
        <>
            {/* Header */}
            <StepFiscalYearHeader onBack={onBack} company={company} />

            {/* Body */}
            <div style={{ padding: "20px 22px" }}>
                {/* Notice */}
                <div
                    style={{
                        padding: "10px 14px",
                        borderRadius: 10,
                        marginBottom: 16,
                        background: "var(--emb)",
                        border: "1px solid var(--embo)",
                        color: "var(--em)",
                        fontSize: 12,
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                    }}
                >
                    <i
                        className="ti ti-info-circle"
                        style={{ fontSize: 15, marginTop: 1, flexShrink: 0 }}
                    />
                    <span>
                        السنة المالية ضرورية للبدء بتسجيل الفواتير والحركات
                        المالية. يمكنك إضافة سنوات أخرى لاحقاً.
                    </span>
                </div>

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
                        <i className="ti ti-alert-circle" />
                        {error}
                    </div>
                )}

                {/* السنة */}
                <YearPicker
                    yearNum={yearNum}
                    setYearNum={setYearNum}
                    setError={setError}
                    validYear={validYear}
                />

                {/* Toggle custom dates */}
                <CustomDatesSection
                    useCustom={useCustom}
                    setUseCustom={setUseCustom}
                    startDate={startDate}
                    setStartDate={setStartDate}
                    endDate={endDate}
                    setEndDate={setEndDate}
                />

                {/* Preview */}
                <FiscalYearPreview
                    validYear={validYear}
                    yearNum={yearNum}
                    startDate={startDate}
                    endDate={endDate}
                />
            </div>

            {/* Footer */}
            <StepFiscalYearFooter
                onBack={onBack}
                handleCreate={handleCreate}
                loading={loading}
                validYear={validYear}
            />
        </>
    );
}
