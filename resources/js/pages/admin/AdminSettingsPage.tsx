// ════════════════════════════════════════════════════════════════════════════
// pages/admin/AdminSettingsPage.tsx  ← النسخة المُصلحة
//
// المشكلة الأصلية:
//   • كانت تستخدم apiClient مباشرة بدون import (import apiClient from '@/lib/api/core/client')
//   • الـ "تشغيل المهام المجدولة" كانت تستدعي maintenanceApi.enable() بدل adminApi.runScheduler()
//   • "نسخ احتياطي" كانت دالة فارغة () => {}
//
// الحل:
//   • استخدام hooks فقط — لا apiClient مباشرة في الصفحات
//   • تفعيل adminApi.runScheduler وadminApi.exportBackup
// ════════════════════════════════════════════════════════════════════════════
import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useSystemSettings, useMaintenanceMutations } from '@/hooks/admin';
import { adminApi } from '@/lib/admin';
import { SectionTitle, FlashBar } from '@/components/admin/shared';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import type { SystemSettings } from '@/types/admin';

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 12,
        border: 'none', cursor: 'pointer',
        background: checked ? 'var(--em)' : 'var(--bg4)',
        position: 'relative', transition: '.2s', flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 3,
        width: 18, height: 18, borderRadius: '50%',
        background: '#fff', transition: '.2s',
        right: checked ? 3 : 23,
        boxShadow: '0 1px 4px rgba(0,0,0,.2)',
      }} />
    </button>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function Row({
  label,
  sub,
  children,
}: {
  label: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 0', borderBottom: '1px solid var(--b1)',
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

// ─── NumField ─────────────────────────────────────────────────────────────────

function NumField({
  label,
  value,
  onChange,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 11, fontWeight: 700,
        color: 'var(--t4)', marginBottom: 6,
      }}>
        {label}
      </label>
      <input
        type="number"
        value={value}
        min={min}
        onChange={e => onChange(parseInt(e.target.value) || 0)}
        style={{
          width: '100%', padding: '8px 10px', borderRadius: 8,
          border: '1px solid var(--b2)', background: 'var(--bg3)',
          color: 'var(--t1)', fontSize: 13, boxSizing: 'border-box' as const,
        }}
      />
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
  const { data, isLoading, update } = useSystemSettings();
  const maint = useMaintenanceMutations();

  // ✅ useMutation بدل استدعاء مباشر لـ apiClient
  const schedulerMut = useMutation({ mutationFn: adminApi.runScheduler });
  const backupMut    = useMutation({ mutationFn: adminApi.exportBackup });

  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [flash, setFlash]       = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (data) setSettings(data);
  }, [data]);

  const flash$ = (ok: boolean, msg: string) => {
    setFlash({ ok, msg });
    setTimeout(() => setFlash(null), 2500);
  };

  const save = async <K extends keyof SystemSettings>(
    key: K,
    value: SystemSettings[K],
  ) => {
    if (!settings) return;
    const prev = settings;
    setSettings({ ...settings, [key]: value });
    try {
      await update.mutateAsync({ [key]: value } as any);
      flash$(true, 'تم الحفظ تلقائياً');
    } catch {
      setSettings(prev);
      flash$(false, 'فشل الحفظ');
    }
  };

  if (isLoading || !settings) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: 200, gap: 10, color: 'var(--t4)',
      }}>
        <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
        جارٍ التحميل...
      </div>
    );
  }

  // ─── أدوات النظام ────────────────────────────────────────────────────────
  const systemTools = [
    {
      label:   'مسح الكاش',
      icon:    'ti-trash',
      action:  () => maint.clearCache.mutate(undefined, {
        onSuccess: () => flash$(true, 'تم مسح الكاش'),
        onError:   () => flash$(false, 'فشل مسح الكاش'),
      }),
      pending: maint.clearCache.isPending,
    },
    {
      label:   'تشغيل المهام المجدولة',  // ✅ كانت تستدعي maintenanceApi.enable() خطأً
      icon:    'ti-clock-play',
      action:  () => schedulerMut.mutate(undefined, {
        onSuccess: () => flash$(true, 'تم تشغيل المهام المجدولة'),
        onError:   () => flash$(false, 'فشل تشغيل المهام'),
      }),
      pending: schedulerMut.isPending,
    },
    {
      label:   'نسخ احتياطي',  // ✅ كانت دالة فارغة
      icon:    'ti-database-export',
      action:  () => backupMut.mutate(undefined, {
        onSuccess: () => flash$(true, 'تم إنشاء النسخة الاحتياطية'),
        onError:   () => flash$(false, 'فشل إنشاء النسخة الاحتياطية'),
      }),
      pending: backupMut.isPending,
    },
  ];

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <PageHeader
        title="إعدادات النظام"
        description="إدارة التكوين العام للمنصة"
      />

      {flash && <FlashBar ok={flash.ok} msg={flash.msg} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── الإعدادات العامة ─────────────────────────────────────────────── */}
        <Card title="الإعدادات العامة">
          <Row
            label="تسجيل مستخدمين جدد"
            sub="السماح للزوار بإنشاء حسابات"
          >
            <Toggle
              checked={settings.allow_registration}
              onChange={v => save('allow_registration', v)}
            />
          </Row>
          <Row
            label="إنشاء شركات جديدة"
            sub="السماح للمستخدمين بإنشاء شركات"
          >
            <Toggle
              checked={settings.allow_new_companies}
              onChange={v => save('allow_new_companies', v)}
            />
          </Row>
          <Row
            label="وضع التصحيح (Debug)"
            sub="أوقفه في الإنتاج"
          >
            <Toggle
              checked={settings.debug_mode}
              onChange={v => save('debug_mode', v)}
            />
          </Row>
          <Row
            label="API العام"
            sub="طلبات بدون مصادقة"
          >
            <Toggle
              checked={settings.public_api}
              onChange={v => save('public_api', v)}
            />
          </Row>
        </Card>

        {/* ── الحدود الافتراضية ─────────────────────────────────────────────── */}
        <Card title="الحدود الافتراضية">
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: 14, padding: '8px 0',
          }}>
            <NumField
              label="مدة التجربة المجانية (أيام)"
              value={settings.free_trial_days}
              onChange={v => save('free_trial_days', v)}
              min={1}
            />
            <NumField
              label="حد المستخدمين — مجاني"
              value={settings.free_max_users}
              onChange={v => save('free_max_users', v)}
              min={1}
            />
            <NumField
              label="حد المنتجات — Starter"
              value={settings.starter_max_products}
              onChange={v => save('starter_max_products', v)}
              min={1}
            />
          </div>
        </Card>

        {/* ── وضع الصيانة ──────────────────────────────────────────────────── */}
        <Card title="وضع الصيانة">
          <Row
            label="تفعيل وضع الصيانة"
            sub="المستخدمون العاديون سيرون صفحة الصيانة"
          >
            <Toggle
              checked={settings.maintenance_mode}
              onChange={v => {
                save('maintenance_mode', v);
                if (v) {
                  maint.enable.mutate(settings.maintenance_message);
                } else {
                  maint.disable.mutate();
                }
              }}
            />
          </Row>
          {settings.maintenance_mode && (
            <div style={{ paddingTop: 12 }}>
              <label style={{
                display: 'block', fontSize: 11, fontWeight: 700,
                color: 'var(--t4)', marginBottom: 6,
              }}>
                رسالة الصيانة
              </label>
              <textarea
                value={settings.maintenance_message}
                onChange={e =>
                  setSettings(s => s ? { ...s, maintenance_message: e.target.value } : s)
                }
                onBlur={e => save('maintenance_message', e.target.value)}
                rows={2}
                placeholder="رسالة تُعرض للمستخدمين..."
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 8,
                  border: '1px solid var(--b2)', background: 'var(--bg3)',
                  color: 'var(--t1)', fontSize: 13, resize: 'vertical',
                  boxSizing: 'border-box' as const,
                  fontFamily: 'Tajawal, sans-serif',
                }}
              />
            </div>
          )}
        </Card>

        {/* ── أدوات النظام ─────────────────────────────────────────────────── */}
        <Card title="أدوات النظام">
          <div style={{ padding: '8px 0', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {systemTools.map(btn => (
              <button
                key={btn.label}
                onClick={() => {
                  if (confirm(`${btn.label}؟`)) btn.action();
                }}
                disabled={btn.pending}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 8,
                  border: '1px solid #ef444433', background: '#ef44440d',
                  color: '#ef4444', fontSize: 12, fontWeight: 700,
                  cursor: btn.pending ? 'not-allowed' : 'pointer',
                  fontFamily: 'Tajawal, sans-serif',
                  opacity: btn.pending ? .6 : 1,
                }}
              >
                <i
                  className={`ti ${btn.pending ? 'ti-loader' : btn.icon}`}
                  style={{ animation: btn.pending ? 'spin 1s linear infinite' : 'none' }}
                />
                {btn.label}
              </button>
            ))}
          </div>
        </Card>

      </div>
    </div>
  );
}
