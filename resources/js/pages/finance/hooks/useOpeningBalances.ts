// resources/js/pages/finance/hooks/useOpeningBalances.ts
// State, lookups and mutations for the opening balances tab (TAB 3).
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotification } from '@/hooks/useNotification';
import { tenantKeys } from '@/lib/api/core/queryKeys';
import { apiGet } from '@/lib/api/core/client';
import { useOpeningParties, useOpeningTreasury, openingBalancesApi } from '@/lib/api/endpoints/openingBalances';
import type { TreasuryDraft, PartyDraft } from '../types';

export function useOpeningBalances(slug: string, selectedYear: any | null) {
    const notify        = useNotification();
    const [subTab, setSubTab] = useState<'parties' | 'treasury'>('treasury');
    const yearId = selectedYear?.id ?? null;
    const qc = useQueryClient();

    const { data: partiesData, isLoading: loadParties } = useOpeningParties(slug, yearId);
    const { data: treasuryData, isLoading: loadTreasury } = useOpeningTreasury(slug, yearId);

    const partyRows: any[]   = Array.isArray(partiesData)  ? partiesData  : [];
    const treasuryRows: any[] = Array.isArray(treasuryData) ? treasuryData : [];

    const totalDebit  = partyRows.filter(r => r.balance_type === 'debit')
                            .reduce((s, r) => s + Number(r.opening_balance || 0), 0);
    const totalCredit = partyRows.filter(r => r.balance_type === 'credit')
                            .reduce((s, r) => s + Number(r.opening_balance || 0), 0);
    const totalTreasury = treasuryRows.reduce((s, r) => s + Number(r.opening_balance || 0), 0);

    // ── Data for dropdowns ───────────────────────────────────────────────────
    const { data: rawAccounts } = useQuery({
        queryKey: [slug, 'treasury-accounts'],
        queryFn: () => apiGet<any[]>('/treasury-accounts'),
        enabled: !!slug,
        staleTime: 60_000,
    });
    const accounts: any[] = Array.isArray(rawAccounts) ? rawAccounts
        : Array.isArray((rawAccounts as any)?.data) ? (rawAccounts as any).data
        : [];

    const { data: rawParties } = useQuery({
        queryKey: [slug, 'parties', 'select'],
        queryFn: () => apiGet<any>('/parties', { per_page: 200, active: 1 }),
        enabled: !!slug,
        staleTime: 60_000,
    });
    const allParties: any[] = Array.isArray(rawParties) ? rawParties
        : Array.isArray((rawParties as any)?.data) ? (rawParties as any).data
        : [];

    // ── Draft rows ───────────────────────────────────────────────────────────
    const [treasuryDrafts, setTreasuryDrafts] = useState<TreasuryDraft[]>([]);
    const [partyDrafts, setPartyDrafts] = useState<PartyDraft[]>([]);
    const [editTreasuryId, setEditTreasuryId] = useState<number | null>(null);

    // ── Duplicate helpers ─────────────────────────────────────────────────────
    const existingPartyIds = new Set(partyRows.map((r: any) => r.party_id));
    const existingTreasuryIds = new Set(
        treasuryRows.map((r: any) => r.treasury_account_id ?? r.treasuryAccount?.id),
    );
    const [editPartyId, setEditPartyId] = useState<number | null>(null);
    const [editTreasuryVal, setEditTreasuryVal] = useState('');
    const [editPartyVal, setEditPartyVal] = useState('');
    const [editPartyType, setEditPartyType] = useState<'debit' | 'credit'>('debit');
    const [partyFilter, setPartyFilter] = useState('');

    const filteredParties = allParties.filter(p =>
        !partyFilter.trim() || p.name.toLowerCase().includes(partyFilter.toLowerCase()),
    );

    // ── Mutations ────────────────────────────────────────────────────────────
    const invalidateAll = () => {
        qc.invalidateQueries({ queryKey: tenantKeys.openingBalances.parties(slug, yearId!) });
        qc.invalidateQueries({ queryKey: tenantKeys.openingBalances.treasury(slug, yearId!) });
    };

    const createTreasuryMut = useMutation({
        mutationFn: (d: TreasuryDraft) =>
            openingBalancesApi.createTreasury({ fiscal_year_id: yearId, treasury_account_id: Number(d.treasury_account_id), opening_balance: Number(d.opening_balance) }),
        onSuccess: () => { invalidateAll(); },
    });

    const createPartyMut = useMutation({
        mutationFn: (d: PartyDraft) =>
            openingBalancesApi.createParty({ fiscal_year_id: yearId, party_id: Number(d.party_id), opening_balance: Number(d.opening_balance), balance_type: d.balance_type }),
        onSuccess: () => { invalidateAll(); },
    });

    const deleteMut = useMutation({
        mutationFn: ({ type, id }: { type: 'party' | 'treasury'; id: number }) =>
            type === 'party' ? openingBalancesApi.deleteParty(id) : openingBalancesApi.deleteTreasury(id),
        onSuccess: () => { invalidateAll(); notify.success('تم الحذف'); },
    });

    const updateTreasuryMut = useMutation({
        mutationFn: ({ id, opening_balance }: { id: number; opening_balance: number }) =>
            openingBalancesApi.updateTreasury(id, { opening_balance }),
        onSuccess: () => { invalidateAll(); setEditTreasuryId(null); },
    });

    const updatePartyMut = useMutation({
        mutationFn: ({ id, opening_balance, balance_type }: { id: number; opening_balance: number; balance_type: string }) =>
            openingBalancesApi.updateParty(id, { opening_balance, balance_type }),
        onSuccess: () => { invalidateAll(); setEditPartyId(null); },
    });

    // ── Save draft helpers ──────────────────────────────────────────────────
    const saveTreasuryDraft = async (idx: number) => {
        const d = treasuryDrafts[idx];
        if (!d.treasury_account_id || !d.opening_balance) return;
        await createTreasuryMut.mutateAsync(d);
        setTreasuryDrafts(prev => prev.filter((_, i) => i !== idx));
    };

    const savePartyDraft = async (idx: number) => {
        const d = partyDrafts[idx];
        if (!d.party_id || !d.opening_balance) return;
        await createPartyMut.mutateAsync(d);
        setPartyDrafts(prev => prev.filter((_, i) => i !== idx));
    };

    // ── Inline edit ─────────────────────────────────────────────────────────
    const startEditTreasury = (row: any) => {
        setEditTreasuryId(row.id);
        setEditTreasuryVal(row.opening_balance ?? '');
    };
    const startEditParty = (row: any) => {
        setEditPartyId(row.id);
        setEditPartyVal(row.opening_balance ?? '');
        setEditPartyType(row.balance_type ?? 'debit');
    };

    return {
        notify,
        subTab,
        setSubTab,
        yearId,
        qc,
        partiesData,
        loadParties,
        treasuryData,
        loadTreasury,
        partyRows,
        treasuryRows,
        totalDebit,
        totalCredit,
        totalTreasury,
        rawAccounts,
        accounts,
        rawParties,
        allParties,
        treasuryDrafts,
        setTreasuryDrafts,
        partyDrafts,
        setPartyDrafts,
        editTreasuryId,
        setEditTreasuryId,
        existingPartyIds,
        existingTreasuryIds,
        editPartyId,
        setEditPartyId,
        editTreasuryVal,
        setEditTreasuryVal,
        editPartyVal,
        setEditPartyVal,
        editPartyType,
        setEditPartyType,
        partyFilter,
        setPartyFilter,
        filteredParties,
        invalidateAll,
        createTreasuryMut,
        createPartyMut,
        deleteMut,
        updateTreasuryMut,
        updatePartyMut,
        saveTreasuryDraft,
        savePartyDraft,
        startEditTreasury,
        startEditParty,
    };
}

export type OpeningBalancesState = ReturnType<typeof useOpeningBalances>;
