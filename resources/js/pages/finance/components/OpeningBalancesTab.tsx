// resources/js/pages/finance/components/OpeningBalancesTab.tsx
// TAB 3 — الأرصدة الافتتاحية
import { useConfirm } from '@/hooks/useConfirm';
import KpiCard      from '@/components/ui/KpiCard';
import EmptyState   from '@/components/ui/EmptyState';
import AlertBar     from '@/components/ui/AlertBar';
import { ConfirmDialog } from '@/components/ui';
import { fmt, emptyTreasuryDraft, emptyPartyDraft } from '../financeUtils';
import { useOpeningBalances } from '../hooks/useOpeningBalances';
import OpeningTreasuryTable from './OpeningTreasuryTable';
import OpeningPartiesTable from './OpeningPartiesTable';

export default function OpeningBalancesTab({ slug, selectedYear }: {
    slug: string;
    selectedYear: any | null;
}) {
    const deleteConfirm = useConfirm();
    const ob = useOpeningBalances(slug, selectedYear);
    const {
        subTab,
        setSubTab,
        yearId,
        partyRows,
        treasuryRows,
        totalDebit,
        totalCredit,
        totalTreasury,
        setTreasuryDrafts,
        setPartyDrafts,
    } = ob;

    if (!yearId) {
        return (
            <EmptyState icon="ti-calendar" text="لم تُحدَّد سنة مالية"
                sub="اختر السنة المالية من القائمة العلوية" />
        );
    }

    return (
        <>
            {/* KPIs */}
            <div className="kpis" style={{ marginBottom: 20 }}>
                <KpiCard variant="blue" icon="ti-building-bank"
                    label="رصيد الخزينة الافتتاحي" value={fmt(totalTreasury)} unit="دج"
                    sub={`${treasuryRows.length} حساب`} />
                <KpiCard variant="red" icon="ti-arrow-down-circle"
                    label="الرصيد الموجب (زبائن)" value={fmt(totalDebit)} unit="دج"
                    sub={`${partyRows.filter(r => (r.current_balance ?? 0) >= 0).length} متعامل`} />
                <KpiCard variant="green" icon="ti-arrow-up-circle"
                    label="الرصيد السالب (موردون)" value={fmt(totalCredit)} unit="دج"
                    sub={`${partyRows.filter(r => (r.current_balance ?? 0) < 0).length} متعامل`} />
            </div>

            {/* Info bar */}
            <AlertBar variant="blue" style={{ marginBottom: 16 }}>
                <i className="ti ti-info-circle" style={{ marginLeft: 6 }}/>
                هذه الأرصدة خاصة بالسنة المالية: <strong>{selectedYear?.name}</strong>.
                تُحدَّث تلقائياً عند إقفال سنة مالية سابقة، أو يمكن إدخالها يدوياً عند بداية التشغيل.
            </AlertBar>

            {/* Sub-tabs */}
            <div className="tabs" style={{ marginBottom: 16 }}>
                <div className={`tab ${subTab === 'treasury' ? 'on' : ''}`}
                    onClick={() => setSubTab('treasury')}>
                    <span className="ic ic-xs"><i className="ti ti-building-bank"/></span>
                    الخزينة
                    {treasuryRows.length > 0 &&
                        <span className="sbi-badge" style={{ marginRight: 6 }}>{treasuryRows.length}</span>}
                </div>
                <div className={`tab ${subTab === 'parties' ? 'on' : ''}`}
                    onClick={() => setSubTab('parties')}>
                    <span className="ic ic-xs"><i className="ti ti-users"/></span>
                    المتعاملون
                    {partyRows.length > 0 &&
                        <span className="sbi-badge" style={{ marginRight: 6 }}>{partyRows.length}</span>}
                </div>
                {!selectedYear?.is_closed && (
                    <div style={{ marginRight: 'auto', display: 'flex', gap: 6 }}>
                        <button onClick={() => {
                            if (subTab === 'treasury') setTreasuryDrafts(prev => [...prev, emptyTreasuryDraft()]);
                            else setPartyDrafts(prev => [...prev, emptyPartyDraft()]);
                        }} style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '7px 16px', background: 'var(--em)',
                            border: 'none', borderRadius: 8, color: '#fff',
                            fontSize: 13, fontWeight: 700, cursor: 'pointer',
                            fontFamily: 'Tajawal, sans-serif',
                        }}>
                            <i className="ti ti-plus" style={{ fontSize: 15 }} />
                            إضافة سطر
                        </button>
                    </div>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════
               TABLEAU — الخزينة
            ═══════════════════════════════════════════════════════════════ */}
            {subTab === 'treasury' && (
                <OpeningTreasuryTable {...ob} selectedYear={selectedYear} deleteConfirm={deleteConfirm} />
            )}

            {/* ═══════════════════════════════════════════════════════════════
               TABLEAU — المتعاملون
            ═══════════════════════════════════════════════════════════════ */}
            {subTab === 'parties' && (
                <OpeningPartiesTable {...ob} selectedYear={selectedYear} deleteConfirm={deleteConfirm} />
            )}

            <ConfirmDialog {...deleteConfirm.confirmDialogProps} />
        </>
    );
}
