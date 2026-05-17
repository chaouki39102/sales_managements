// components/admin/UserDrawer/CompaniesTab.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { companiesApi } from '@/lib/api/admin';
import { usersApi } from '@/lib/api/admin';
import { Avatar, SectionTitle, EmptyState, Spinner, StatusBadge } from '../shared';
import type { AdminUser, AdminCompany } from '@/types/admin';

interface Props {
  user:    AdminUser;
  onFlash: (ok: boolean, msg: string) => void;
  onRefreshUser: () => void;
}

export function CompaniesTab({ user: u, onFlash, onRefreshUser }: Props) {
  const [searchQ, setSearchQ] = useState('');
  const [transferId, setTransferId] = useState('');
  const [searching,  setSearching]  = useState(false);
  const [searchRes,  setSearchRes]  = useState<AdminCompany[]>([]);

  // شركات المستخدم الحالية
  const { data: rawData, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'users', u.id, 'companies'],
    queryFn:  () => usersApi.companies(u.id),
    staleTime: 60_000,
  });
  const companies: AdminCompany[] = (rawData as any)?.data ?? rawData ?? [];

  // بحث في الشركات للنقل
  const handleSearch = async () => {
    if (!searchQ.trim()) return;
    setSearching(true);
    try {
      const res = await companiesApi.list({ search: searchQ, per_page: 8 } as any);
      setSearchRes((res as any)?.data ?? []);
    } finally { setSearching(false); }
  };

  const handleRemove = async (coId: number, coName: string) => {
    if (!confirm(`إزالة ${u.name} من ${coName}؟`)) return;
    try {
      await companiesApi.removeUser(coId, u.id);
      refetch(); onRefreshUser();
      onFlash(true, 'تم الإزالة');
    } catch { onFlash(false, 'فشلت الإزالة'); }
  };

  const handleToggle = async (coId: number) => {
    try {
      await companiesApi.toggleUser(coId, u.id);
      refetch();
    } catch { onFlash(false, 'فشل التغيير'); }
  };

  const handleAdd = async (co: AdminCompany) => {
    const already = companies.find(c => c.id === co.id);
    if (already) { onFlash(false, 'المستخدم عضو بالفعل في هذه الشركة'); return; }
    try {
      await companiesApi.addUser(co.id, u.id, 'member');
      refetch(); onRefreshUser(); setSearchRes([]); setSearchQ('');
      onFlash(true, `تمت إضافة ${u.name} لـ ${co.name}`);
    } catch { onFlash(false, 'فشلت الإضافة'); }
  };

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── الشركات الحالية ── */}
      <div>
        <SectionTitle>الشركات المرتبطة ({companies.length})</SectionTitle>

        {isLoading ? <Spinner /> : companies.length === 0 ? (
          <EmptyState icon="ti-building-off" text="لا ينتمي لأي شركة" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {companies.map(co => (
              <div key={co.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: 'var(--bg3)' }}>
                <Avatar id={co.id} name={co.name} size={30} radius={8} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{co.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--t4)' }}>
                    /{co.slug}
                    {(co as any).pivot?.role && ` · ${(co as any).pivot.role}`}
                  </div>
                </div>
                <StatusBadge active={(co as any).pivot?.active ?? true} />
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    title="تجميد/تفعيل"
                    onClick={() => handleToggle(co.id)}
                    style={iconBtn}
                  ><i className="ti ti-user-pause" /></button>
                  <button
                    title="إزالة"
                    onClick={() => handleRemove(co.id, co.name)}
                    style={{ ...iconBtn, color: '#ef4444', borderColor: '#ef444433' }}
                  ><i className="ti ti-building-minus" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── إضافة/نقل لشركة ── */}
      <div style={{ borderTop: '1px solid var(--b2)', paddingTop: 16 }}>
        <SectionTitle>إضافة / نقل إلى شركة</SectionTitle>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="ابحث باسم الشركة..."
            style={inputStyle}
          />
          <button onClick={handleSearch} disabled={searching} style={searchBtn}>
            {searching
              ? <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
              : <i className="ti ti-search" />}
          </button>
        </div>

        {searchRes.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {searchRes.map(co => (
              <div
                key={co.id}
                onClick={() => handleAdd(co)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, cursor: 'pointer', background: 'var(--bg3)', transition: 'background .12s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg4)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'}
              >
                <Avatar id={co.id} name={co.name} size={26} radius={7} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)' }}>{co.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--t4)' }}>/{co.slug}</div>
                </div>
                <i className="ti ti-plus" style={{ fontSize: 14, color: 'var(--em)' }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  flex: 1, padding: '8px 10px', borderRadius: 8,
  border: '1px solid var(--b2)', background: 'var(--bg3)',
  color: 'var(--t1)', fontSize: 13, fontFamily: 'Tajawal, sans-serif',
};
const searchBtn: React.CSSProperties = {
  padding: '0 12px', borderRadius: 8, border: '1px solid var(--b2)',
  background: 'var(--em)', color: '#fff', cursor: 'pointer', fontSize: 14,
};
const iconBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 7,
  border: '1px solid var(--b2)', background: 'none',
  cursor: 'pointer', color: 'var(--t3)', fontSize: 13,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
