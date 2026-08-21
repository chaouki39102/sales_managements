// ════════════════════════════════════════════════════════════════════════════
// pages/admin/AdminSettingsPage.tsx — النسخة الخارقة
// ✅ إعدادات النظام + الصيانة + مسح الكاش + تجميد التسجيل
// ════════════════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/admin';
import { dbApi } from '@/lib/api/admin';
import type { DbStatus } from '@/lib/api/admin';
import PageHeader from '@/components/ui/PageHeader';
import type { SystemSettings } from '@/types/admin';
import { useNotification } from '@/hooks/useNotification';
import { useConfirm } from '@/hooks/useConfirm';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { apiPost } from '@/lib/api/core/client';

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label, desc, color = 'var(--em)' }: {
  checked: boolean; onChange: (v: boolean) => void;
  label: string; desc?: string; color?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--b1)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{label}</div>
        {desc && <div style={{ fontSize: 11.5, color: 'var(--t4)', marginTop: 2 }}>{desc}</div>}
      </div>
      <div onClick={() => onChange(!checked)} style={{
        width: 44, height: 24, borderRadius: 12, position: 'relative',
        background: checked ? color : 'var(--b3)', transition: 'background .2s', cursor: 'pointer', flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', top: 3, left: checked ? 23 : 3,
          width: 18, height: 18, borderRadius: '50%',
          background: '#fff', transition: 'left .2s',
          boxShadow: '0 1px 3px rgba(0,0,0,.2)',
        }} />
      </div>
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────
function Section({ title, icon, color, children }: {
  title: string; icon: string; color: string; children: React.ReactNode;
}) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--b1)', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{
        padding: '14px 18px', borderBottom: '1px solid var(--b1)',
        background: 'var(--bg3)', display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: color + '20', display: 'flex', alignItems: 'center',
          justifyContent: 'center', color, fontSize: 16,
        }}>
          <i className={`ti ${icon}`} />
        </div>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--t1)' }}>{title}</div>
      </div>
      <div style={{ padding: '4px 18px 14px' }}>{children}</div>
    </div>
  );
}

// ─── NumField ─────────────────────────────────────────────────────────────────
function NumField({ label, desc, value, onChange, min = 0 }: {
  label: string; desc?: string; value: number;
  onChange: (v: number) => void; min?: number;
}) {
  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid var(--b1)', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{label}</div>
        {desc && <div style={{ fontSize: 11.5, color: 'var(--t4)', marginTop: 2 }}>{desc}</div>}
      </div>
      <input
        type="number" min={min} value={value}
        onChange={e => onChange(+e.target.value)}
        style={{
          width: 80, padding: '6px 10px', borderRadius: 8,
          border: '1.5px solid var(--b2)', background: 'var(--bg1)',
          color: 'var(--t1)', fontSize: 13, textAlign: 'center',
          fontFamily: 'Tajawal,sans-serif', outline: 'none',
        }}
      />
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminSettingsPage() {
  const qc = useQueryClient();
  const notify = useNotification();
  const { confirm, confirmDialogProps } = useConfirm();
  const [form, setForm]   = useState<SystemSettings | null>(null);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: _settings, isLoading } = useQuery<SystemSettings>({
    queryKey: ['admin', 'system', 'settings'],
    queryFn:  adminApi.getSettings,
    staleTime: 2 * 60_000,
  });

  useEffect(() => {
    if (_settings && !form) setForm({ ..._settings } as SystemSettings);
  }, [_settings]);

  const { data: maintenance } = useQuery({
    queryKey: ['admin', 'system', 'maintenance'],
    queryFn:  adminApi.getMaintenance,
    staleTime: 60_000,
  });

  const { data: sysStatus } = useQuery({
    queryKey: ['admin', 'system', 'status'],
    queryFn:  adminApi.getSystemStatus,
    staleTime: 3 * 60_000,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const saveMut = useMutation({
    mutationFn: (data: Partial<SystemSettings>) => adminApi.updateSettings(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'system', 'settings'] });
      notify.success('تم حفظ الإعدادات بنجاح ✓');
    },
    onError: (e: any) => notify.error(e?.message ?? 'فشل الحفظ'),
  });

  const cacheMut = useMutation({
    mutationFn: adminApi.clearCache,
    onSuccess: () => notify.success('تم مسح الكاش بنجاح ✓'),
    onError: () => notify.error('فشل مسح الكاش'),
  });

  const maintMut = useMutation({
    mutationFn: () => (maintenance as any)?.maintenance_mode
      ? adminApi.disableMaintenance()
      : adminApi.enableMaintenance('الموقع في وضع الصيانة'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'system', 'maintenance'] });
      notify.success((maintenance as any)?.maintenance_mode ? 'تم إلغاء الصيانة' : 'تم تفعيل الصيانة');
    },
  });

  const bootWilMut  = useMutation({ mutationFn: adminApi.bootWilayas,     onSuccess: () => notify.success('تم تثبيت الولايات والبلديات ✓') });
  const bootPermMut = useMutation({ mutationFn: adminApi.bootPermissions, onSuccess: () => notify.success('تم تثبيت الصلاحيات ✓') });

  // ── Database Driver ──────────────────────────────────────────────────────────
  const { data: dbStatus, isLoading: dbLoading } = useQuery<DbStatus>({
    queryKey: ['admin', 'system', 'db-status'],
    queryFn:  dbApi.status,
    staleTime: 30_000,
  });

  const dbSwitchMut = useMutation({
    mutationFn: (driver: string) => dbApi.switchTo(driver),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'system', 'db-status'] });
      notify.success(data.message ?? 'تم التبديل ✓');
      // Prompt for server restart after a short delay
      setTimeout(async () => {
        if (await confirm('تم تبديل قاعدة البيانات. هل تريد إعادة تشغيل الخادم الآن؟')) {
          window.location.href = '/status';
        }
      }, 1500);
    },
    onError: (e: any) => {
      const msg = e?.error ?? e?.message ?? 'فشل التبديل';
      const detail = e?.detail ? `\n${e.detail}` : '';
      notify.error(msg + detail);
    },
  });

  const setF = (key: keyof SystemSettings, value: any) =>
    setForm(f => f ? { ...f, [key]: value } : f);

  if (isLoading || !form) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12, color: 'var(--t4)' }}>
      <i className="ti ti-loader-2" style={{ fontSize: 24, animation: 'spin .8s linear infinite' }} />
      جارٍ التحميل...
    </div>
  );

  const isMaint = (maintenance as any)?.maintenance_mode ?? false;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 800 }}>

      <PageHeader
        title="إعدادات النظام"
        description="التحكم في سلوك المنصة"
        actions={
          <button
            disabled={saveMut.isPending}
            onClick={() => saveMut.mutate(form)}
            style={{
              padding: '10px 22px', borderRadius: 10, border: 'none',
              background: 'var(--green)', color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'Tajawal,sans-serif',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
            {saveMut.isPending
              ? <><i className="ti ti-loader-2" style={{ animation: 'spin .8s linear infinite' }} /> جارٍ الحفظ...</>
              : <><i className="ti ti-device-floppy" /> حفظ الإعدادات</>}
          </button>
        }
      />

      {/* حالة النظام */}
      {sysStatus && (
        <div style={{
          padding: '12px 16px', borderRadius: 12,
          background: (sysStatus as any).is_ready ? 'var(--greenb)' : 'var(--goldb)',
          border: `1px solid ${(sysStatus as any).is_ready ? '#10b98130' : '#f59e0b30'}`,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
            background: (sysStatus as any).is_ready ? 'var(--green)' : '#f59e0b',
            boxShadow: `0 0 8px ${(sysStatus as any).is_ready ? '#10b98188' : '#f59e0b88'}`,
          }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: (sysStatus as any).is_ready ? 'var(--green)' : '#f59e0b' }}>
            {(sysStatus as any).is_ready ? 'النظام جاهز ويعمل بشكل طبيعي' : 'النظام يحتاج إعداداً — اذهب لـ /admin/boot'}
          </span>
        </div>
      )}

      {/* التسجيل والشركات */}
      <Section title="التسجيل والوصول" icon="ti-user-plus" color="#6366f1">
        <Toggle
          checked={form.allow_registration}
          onChange={v => setF('allow_registration', v)}
          label="السماح بالتسجيل الجديد"
          desc="إذا أُغلق لن يتمكن أي مستخدم جديد من إنشاء حساب"
          color="#6366f1"
        />
        <Toggle
          checked={form.allow_new_companies}
          onChange={v => setF('allow_new_companies', v)}
          label="السماح بإنشاء شركات جديدة"
          desc="إذا أُغلق لن يتمكن المستخدمون من إنشاء شركات جديدة"
          color="#6366f1"
        />
        <Toggle
          checked={form.public_api}
          onChange={v => setF('public_api', v)}
          label="الـ API العام"
          desc="السماح بالوصول لبعض endpoints بدون مصادقة"
          color="#0ea5e9"
        />
      </Section>

      {/* التجربة المجانية */}
      <Section title="الخطط والتجربة المجانية" icon="ti-gift" color="#10b981">
        <NumField
          label="مدة التجربة المجانية"
          desc="عدد الأيام قبل انتهاء الفترة التجريبية"
          value={form.free_trial_days}
          onChange={v => setF('free_trial_days', v)}
          min={0}
        />
        <NumField
          label="حد مستخدمي الخطة المجانية"
          desc="الحد الأقصى لعدد المستخدمين في الخطة المجانية"
          value={form.free_max_users}
          onChange={v => setF('free_max_users', v)}
          min={1}
        />
        <NumField
          label="حد منتجات خطة Starter"
          desc="الحد الأقصى للمنتجات في الخطة المبتدئة"
          value={form.starter_max_products}
          onChange={v => setF('starter_max_products', v)}
          min={0}
        />
      </Section>

      {/* الصيانة */}
      <Section title="الصيانة والأداء" icon="ti-tool" color="#f59e0b">
        <div style={{ padding: '12px 0', borderBottom: '1px solid var(--b1)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>
              وضع الصيانة
              {isMaint && <span style={{ marginRight: 8, fontSize: 11, color: 'var(--gold)', fontWeight: 700 }}>● مفعّل الآن</span>}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--t4)', marginTop: 2 }}>
              {isMaint ? 'الموقع محجوب حالياً للمستخدمين العاديين' : 'عند التفعيل يُعرض للمستخدمين صفحة صيانة'}
            </div>
          </div>
          <button
            disabled={maintMut.isPending}
            onClick={() => maintMut.mutate()}
            style={{
              padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: isMaint ? 'var(--green)' : '#f59e0b', color: '#fff',
              fontSize: 12, fontWeight: 700, fontFamily: 'Tajawal,sans-serif',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
            {maintMut.isPending
              ? <i className="ti ti-loader-2" style={{ animation: 'spin .8s linear infinite' }} />
              : <i className={`ti ${isMaint ? 'ti-eye' : 'ti-tool'}`} />}
            {isMaint ? 'إلغاء الصيانة' : 'تفعيل الصيانة'}
          </button>
        </div>

        <div style={{ padding: '12px 0', borderBottom: '1px solid var(--b1)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>مسح الكاش</div>
            <div style={{ fontSize: 11.5, color: 'var(--t4)', marginTop: 2 }}>
              مسح كاش Laravel وRedis وتحديث البيانات
            </div>
          </div>
          <button
            disabled={cacheMut.isPending}
            onClick={() => cacheMut.mutate()}
            style={{
              padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'var(--red)', color: '#fff', fontSize: 12, fontWeight: 700,
              fontFamily: 'Tajawal,sans-serif', display: 'flex', alignItems: 'center', gap: 5,
            }}>
            {cacheMut.isPending
              ? <i className="ti ti-loader-2" style={{ animation: 'spin .8s linear infinite' }} />
              : <i className="ti ti-trash" />}
            مسح الكاش
          </button>
        </div>

        <div style={{ padding: '12px 0', borderBottom: '1px solid var(--b1)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', marginBottom: 6 }}>رسالة الصيانة</div>
          <div style={{ fontSize: 11.5, color: 'var(--t4)', marginBottom: 6 }}>الرسالة المعروضة للمستخدمين أثناء الصيانة</div>
          <textarea
            value={form.maintenance_message || ''}
            onChange={e => setF('maintenance_message', e.target.value)}
            placeholder="الموقع في صيانة مجدولة..."
            rows={2}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 8,
              border: '1.5px solid var(--b2)', background: 'var(--bg1)',
              color: 'var(--t1)', fontSize: 13, fontFamily: 'Tajawal,sans-serif',
              resize: 'vertical', outline: 'none',
            }}
          />
        </div>

        <Toggle
          checked={form.debug_mode}
          onChange={v => setF('debug_mode', v)}
          label="وضع Debug"
          desc="⚠️ لا تُفعّله في الإنتاج — يكشف معلومات حساسة"
          color="#ef4444"
        />
      </Section>

      {/* إعداد النظام */}
      <Section title="إعداد النظام (Boot)" icon="ti-rocket" color="#8b5cf6">
        <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.6, padding: '10px 0 14px' }}>
          تثبيت البيانات الأساسية للنظام. يمكن إعادة تشغيلها في أي وقت بأمان.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <button
            disabled={bootWilMut.isPending}
            onClick={() => bootWilMut.mutate()}
            style={{
              padding: '11px 14px', borderRadius: 9, border: '1px solid #8b5cf620',
              background: '#8b5cf610', color: '#8b5cf6', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'Tajawal,sans-serif',
              display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
            }}>
            {bootWilMut.isPending
              ? <i className="ti ti-loader-2" style={{ animation: 'spin .8s linear infinite' }} />
              : <i className="ti ti-map-pin" />}
            الولايات والبلديات
          </button>
          <button
            disabled={bootPermMut.isPending}
            onClick={() => bootPermMut.mutate()}
            style={{
              padding: '11px 14px', borderRadius: 9, border: '1px solid #0ea5e920',
              background: '#0ea5e910', color: '#0ea5e9', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'Tajawal,sans-serif',
              display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
            }}>
            {bootPermMut.isPending
              ? <i className="ti ti-loader-2" style={{ animation: 'spin .8s linear infinite' }} />
              : <i className="ti ti-shield-lock" />}
            الصلاحيات والأدوار
          </button>
          <button
            disabled={bootPermMut.isPending}
            onClick={() => {
              import('@/lib/admin').then(() => {
                apiPost('/admin/system/boot')
                  .then((d: any) => notify.success(d.message || 'تم تثبيت الخطط ✓'));
              });
            }}
            style={{
              padding: '11px 14px', borderRadius: 9, border: '1px solid #10b98120',
              background: '#10b98110', color: '#10b981', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'Tajawal,sans-serif',
              display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
            }}>
            <i className="ti ti-credit-card" />
            الخطط والاشتراكات
          </button>
        </div>
      </Section>

      {/* قاعدة البيانات */}
      <Section title="قاعدة البيانات" icon="ti-database" color="#0ea5e9">
        {dbLoading ? (
          <div style={{ padding: '14px 0', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--t4)' }}>
            <i className="ti ti-loader-2" style={{ fontSize: 18, animation: 'spin .8s linear infinite' }} />
            جارٍ التحقق من حالة قاعدة البيانات...
          </div>
        ) : dbStatus ? (
          <>
            {/* Current Driver Card */}
            <div style={{
              padding: '14px 16px', borderRadius: 10, marginBottom: 14,
              background: dbStatus.connected ? '#0ea5e910' : '#ef444410',
              border: `1px solid ${dbStatus.connected ? '#0ea5e930' : '#ef444430'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 9, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', background: dbStatus.current_driver === 'mysql' ? '#f59e0b20' : '#8b5cf620',
                  color: dbStatus.current_driver === 'mysql' ? '#f59e0b' : '#8b5cf6', fontSize: 18,
                }}>
                  <i className={`ti ${dbStatus.current_driver === 'mysql' ? 'ti-server' : 'ti-file-code'}`} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>
                    {dbStatus.current_driver === 'mysql' ? 'MySQL / MariaDB' : 'SQLite'}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--t4)' }}>
                   DRIVER = {dbStatus.current_driver}
                  </div>
                </div>
                <div style={{
                  marginRight: 'auto', padding: '4px 10px', borderRadius: 6,
                  background: dbStatus.connected ? '#10b98120' : '#ef444420',
                  color: dbStatus.connected ? 'var(--green)' : 'var(--red)',
                  fontSize: 11, fontWeight: 700,
                }}>
                  {dbStatus.connected ? 'متصلة ✓' : 'غير متصلة ✗'}
                </div>
              </div>

              {/* Connection details */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 12, color: 'var(--t3)' }}>
                {dbStatus.current_driver === 'mysql' ? (
                  <>
                    <span><i className="ti ti-server" style={{ marginInlineEnd: 4 }} />{dbStatus.server ?? 'غير معروف'}</span>
                    <span><i className="ti ti-link" style={{ marginInlineEnd: 4 }} />{dbStatus.host}</span>
                    <span><i className="ti ti-database" style={{ marginInlineEnd: 4 }} />{dbStatus.database}</span>
                  </>
                ) : (
                  <>
                    <span><i className="ti ti-file" style={{ marginInlineEnd: 4 }} />{dbStatus.path}</span>
                    {dbStatus.size && <span><i className="ti ti-scale" style={{ marginInlineEnd: 4 }} />{dbStatus.size}</span>}
                    <span>
                      <i className={`ti ${dbStatus.writable ? 'ti-check' : 'ti-x'}`} style={{ marginInlineEnd: 4, color: dbStatus.writable ? 'var(--green)' : 'var(--red)' }} />
                      {dbStatus.writable ? 'قابلة للكتابة' : 'غير قابلة للكتابة'}
                    </span>
                  </>
                )}
                {dbStatus.pending_migrations >= 0 && (
                  <span style={{ color: dbStatus.pending_migrations > 0 ? '#f59e0b' : undefined }}>
                    <i className="ti ti-git-branch" style={{ marginInlineEnd: 4 }} />
                    {dbStatus.pending_migrations > 0 ? `${dbStatus.pending_migrations} ترحيل معلّق` : 'ترحيلات مطبّقة'}
                  </span>
                )}
              </div>
              {dbStatus.error && (
                <div style={{ marginTop: 8, padding: '6px 10px', borderRadius: 6, background: '#ef444415', color: 'var(--red)', fontSize: 11.5 }}>
                  {dbStatus.error}
                </div>
              )}
            </div>

            {/* Switch Buttons */}
            <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 10 }}>
              التبديل يُغيّر ملف .env ويُنظّف الكاش — أعد تشغيل الخادم بعد التبديل.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                disabled={dbSwitchMut.isPending || dbStatus.current_driver === 'sqlite'}
                onClick={async () => {
                  if (!await confirm('هل تريد التبديل إلى SQLite؟\nسيتم تغيير ملف .env وإيقاف الخادم مؤقتاً.')) return;
                  dbSwitchMut.mutate('sqlite');
                }}
                style={{
                  padding: '12px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
                  background: dbStatus.current_driver === 'sqlite' ? '#8b5cf615' : '#8b5cf610',
                  opacity: dbStatus.current_driver === 'sqlite' ? 0.5 : 1,
                  color: '#8b5cf6', fontSize: 12, fontWeight: 700,
                  fontFamily: 'Tajawal,sans-serif', display: 'flex', alignItems: 'center', gap: 8,
                  justifyContent: 'center', transition: 'all .2s',
                }}>
                {dbSwitchMut.isPending && dbSwitchMut.variables === 'sqlite'
                  ? <i className="ti ti-loader-2" style={{ animation: 'spin .8s linear infinite' }} />
                  : <i className="ti ti-file-code" />}
                SQLite
                {dbStatus.current_driver === 'sqlite' && <span style={{ fontSize: 10, opacity: 0.7 }}>(الحالية)</span>}
              </button>
              <button
                disabled={dbSwitchMut.isPending || dbStatus.current_driver === 'mysql'}
                onClick={async () => {
                  if (!await confirm('هل تريد التبديل إلى MySQL / MariaDB؟\nسيتم تغيير ملف .env وإيقاف الخادم مؤقتاً.')) return;
                  dbSwitchMut.mutate('mysql');
                }}
                style={{
                  padding: '12px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
                  background: dbStatus.current_driver === 'mysql' ? '#f59e0b15' : '#f59e0b10',
                  opacity: dbStatus.current_driver === 'mysql' ? 0.5 : 1,
                  color: '#f59e0b', fontSize: 12, fontWeight: 700,
                  fontFamily: 'Tajawal,sans-serif', display: 'flex', alignItems: 'center', gap: 8,
                  justifyContent: 'center', transition: 'all .2s',
                }}>
                {dbSwitchMut.isPending && dbSwitchMut.variables === 'mysql'
                  ? <i className="ti ti-loader-2" style={{ animation: 'spin .8s linear infinite' }} />
                  : <i className="ti ti-server" />}
                MySQL / MariaDB
                {dbStatus.current_driver === 'mysql' && <span style={{ fontSize: 10, opacity: 0.7 }}>(الحالية)</span>}
              </button>
            </div>
          </>
        ) : (
          <div style={{ padding: '14px 0', color: 'var(--t4)', fontSize: 12 }}>تعذّر جلب الحالة</div>
        )}
      </Section>

      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
