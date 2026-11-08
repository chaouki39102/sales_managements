// resources/js/pages/finance/components/OpeningTreasuryTable.tsx
// TAB 3 — الأرصدة الافتتاحية: TABLEAU — الخزينة
import type { useConfirm } from '@/hooks/useConfirm';
import Card         from '@/components/ui/Card';
import Badge        from '@/components/ui/Badge';
import { fmt, fmtDate, inputStyle, emptyTreasuryDraft } from '../financeUtils';
import type { OpeningBalancesState } from '../hooks/useOpeningBalances';
import Th from './Th';
import ActionBtn from './ActionBtn';

export default function OpeningTreasuryTable(props: OpeningBalancesState & { selectedYear: any | null; deleteConfirm: ReturnType<typeof useConfirm> }) {
    const {
        loadTreasury,
        treasuryRows,
        totalTreasury,
        accounts,
        treasuryDrafts,
        setTreasuryDrafts,
        editTreasuryId,
        setEditTreasuryId,
        existingTreasuryIds,
        editTreasuryVal,
        setEditTreasuryVal,
        createTreasuryMut,
        deleteMut,
        updateTreasuryMut,
        saveTreasuryDraft,
        startEditTreasury,
        selectedYear,
        deleteConfirm,
    } = props;

    return (
        loadTreasury ? (
            <div className="empty"><div className="empty-ic"><i className="ti ti-loader"/></div>
                <div className="empty-tx">جاري التحميل...</div></div>
        ) : (
            <Card noHeader style={{ padding: 0 }}>
                <div className="tw">
                    <table>
                        <thead>
                            <tr>
                                <Th width="36px">#</Th>
                                <Th width="180px">الحساب</Th>
                                <Th width="100px">النوع</Th>
                                <Th width="140px">الرصيد الافتتاحي</Th>
                                <Th width="100px">آخر تحديث</Th>
                                {!selectedYear?.is_closed && <Th width="100px"></Th>}
                            </tr>
                        </thead>
                        <tbody>
                            {/* Draft rows — خزينة */}
                            {treasuryDrafts.map((d, idx) => (
                                <tr key={`td-${idx}`} style={{ background: 'var(--bg3)' }}>
                                    <td style={{ textAlign: 'center', color: 'var(--em)', fontWeight: 700, fontSize: 11 }}>
                                        D{idx + 1}
                                    </td>
                                    <td>
                                        <select value={d.treasury_account_id}
                                            onChange={e => setTreasuryDrafts(prev => prev.map((r, i) => i === idx ? { ...r, treasury_account_id: parseInt(e.target.value) || '' } : r))}
                                            style={{ ...inputStyle(false),
                                                ...(d.treasury_account_id && (existingTreasuryIds.has(d.treasury_account_id) || treasuryDrafts.some((r, j) => j !== idx && r.treasury_account_id === d.treasury_account_id))
                                                    ? { border: '1px solid var(--red)' } : {}),
                                            }}>
                                            <option value="">— اختر —</option>
                                            {accounts.map((a: any) => (
                                                <option key={a.id} value={a.id}>{a.name}</option>
                                            ))}
                                        </select>
                                        {d.treasury_account_id && (existingTreasuryIds.has(d.treasury_account_id) || treasuryDrafts.some((r, j) => j !== idx && r.treasury_account_id === d.treasury_account_id)) && (
                                            <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 3 }}>
                                                <i className="ti ti-alert-triangle" style={{ fontSize: 11 }} /> هذا الحساب لديه رصيد افتتاحي بالفعل
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ fontSize: 11, color: 'var(--t4)' }}>—</td>
                                    <td>
                                        <div className="inp-row">
                                            <input type="number" value={d.opening_balance}
                                                onChange={e => setTreasuryDrafts(prev => prev.map((r, i) => i === idx ? { ...r, opening_balance: e.target.value } : r))}
                                                style={{ ...inputStyle(false), width: 100 }} />
                                            <span style={{ fontSize: 11, color: 'var(--t4)', whiteSpace: 'nowrap' }}>دج</span>
                                        </div>
                                    </td>
                                    <td style={{ fontSize: 11, color: 'var(--t4)' }}>—</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <ActionBtn icon="ti-device-floppy" color="var(--em)"
                                                disabled={!d.treasury_account_id || !d.opening_balance || createTreasuryMut.isPending
                                                    || (!!d.treasury_account_id && (existingTreasuryIds.has(d.treasury_account_id) || treasuryDrafts.some((r, j) => j !== idx && r.treasury_account_id === d.treasury_account_id)))}
                                                onClick={() => saveTreasuryDraft(idx)} />
                                            <ActionBtn icon="ti-x" color="var(--red)"
                                                onClick={() => setTreasuryDrafts(prev => prev.filter((_, i) => i !== idx))} />
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {/* Existing rows — خزينة */}
                            {treasuryRows.length === 0 && treasuryDrafts.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: 30, color: 'var(--t4)', fontSize: 13 }}>
                                        لا توجد أرصدة افتتاحية — أضف سطراً جديداً أعلاه
                                    </td>
                                </tr>
                            ) : treasuryRows.map((row: any, i: number) => (
                                <tr key={row.id}>
                                    <td style={{ textAlign: 'center', color: 'var(--t4)', fontSize: 11 }}>{i + 1}</td>
                                    <td className="s">
                                        {row.treasury_account?.name
                                            ?? row.treasuryAccount?.name
                                            ?? `حساب #${row.treasury_account_id}`}
                                    </td>
                                    <td>
                                        <Badge variant="gray" style={{ fontSize: 10 }}>
                                            {row.treasury_account?.treasury_account_type?.name
                                                ?? row.treasuryAccount?.treasury_account_type?.name
                                                ?? '—'}
                                        </Badge>
                                    </td>
                                    <td>
                                        {editTreasuryId === row.id ? (
                                            <div className="inp-row">
                                                <input type="number" value={editTreasuryVal}
                                                    onChange={e => setEditTreasuryVal(e.target.value)}
                                                    style={{ ...inputStyle(false), width: 100 }} />
                                                <span style={{ fontSize: 11, color: 'var(--t4)', whiteSpace: 'nowrap' }}>دج</span>
                                            </div>
                                        ) : (
                                            <span style={{ color: 'var(--em)', fontWeight: 700, fontFamily: 'monospace' }}>
                                                {fmt(Number(row.opening_balance || 0))} دج
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ fontSize: 11, color: 'var(--t4)' }}>
                                        {fmtDate(row.updated_at)}
                                    </td>
                                    {!selectedYear?.is_closed && (
                                        <td>
                                            {editTreasuryId === row.id ? (
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    <ActionBtn icon="ti-device-floppy" color="var(--em)"
                                                        disabled={!editTreasuryVal || updateTreasuryMut.isPending}
                                                        onClick={() => updateTreasuryMut.mutate({ id: row.id, opening_balance: Number(editTreasuryVal) })} />
                                                    <ActionBtn icon="ti-x" color="var(--red)"
                                                        onClick={() => setEditTreasuryId(null)} />
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    <ActionBtn icon="ti-pencil" color="var(--blue)"
                                                        onClick={() => startEditTreasury(row)} />
                                                    <ActionBtn icon="ti-trash" color="var(--red)"
                                                        onClick={async () => { if (await deleteConfirm.confirm('حذف هذا الرصيد?')) deleteMut.mutate({ type: 'treasury', id: row.id }); }} />
                                                </div>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={3} style={{ fontWeight: 700, textAlign: 'end',
                                    padding: '8px 12px', color: 'var(--t3)', fontSize: 12 }}>المجموع</td>
                                <td style={{ fontWeight: 900, color: 'var(--em)', padding: '8px 12px' }}>
                                    {fmt(totalTreasury)} دج
                                </td>
                                <td colSpan={!selectedYear?.is_closed ? 2 : 1}></td>
                            </tr>
                        </tfoot>
                    </table>
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 16px', borderTop: '1px solid var(--b1)', background: 'var(--bg3)',
                    }}>
                        <button onClick={() => setTreasuryDrafts(prev => [...prev, emptyTreasuryDraft()])} style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '6px 14px', background: 'transparent',
                            border: '1px dashed var(--b2)', borderRadius: 8,
                            color: 'var(--t3)', fontSize: 12, cursor: 'pointer',
                            fontFamily: 'Tajawal, sans-serif', transition: 'all .15s',
                        }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--em)'; e.currentTarget.style.color = 'var(--em)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--b2)'; e.currentTarget.style.color = 'var(--t3)'; }}
                        >
                            <i className="ti ti-plus" style={{ fontSize: 14 }} /> إضافة سطر
                        </button>
                        {treasuryRows.length > 0 && (
                            <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--t3)' }}>
                                <span><strong style={{ color: 'var(--t1)' }}>{treasuryRows.length}</strong> حساب</span>
                                <span>إجمالي{' '}<strong style={{ color: 'var(--em)' }}>{fmt(totalTreasury)} دج</strong></span>
                            </div>
                        )}
                    </div>
                </div>
            </Card>
            )
    );
}
