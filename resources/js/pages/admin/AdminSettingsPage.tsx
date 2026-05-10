// pages/admin/AdminSettingsPage.tsx
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Switch from '@/components/ui/Switch';
import Button from '@/components/ui/Button';
import AlertBar from '@/components/ui/AlertBar';
import { adminApi } from '@/lib/api/admin';

type SystemSettings = {
  allow_registration: boolean;
  allow_new_companies: boolean;
  debug_mode: boolean;
  public_api: boolean;
  free_trial_days: number;
  free_max_users: number;
  starter_max_products: number;
  maintenance_mode: boolean;
  maintenance_message: string;
};

export default function AdminSettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<SystemSettings>({
    queryKey: ['admin-settings'],
    queryFn: () => adminApi.getSystemSettings(),
  });
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  useEffect(() => {
    if (data) setSettings(data);
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<SystemSettings>) => adminApi.updateSystemSettings(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-settings'] }),
  });

  const handleChange = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    if (!settings) return;
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    updateMutation.mutate({ [key]: value });
  };

  if (isLoading || !settings) return <div style={{ padding: 40, textAlign: 'center' }}>جار التحميل...</div>;

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      <PageHeader title="إعدادات النظام" description="إدارة التكوين العام للمنصة" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
        {/* General */}
        <Card title="الإعدادات العامة">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="sr">
              <div className="sr-l">تسجيل مستخدمين جدد</div>
              <Switch checked={settings.allow_registration} onChange={val => handleChange('allow_registration', val)} />
            </div>
            <div className="sr">
              <div className="sr-l">إنشاء شركات جديدة (عبر واجهة المستخدم)</div>
              <Switch checked={settings.allow_new_companies} onChange={val => handleChange('allow_new_companies', val)} />
            </div>
            <div className="sr">
              <div className="sr-l">وضع التصحيح (Debug)</div>
              <Switch checked={settings.debug_mode} onChange={val => handleChange('debug_mode', val)} />
            </div>
            <div className="sr">
              <div className="sr-l">API العام (غير مصادق)</div>
              <Switch checked={settings.public_api} onChange={val => handleChange('public_api', val)} />
            </div>
          </div>
        </Card>

        {/* Plans limits */}
        <Card title="الحدود الافتراضية للخطط">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="fg">
              <label>مدة التجربة (أيام)</label>
              <input type="number" value={settings.free_trial_days} onChange={e => handleChange('free_trial_days', Number(e.target.value))} min={1} max={90} />
            </div>
            <div className="fg">
              <label>حد المستخدمين – خطة مجانية</label>
              <input type="number" value={settings.free_max_users} onChange={e => handleChange('free_max_users', Number(e.target.value))} min={1} />
            </div>
            <div className="fg">
              <label>حد المنتجات – خطة Starter</label>
              <input type="number" value={settings.starter_max_products} onChange={e => handleChange('starter_max_products', Number(e.target.value))} min={100} />
            </div>
          </div>
        </Card>

        {/* Maintenance */}
        <Card title="وضع الصيانة">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Switch
              checked={settings.maintenance_mode}
              onChange={val => handleChange('maintenance_mode', val)}
              label="تفعيل وضع الصيانة (جميع المستخدمين العاديين سيرون صفحة الصيانة)"
            />
            {settings.maintenance_mode && (
              <div className="fg">
                <label>رسالة الصيانة (اختياري)</label>
                <textarea
                  value={settings.maintenance_message}
                  onChange={e => handleChange('maintenance_message', e.target.value)}
                  rows={2}
                  placeholder="سيتم العرض للمستخدمين..."
                />
              </div>
            )}
          </div>
        </Card>

        {/* Danger Zone */}
        <Card title="منطقة الخطر">
          <AlertBar variant="red">
            هذه الإجراءات لا يمكن التراجع عنها. يُنصح بأخذ نسخة احتياطية أولاً.
          </AlertBar>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <Button variant="danger" onClick={() => { if (confirm('مسح كامل الكاش؟')) adminApi.clearCache(); }}>مسح الكاش</Button>
            <Button variant="danger" onClick={() => { if (confirm('إعادة تشغيل المهام المجدولة؟')) adminApi.runScheduler(); }}>تشغيل المهام</Button>
            <Button variant="danger" onClick={() => { if (confirm('تصدير آخر نسخة احتياطية؟')) adminApi.exportBackup(); }}>نسخ احتياطي</Button>
          </div>
        </Card>

        {updateMutation.isPending && <div style={{ textAlign: 'center', padding: 8 }}>جاري الحفظ...</div>}
      </div>
    </div>
  );
}

// Add to adminApi
adminApi.getSystemSettings = () => apiGet<SystemSettings>('/admin/settings');
adminApi.updateSystemSettings = (data) => apiPatch('/admin/settings', data);
adminApi.clearCache = () => apiPost('/admin/system/clear-cache');
adminApi.runScheduler = () => apiPost('/admin/system/run-jobs');
adminApi.exportBackup = () => apiGet('/admin/system/backup', null, { responseType: 'blob' });
