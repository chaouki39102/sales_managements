// pages/status/ConnectionStatusPage.tsx — بوابة حالة الاتصال للنظام
//
// تظهر عند فتح التطبيق (/) أو عبر /status مباشرة. تعرض:
//   1. حالة الاتصال بالخادم (backend)
//   2. حالة قاعدة البيانات
//   3. حالة الجلسة (مفتوحة أم لا)
// ثم توجّه تلقائياً:
//   - خادم متصل + جلسة مفتوحة  → لوحة التحكم (أو /admin/dashboard للـ super admin)
//   - خادم متصل + لا جلسة      → صفحة تسجيل الدخول
//   - خادم غير متصل            → تبقى هنا وتعرض السبب الجذري + تشخيص كامل
//                              + أزرار تشغيل/إيقاف/إعادة تشغيل عبر المساعد (8777)
//
// المسار /health عام (بدون مصادقة) — لا يشترط auth حتى تعمل الصفحة دائماً.
// المساعد (server-helper) مستقل عن Laravel فيبقى متاحاً حتى عند توقف التطبيق.

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { fetchHealth, type HealthReport, type HealthCheck } from '@/lib/api/endpoints/health';
import {
  getServerStatus,
  isHelperReachable,
  startServer,
  stopServer,
  restartServer,
  openHelperPage,
  type HelperStatus,
} from '@/lib/api/endpoints/serverControl';
import { authKeys } from '@/lib/api/core/queryKeys';
import { tokenStorage } from '@/lib/api/core/client';

type Phase =
  | 'checking'      // جارٍ فحص الاتصال
  | 'connected'     // الخادم متصل (قد يُوجَّه بعد عدّ تنازلي)
  | 'disconnected'; // الخادم غير متصل — عرض التشخيص

const HELPER_URL = () => `http://${window.location.hostname}:8777`;

export default function ConnectionStatusPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading, isSuperAdmin, user } = useAuth();

  const [health, setHealth] = useState<HealthReport | null>(null);
  const [phase, setPhase] = useState<Phase>('checking');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [helper, setHelper] = useState<HelperStatus | null>(null);
  const [helperReachable, setHelperReachable] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const navigatedRef = useRef(false);
  const prevHealthRef = useRef<HealthReport | null>(null);

  // ── فحص دوري لحالة الخادم كل 5 ثوانٍ ──
  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    const check = async () => {
      const h = await fetchHealth(9000);
      if (cancelled) return;
      setHealth(h);
      setPhase(h ? 'connected' : 'disconnected');
    };
    void check();
    timer = window.setInterval(check, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  // ── فحص دوري لحالة المساعد (8777) كل 8 ثوانٍ ──
  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    const check = async () => {
      try {
        const reachable = await isHelperReachable(2500);
        if (cancelled) return;
        setHelperReachable(reachable);
        if (reachable) {
          setHelper(await getServerStatus());
        }
      } catch {
        if (!cancelled) setHelperReachable(false);
      }
    };
    void check();
    timer = window.setInterval(check, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  // ── عند عودة الاتصال (كان الخادم متوقفاً ثم اشتغل) نعيد فحص الجلسة ──
  useEffect(() => {
    const wasDown = !prevHealthRef.current;
    prevHealthRef.current = health;
    if (health && wasDown && tokenStorage.get()) {
      void queryClient.refetchQueries({ queryKey: authKeys.me });
    }
  }, [health, queryClient]);

  const connected = phase === 'connected' && !!health;

  // ── توجيه تلقائي: خادم متصل + حالة الجلسة معروفة ──
  const target = isAuthenticated
    ? (isSuperAdmin ? '/admin/dashboard' : '/dashboard')
    : '/login';

  useEffect(() => {
    if (navigatedRef.current) return;
    if (!connected || isLoading) return;

    navigatedRef.current = true;
    setCountdown(3);

    const iv = window.setInterval(() => {
      setCountdown(c => {
        if (c === null || c <= 1) {
          window.clearInterval(iv);
          navigate(target, { replace: true });
          return 0;
        }
        return c - 1;
      });
    }, 700);

    return () => window.clearInterval(iv);
  }, [connected, isLoading, target, navigate]);

  // ── تنفيذ أمر تشغيل/إيقاف/إعادة تشغيل عبر المساعد ──
  const runAction = async (action: 'start' | 'stop' | 'restart') => {
    setBusyAction(action);
    setActionMsg(null);
    try {
      const fn = action === 'start' ? startServer : action === 'stop' ? stopServer : restartServer;
      const res = await fn();
      setActionMsg(res.message);
      setHelperReachable(true);
    } catch {
      setActionMsg('تعذر الوصول إلى المساعد — تأكد أنه يعمل على ' + HELPER_URL());
      setHelperReachable(false);
    } finally {
      setBusyAction(null);
      // إعادة فحص فوري بعد الأمر
      const h = await fetchHealth(9000);
      setHealth(h);
      setPhase(h ? 'connected' : 'disconnected');
      try {
        if (await isHelperReachable(2500)) setHelper(await getServerStatus());
      } catch { /* ignore */ }
    }
  };

  const dbOk = health?.database === 'connected';
  const dbDegraded = connected && !dbOk;
  const problem = helper?.problem ?? (phase === 'disconnected' ? health?.problem : null) ?? null;
  const helperUpButUnreachable = phase === 'disconnected' && !!helper?.server.up;

  // تحديث إجباري يتجاوز ذاكرة التخزين المؤقت (المساعد يعمل لكن المتصفح لا يصل)
  const hardReload = async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k === 'api-cache').map(k => caches.delete(k)));
    } catch { /* caches API غير متاح */ }
    window.location.reload();
  };

  return (
    <div style={styles.wrap}>
      {/* ── Brand ── */}
      <div style={styles.brand}>
        <div style={styles.brandBox}>ب</div>
        <div>
          <div style={styles.brandName}>بيزنس بلاس</div>
          <div style={styles.brandSub}>نظام إدارة المبيعات</div>
        </div>
      </div>

      <div style={styles.card}>
        <StatusHeader phase={phase} countdown={countdown} sessionOpen={isAuthenticated && !isLoading} />

        {/* ── بطاقات الحالة ── */}
        <div style={styles.cards}>
          <StatusCard
            icon="ti-server"
            label="الخادم"
            ok={connected}
            checking={phase === 'checking'}
            detail={connected ? (health?.service ?? 'متصل') : 'غير متصل'}
            sub={connected ? `${health?.environment} · ${health?.laravel_version ?? ''}` : 'تعذر الوصول إلى /health'}
          />
          <StatusCard
            icon="ti-database"
            label="قاعدة البيانات"
            ok={dbOk}
            checking={phase === 'checking'}
            detail={dbOk ? 'متصلة' : (health?.database ?? 'غير معروف')}
            sub={connected ? `${health?.database_driver ?? ''} · ${health?.php_version ?? ''}` : 'غير متاح بدون خادم'}
          />
          <StatusCard
            icon="ti-user-circle"
            label="الجلسة"
            ok={isAuthenticated}
            checking={phase === 'checking' || isLoading}
            detail={isAuthenticated && user ? (user.name ?? 'مستخدم') : 'لا توجد جلسة'}
            sub={isAuthenticated && user ? (user.email ?? '') : 'مطلوب تسجيل الدخول'}
          />
        </div>

        {/* ── السبب الجذري للمشكلة ── */}
        {phase === 'disconnected' && problem && (
          <RootCauseBanner check={problem} />
        )}
        {phase === 'disconnected' && !problem && !helperUpButUnreachable && (
          <div style={{ ...styles.alert, ...styles.alertRed }}>
            <i className="ti ti-alert-octagon" />
            <span>الخادم غير متصل — لا يمكن الوصول إلى واجهة /health. استخدم المساعد أدناه لتشخيص المشكلة أو تشغيل الخادم.</span>
          </div>
        )}

        {/* ── المساعد يرى الخادم يعمل لكن المتصفح لا يصل إليه ── */}
        {helperUpButUnreachable && (
          <div style={{ ...styles.alert, ...styles.alertWarn }}>
            <i className="ti ti-server-cog" />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 800, color: 'var(--t1)' }}>
                الخادم يعمل فعلياً (حسب المساعد) لكن متصفحك لا يصل إلى /health
              </div>
              <div style={{ fontSize: 12, marginTop: 2, color: 'var(--t3)' }}>
                غالباً صفحة قديمة من الذاكرة المؤقتة أو عنوان غير صحيح. حدّث الصفحة الآن:
              </div>
            </div>
            <button type="button" style={{ ...styles.btn, ...styles.btnStart }} onClick={() => void hardReload()}>
              <i className="ti ti-refresh" />
              تحديث إجباري
            </button>
          </div>
        )}

        {/* ── DB degraded ── */}
        {dbDegraded && health?.database_error && (
          <div style={{ ...styles.alert, ...styles.alertWarn }}>
            <i className="ti ti-alert-triangle" />
            <span>قاعدة البيانات غير متصلة:</span>
            <code style={styles.code}>{health.database_error}</code>
          </div>
        )}

        {/* ── تشخيص كامل عند انقطاع الاتصال ── */}
        {phase === 'disconnected' && (
          <DiagnosticSection
            helper={helper}
            helperReachable={helperReachable}
            health={health}
            busyAction={busyAction}
            onAction={runAction}
          />
        )}

        {/* ── تشخيص كامل عند الاتصال (تفصيلي) ── */}
        {connected && health?.checks && health.checks.length > 0 && (
          <CheckGrid checks={health.checks} title="التشخيص التفصيلي" />
        )}

        {/* ── إجراءات ── */}
        <div style={styles.actions}>
          {phase === 'checking' && (
            <button type="button" style={styles.btn} disabled>
              <span style={styles.spinner} />
              جارٍ فحص الاتصال…
            </button>
          )}

          {connected && isAuthenticated && (
            <button type="button" style={{ ...styles.btn, ...styles.btnPrimary }} onClick={() => navigate(target, { replace: true })}>
              <i className="ti ti-login" />
              {countdown !== null && countdown > 0 ? `الذهاب إلى لوحة التحكم (${countdown})` : 'الذهاب إلى لوحة التحكم'}
            </button>
          )}

          {connected && !isAuthenticated && (
            <button type="button" style={{ ...styles.btn, ...styles.btnPrimary }} onClick={() => navigate('/login', { replace: true })}>
              <i className="ti ti-login" />
              {countdown !== null && countdown > 0 ? `تسجيل الدخول (${countdown})` : 'تسجيل الدخول'}
            </button>
          )}

          {phase === 'disconnected' && (
            <button type="button" style={styles.btn} onClick={() => { navigatedRef.current = false; setPhase('checking'); setHealth(null); void (async () => setHealth(await fetchHealth(9000)))(); }}>
              <i className="ti ti-refresh" />
              إعادة المحاولة
            </button>
          )}

          {phase === 'disconnected' && (
            <Link to="/login" style={styles.btnGhost}>متابعة إلى صفحة الدخول</Link>
          )}
        </div>

        {actionMsg && (
          <div style={{ ...styles.alert, ...styles.alertWarn, marginTop: 16 }}>
            <i className="ti ti-info-circle" />
            <span>{actionMsg}</span>
          </div>
        )}

        <p style={styles.foot}>
          يمكنك دائماً فتح هذه الصفحة يدوياً على <code style={styles.codeInline}>/status</code>
        </p>
      </div>
    </div>
  );
}

// ═══ المكوّنات الفرعية ═══

function StatusHeader({ phase, countdown, sessionOpen }: { phase: Phase; countdown: number | null; sessionOpen: boolean }) {
  let icon = 'ti-loader';
  let iconSpin = true;
  let color = 'var(--t4)';
  let bg = 'var(--bg4)';
  let title = 'جارٍ فحص الاتصال…';
  let sub = 'نتحقق من الخادم وقاعدة البيانات والجلسة';

  if (phase === 'connected') {
    if (sessionOpen) {
      icon = 'ti-circle-check';
      iconSpin = false;
      color = 'var(--green)';
      bg = 'var(--greenb)';
      title = 'كل شيء يعمل — الجلسة مفتوحة';
      sub = countdown !== null && countdown > 0
        ? `سيتم نقلك إلى لوحة التحكم خلال ${countdown} ثانية…`
        : 'سيتم نقلك إلى لوحة التحكم…';
    } else {
      icon = 'ti-circle-check';
      iconSpin = false;
      color = 'var(--em)';
      bg = 'var(--emb)';
      title = 'الخادم متصل — مرحباً بك';
      sub = countdown !== null && countdown > 0
        ? `سيتم نقلك إلى صفحة تسجيل الدخول خلال ${countdown} ثانية…`
        : 'سيتم نقلك إلى صفحة تسجيل الدخول…';
    }
  } else if (phase === 'disconnected') {
    icon = 'ti-circle-x';
    iconSpin = false;
    color = 'var(--red)';
    bg = 'var(--redb)';
    title = 'تعذر الاتصال بالخادم';
    sub = 'اعرض التشخيص أدناه لحل المشكلة';
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
      <div style={{ width: 56, height: 56, borderRadius: 'var(--r3)', background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, flexShrink: 0 }}>
        <i className={`ti ${icon} ${iconSpin ? 'animate-spin' : ''}`} />
      </div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--t1)' }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--t4)' }}>{sub}</div>
      </div>
    </div>
  );
}

function StatusCard({ icon, label, ok, checking, detail, sub }: { icon: string; label: string; ok: boolean; checking: boolean; detail: string; sub: string }) {
  const color = checking ? 'var(--t4)' : ok ? 'var(--green)' : 'var(--red)';
  const bg = checking ? 'var(--bg4)' : ok ? 'var(--greenb)' : 'var(--redb)';
  return (
    <div style={{ flex: '1 1 200px', border: '1px solid var(--b2)', borderRadius: 'var(--r2)', padding: 16, background: 'var(--bg2)', boxShadow: 'var(--shadow)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>
          <i className={`ti ${icon}`} />
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t3)' }}>{label}</div>
        <div style={{ marginLeft: 'auto', width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 0 4px ${bg}` }} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1)' }}>{detail}</div>
      <div style={{ fontSize: 12, color: 'var(--t4)', marginTop: 2 }}>{sub}</div>
    </div>
  );
}

const CHECK_ICONS: Record<string, string> = {
  server: 'ti-server',
  php: 'ti-brand-php',
  extensions: 'ti-puzzle',
  env: 'ti-file-text',
  database: 'ti-database',
  migrations: 'ti-arrows-shuffle',
  storage: 'ti-folder',
  build: 'ti-building-skyscraper',
};

function checkIcon(id: string): string {
  return CHECK_ICONS[id] ?? 'ti-tool';
}

function RootCauseBanner({ check }: { check: HealthCheck }) {
  return (
    <div style={{ marginTop: 16, ...styles.alert, ...styles.alertRed }}>
      <i className="ti ti-alert-octagon" style={{ fontSize: 18 }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontWeight: 800, color: 'var(--t1)' }}>
          المشكلة: {check.name}
        </div>
        <div style={{ fontSize: 12, marginTop: 2, color: 'var(--t3)' }}>{check.detail}</div>
        {check.fix && (
          <div style={{ fontSize: 12, marginTop: 4, color: 'var(--t3)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-bulb" style={{ color: 'var(--orange)' }} />
            <span>الحل: <b style={{ color: 'var(--t1)' }}>{check.fix}</b></span>
          </div>
        )}
      </div>
    </div>
  );
}

function CheckGrid({ checks, title }: { checks: HealthCheck[]; title: string }) {
  return (
    <div style={{ marginTop: 20, border: '1px solid var(--b2)', borderRadius: 'var(--r2)', padding: 18, background: 'var(--bg3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <i className="ti ti-report-medical" style={{ color: 'var(--em)' }} />
        <span style={{ fontWeight: 800, color: 'var(--t1)' }}>{title}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
        {checks.map(c => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, border: '1px solid var(--b1)', borderRadius: 'var(--r2)', padding: 12, background: 'var(--bg2)' }}>
            <div style={{
              width: 26, height: 26, borderRadius: 8, flexShrink: 0,
              background: c.ok ? 'var(--greenb)' : 'var(--redb)',
              color: c.ok ? 'var(--green)' : 'var(--red)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
            }}>
              <i className={`ti ${c.ok ? 'ti-circle-check' : 'ti-circle-x'}`} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className={`ti ${checkIcon(c.id)}`} style={{ color: 'var(--t4)', fontSize: 13 }} />
                <span style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--t2)' }}>{c.name}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 3, lineHeight: 1.5, direction: 'ltr', textAlign: 'right' }}>{c.detail}</div>
              {!c.ok && c.fix && (
                <div style={{ fontSize: 11, color: 'var(--orange)', marginTop: 3, lineHeight: 1.5 }}>الحل: {c.fix}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DiagnosticSection({
  helper, helperReachable, health, busyAction, onAction,
}: {
  helper: HelperStatus | null;
  helperReachable: boolean;
  health: HealthReport | null;
  busyAction: string | null;
  onAction: (a: 'start' | 'stop' | 'restart') => void;
}) {
  const canStart = !!helper?.actions.can_start;
  const canStop = !!helper?.actions.can_stop;

  return (
    <div style={{ marginTop: 20, border: '1px solid var(--b2)', borderRadius: 'var(--r2)', padding: 18, background: 'var(--bg3)' }}>
      {/* ── أزرار التحكم بالسيرفر ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <i className="ti ti-player-play" style={{ color: 'var(--em)' }} />
        <span style={{ fontWeight: 800, color: 'var(--t1)' }}>التحكم بالخادم</span>
        <span style={{ fontSize: 11, color: 'var(--t4)' }}>عبر المساعد ({HELPER_URL()})</span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
        <button
          type="button"
          style={{ ...styles.btn, ...styles.btnStart }}
          disabled={busyAction !== null || !helperReachable || (!canStart && canStop)}
          onClick={() => onAction('start')}
        >
          {busyAction === 'start' ? <span style={styles.spinner} /> : <i className="ti ti-player-play" />}
          تشغيل السيرفر
        </button>
        <button
          type="button"
          style={{ ...styles.btn, ...styles.btnStop }}
          disabled={busyAction !== null || !helperReachable || !canStop}
          onClick={() => onAction('stop')}
        >
          {busyAction === 'stop' ? <span style={styles.spinner} /> : <i className="ti ti-player-stop" />}
          إيقاف
        </button>
        <button
          type="button"
          style={{ ...styles.btn }}
          disabled={busyAction !== null || !helperReachable || !canStop}
          onClick={() => onAction('restart')}
        >
          {busyAction === 'restart' ? <span style={styles.spinner} /> : <i className="ti ti-refresh" />}
          إعادة تشغيل
        </button>
        <button
          type="button"
          style={styles.btnGhost}
          onClick={openHelperPage}
        >
          <i className="ti ti-external-link" />
          فتح صفحة المساعد
        </button>
      </div>

      {!helperReachable && (
        <div style={{ ...styles.alert, ...styles.alertWarn, marginTop: 8 }}>
          <i className="ti ti-server-off" />
          <span>المساعد غير متاح على المنفذ 8777. لتشغيله أعد تشغيل <b>start-server.bat</b> أو نفّذ:</span>
          <code style={styles.code}>php -S 0.0.0.0:8777 server-helper\router.php</code>
        </div>
      )}
      {helperReachable && helper && (
        <div style={{ fontSize: 11, color: 'var(--t4)', marginBottom: 8 }}>
          الخادم: {helper.server.up ? `يعمل (PID ${helper.server.pid ?? '?'})` : 'متوقف'} · PHP {health?.php_version ?? ''} · قاعدة البيانات: {helper.server.health?.database ?? '?'}
        </div>
      )}

      {/* ── التشخيص الكامل ── */}
      {helper?.checks && helper.checks.length > 0 && (
        <CheckGrid checks={helper.checks} title="التشخيص الكامل (من المساعد)" />
      )}
      {!helper?.checks && health?.checks && health.checks.length > 0 && (
        <CheckGrid checks={health.checks} title="التشخيص الكامل (من الخادم)" />
      )}
      {!helper?.checks && !health?.checks && (
        <div style={{ marginTop: 14, fontSize: 12, color: 'var(--t4)' }}>
          لا تتوفر تفاصيل تشخيص — شغّل المساعد للحصول على معلومات أوضح.
        </div>
      )}
    </div>
  );
}

// ═══ أنماط ═══

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: '100vh',
    background: 'var(--grad-bg)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    direction: 'rtl',
    gap: 24,
  },
  brand: { display: 'flex', alignItems: 'center', gap: 12 },
  brandBox: {
    width: 44, height: 44, borderRadius: 13,
    background: 'var(--grad-em)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 900, fontSize: 20, boxShadow: 'var(--emglow)',
  },
  brandName: { fontWeight: 900, fontSize: 16, color: 'var(--t1)' },
  brandSub: { fontSize: 11, color: 'var(--t4)' },
  card: {
    width: '100%', maxWidth: 780,
    background: 'var(--bg2)',
    borderRadius: 'var(--r4)',
    padding: 28,
    boxShadow: 'var(--shadow2)',
    border: '1px solid var(--b2)',
  },
  cards: { display: 'flex', flexWrap: 'wrap', gap: 12 },
  alert: {
    marginTop: 16, padding: '12px 14px', borderRadius: 'var(--r2)',
    display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
    fontSize: 13,
  },
  alertWarn: { background: 'var(--orb)', color: 'var(--orange)', border: '1px solid var(--orbo)' },
  alertRed: { background: 'var(--redb)', color: 'var(--red)', border: '1px solid var(--redbo)' },
  code: { background: 'rgba(0,0,0,.08)', padding: '1px 6px', borderRadius: 4, fontSize: 11, fontFamily: 'monospace', color: 'inherit', direction: 'ltr' },
  codeInline: { background: 'var(--bg4)', padding: '1px 6px', borderRadius: 4, fontSize: 11, fontFamily: 'monospace', color: 'var(--em)' },
  actions: { marginTop: 24, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  btn: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '10px 18px', borderRadius: 'var(--r2)',
    border: '1px solid var(--b3)', background: 'var(--bg2)',
    color: 'var(--t2)', fontSize: 13, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none',
    transition: '.15s',
  },
  btnPrimary: { background: 'var(--em)', color: '#fff', borderColor: 'var(--em)', boxShadow: 'var(--emglow)' },
  btnStart: { background: 'var(--green)', color: '#fff', borderColor: 'var(--green)' },
  btnStop: { background: 'var(--red)', color: '#fff', borderColor: 'var(--red)' },
  btnGhost: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '10px 18px', borderRadius: 'var(--r2)',
    border: '1px solid var(--b3)', background: 'transparent',
    color: 'var(--t4)', fontSize: 13, fontWeight: 700,
    textDecoration: 'none', fontFamily: 'inherit', cursor: 'pointer',
  },
  spinner: {
    width: 15, height: 15, borderRadius: '50%',
    border: '2px solid rgba(0,0,0,.15)', borderTopColor: 'var(--em)',
    animation: 'spin .7s linear infinite',
    display: 'inline-block',
  },
  foot: { marginTop: 20, fontSize: 12, color: 'var(--t4)', textAlign: 'center' },
};
