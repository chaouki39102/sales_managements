// resources/js/pages/finance/components/OpeningPartiesTable.tsx
// TAB 3 — الأرصدة الافتتاحية: TABLEAU — المتعاملون
import type { useConfirm } from '@/hooks/useConfirm';
import Card         from '@/components/ui/Card';
import Badge        from '@/components/ui/Badge';
import Avatar       from '@/components/ui/Avatar';
import { ComboBox } from '@/pages/documents/components/DocumentUIPrimitives';
import { fmt, fmtDate, inputStyle, emptyPartyDraft } from '../financeUtils';
import type { OpeningBalancesState } from '../hooks/useOpeningBalances';
import Th from './Th';
import ActionBtn from './ActionBtn';

export default function OpeningPartiesTable(props: OpeningBalancesState & { selectedYear: any | null; deleteConfirm: ReturnType<typeof useConfirm> }) {
    const {
        loadParties,
        partyRows,
        totalDebit,
        totalCredit,
        allParties,
        partyDrafts,
        setPartyDrafts,
        existingPartyIds,
        editPartyId,
        setEditPartyId,
        editPartyVal,
        setEditPartyVal,
        editPartyType,
        setEditPartyType,
        partyFilter,
        setPartyFilter,
        filteredParties,
        createPartyMut,
        deleteMut,
        updatePartyMut,
        savePartyDraft,
        startEditParty,
        selectedYear,
        deleteConfirm,
    } = props;

    return (
        loadParties ? (
            <div className="empty"><div className="empty-ic"><i className="ti ti-loader"/></div>
                <div className="empty-tx">جاري التحميل...</div></div>
        ) : (
            <Card noHeader style={{ padding: 0 }}>
                <div className="tw">
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--b1)' }}>
                        <input type="text" value={partyFilter}
                            onChange={e => setPartyFilter(e.target.value)}
                            placeholder="ابحث عن متعامل..."
                            style={{ ...inputStyle(false), maxWidth: 280, fontSize: 12 }}
                        />
                        {partyFilter && (
                            <span style={{ fontSize: 11, color: 'var(--t4)', marginRight: 8 }}>
                                {filteredParties.length} من {allParties.length}
                            </span>
                        )}
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <Th width="36px">#</Th>
                                <Th>المتعامل</Th>
                                <Th width="100px">النوع</Th>
                                <Th width="140px">الرصيد</Th>
                                <Th width="100px">آخر تحديث</Th>
                                {!selectedYear?.is_closed && <Th width="100px"></Th>}
                            </tr>
                        </thead>
                        <tbody>
                            {/* Draft rows — متعاملون */}
                            {partyDrafts.map((d, idx) => (
                                <tr key={`pd-${idx}`} style={{ background: 'var(--bg3)' }}>
                                    <td style={{ textAlign: 'center', color: 'var(--em)', fontWeight: 700, fontSize: 11 }}>
                                        D{idx + 1}
                                    </td>
                                    <td style={{ minWidth: 200 }}>
                                        <ComboBox
                                            options={filteredParties.map(p => ({ id: p.id, label: p.name }))}
                                            value={String(d.party_id || '')}
                                            onChange={id => setPartyDrafts(prev => prev.map((r, i) => i === idx ? { ...r, party_id: parseInt(id) || '' } : r))}
                                            placeholder="— اختر —"
                                            error={!!(d.party_id && (existingPartyIds.has(d.party_id) || partyDrafts.some((r, j) => j !== idx && r.party_id === d.party_id)))}
                                            onAfterSelect={() => {
                                                const el = document.querySelector<HTMLInputElement>(`[data-amount-idx="${idx}"]`);
                                                el?.focus();
                                            }}
                                        />
                                        {d.party_id && (existingPartyIds.has(d.party_id) || partyDrafts.some((r, j) => j !== idx && r.party_id === d.party_id)) && (
                                            <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 3 }}>
                                                <i className="ti ti-alert-triangle" style={{ fontSize: 11 }} /> هذا المتعامل لديه رصيد افتتاحي بالفعل
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <select value={d.balance_type}
                                            onChange={e => setPartyDrafts(prev => prev.map((r, i) => i === idx ? { ...r, balance_type: e.target.value as 'debit' | 'credit' } : r))}
                                            style={inputStyle(false)}>
                                            <option value="debit">عليه</option>
                                            <option value="credit">له</option>
                                        </select>
                                    </td>
                                    <td>
                                        <div className="inp-row">
                                            <input type="number" value={d.opening_balance}
                                                data-amount-idx={idx}
                                                onChange={e => setPartyDrafts(prev => prev.map((r, i) => i === idx ? { ...r, opening_balance: e.target.value } : r))}
                                                style={{ ...inputStyle(false), width: 100 }} />
                                            <span style={{ fontSize: 11, color: 'var(--t4)', whiteSpace: 'nowrap' }}>دج</span>
                                        </div>
                                    </td>
                                    <td style={{ fontSize: 11, color: 'var(--t4)' }}>—</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <ActionBtn icon="ti-device-floppy" color="var(--em)"
                                                disabled={!d.party_id || !d.opening_balance || createPartyMut.isPending
                                                    || (!!d.party_id && (existingPartyIds.has(d.party_id) || partyDrafts.some((r, j) => j !== idx && r.party_id === d.party_id)))}
                                                onClick={() => savePartyDraft(idx)} />
                                            <ActionBtn icon="ti-x" color="var(--red)"
                                                onClick={() => setPartyDrafts(prev => prev.filter((_, i) => i !== idx))} />
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {/* Existing rows — متعاملون */}
                            {partyRows.length === 0 && partyDrafts.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: 30, color: 'var(--t4)', fontSize: 13 }}>
                                        لا توجد أرصدة افتتاحية — أضف سطراً جديداً أعلاه
                                    </td>
                                </tr>
                            ) : partyRows.map((row: any, i: number) => {
                                const isDebit = editPartyId === row.id ? editPartyType === 'debit' : row.balance_type === 'debit';
                                const bal = editPartyId === row.id ? Number(editPartyVal) : Number(row.opening_balance || 0);
                                return (
                                    <tr key={row.id}>
                                        <td style={{ textAlign: 'center', color: 'var(--t4)', fontSize: 11 }}>{i + 1}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                                <Avatar initials={(row.party?.name ?? '?')[0]}
                                                    color={((i % 7) + 1) as 1|2|3|4|5|6|7} size={26} />
                                                <span className="s">{row.party?.name ?? `متعامل #${row.party_id}`}</span>
                                            </div>
                                        </td>
                                        <td>
                                            {editPartyId === row.id ? (
                                                <select value={editPartyType}
                                                    onChange={e => setEditPartyType(e.target.value as 'debit' | 'credit')}
                                                    style={inputStyle(false)}>
                                                    <option value="debit">عليه</option>
                                                    <option value="credit">له</option>
                                                </select>
                                            ) : (
                                                <Badge variant={isDebit ? 'warning' : 'info'}>
                                                    {isDebit ? 'عليه' : 'له'}
                                                </Badge>
                                            )}
                                        </td>
                                        <td>
                                            {editPartyId === row.id ? (
                                                <div className="inp-row">
                                                    <input type="number" value={editPartyVal}
                                                        onChange={e => setEditPartyVal(e.target.value)}
                                                        style={{ ...inputStyle(false), width: 100 }} />
                                                    <span style={{ fontSize: 11, color: 'var(--t4)', whiteSpace: 'nowrap' }}>دج</span>
                                                </div>
                                            ) : (
                                                <span style={{
                                                    color: isDebit ? 'var(--gold)' : 'var(--blue)',
                                                    fontWeight: 700, fontFamily: 'monospace',
                                                }}>
                                                    {fmt(bal)} دج
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ fontSize: 11, color: 'var(--t4)' }}>
                                            {fmtDate(row.updated_at)}
                                        </td>
                                        {!selectedYear?.is_closed && (
                                            <td>
                                                {editPartyId === row.id ? (
                                                    <div style={{ display: 'flex', gap: 4 }}>
                                                        <ActionBtn icon="ti-device-floppy" color="var(--em)"
                                                            disabled={!editPartyVal || updatePartyMut.isPending}
                                                            onClick={() => updatePartyMut.mutate({ id: row.id, opening_balance: Number(editPartyVal), balance_type: editPartyType })} />
                                                        <ActionBtn icon="ti-x" color="var(--red)"
                                                            onClick={() => setEditPartyId(null)} />
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', gap: 4 }}>
                                                        <ActionBtn icon="ti-pencil" color="var(--blue)"
                                                            onClick={() => startEditParty(row)} />
                                                        <ActionBtn icon="ti-trash" color="var(--red)"
                                                            onClick={async () => { if (await deleteConfirm.confirm('حذف هذا الرصيد?')) deleteMut.mutate({ type: 'party', id: row.id }); }} />
                                                    </div>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={3} style={{ fontWeight: 700, textAlign: 'end',
                                    padding: '8px 12px', color: 'var(--t3)', fontSize: 12 }}>المجموع</td>
                                <td style={{ fontWeight: 900, fontFamily: 'monospace', padding: '8px 12px' }}>
                                    <span style={{ color: 'var(--red)' }}>موجب: {fmt(totalDebit)}</span>
                                    &nbsp;|&nbsp;
                                    <span style={{ color: 'var(--green)' }}>سالب: {fmt(totalCredit)}</span>
                                </td>
                                <td colSpan={!selectedYear?.is_closed ? 2 : 1}></td>
                            </tr>
                        </tfoot>
                    </table>
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 16px', borderTop: '1px solid var(--b1)', background: 'var(--bg3)',
                    }}>
                        <button onClick={() => setPartyDrafts(prev => [...prev, emptyPartyDraft()])} style={{
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
                        {partyRows.length > 0 && (
                            <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--t3)' }}>
                                <span><strong style={{ color: 'var(--t1)' }}>{partyRows.length}</strong> متعامل</span>
                                <span>إجمالي{' '}
                                    <strong style={{ color: 'var(--red)' }}>{fmt(totalDebit)}</strong>
                                    {' / '}
                                    <strong style={{ color: 'var(--green)' }}>{fmt(totalCredit)}</strong> دج
                                </span>
                            </div>
                        )}
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--t4)', lineHeight: 1.6, textAlign: 'right', direction: 'rtl',
            padding: '14px 20px',
    borderTop: '1px solid var(--b2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    flexShrink: 0,
    background: 'var(--bg3)',
    borderRadius: '0 0 var(--r4) var 20px(--r4)', }} className="al-g">
                        <strong style={{ color: 'var(--red)' }}>الرصيد الموجب
                        (+) المتعامل عليه دين - يجب عليه أن يدفع لنا </strong><br />
                        <strong style={{ color: 'var(--green)' }}>الرصيد السالب
                        (-) للمتعامل رصيد عندنا - يجب علينا أن ندفع له </strong><br />
                    </div>
                </div>
            </Card>
        )
    );
}
