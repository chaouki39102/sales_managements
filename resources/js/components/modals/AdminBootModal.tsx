// ════════════════════════════════════════════════════════════════════════════
// components/modals/AdminBootModal.tsx
//
// مودال إعداد النظام للسوبر أدمن — يظهر مرة واحدة عند أول دخول
// يتحقق من حالة البيانات العالمية ويثبّتها عبر:
//   GET  /api/v1/admin/system/status
//   POST /api/v1/admin/system/boot
//   POST /api/v1/admin/system/boot/wilayas
//   POST /api/v1/admin/system/boot/permissions
// ════════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState, useCallback } from 'react';
import { apiPost, apiGet } from '@/lib/api/core/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SystemComponent {
  key:   string;
  label: string;
  icon:  string;
  done:  boolean;
  count: string;
}

interface SystemStatus {
  is_ready:   boolean;
  components: SystemComponent[];
}

type Phase = 'checking' | 'ready' | 'needs_setup' | 'installing' | 'done' | 'error';
type ItemStatus = 'pending' | 'installing' | 'done' | 'error' | 'skipped';

interface InstallStep {
  key:      string;
  label:    string;
  icon:     string;
  endpoint: string;  // POST endpoint نسبي
  status:   ItemStatus;
  message?: string;
  ms?:      number;
}

// الخطوات بالترتيب الصحيح
const INSTALL_STEPS: Omit<InstallStep, 'status'>[] = [
  {
    key:      'wilayas',
    label:    'الولايات والبلديات الجزائرية',
    icon:     'ti-map-pin',
    endpoint: '/api/v1/admin/system/boot/wilayas',
  },
  {
    key:      'permissions',
    label:    'الصلاحيات ودور مدير النظام',
    icon:     'ti-shield-check',
    endpoint: '/api/v1/admin/system/boot/permissions',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminBootModal({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [phase,   setPhase]   = useState<Phase>('checking');
  const [status,  setStatus]  = useState<SystemStatus | null>(null);
  const [steps,   setSteps]   = useState<InstallStep[]>(
    INSTALL_STEPS.map(s => ({ ...s, status: 'pending' }))
  );
  const [elapsed,       setElapsed]       = useState(0);
  const [currentLabel,  setCurrentLabel]  = useState('جارٍ فحص النظام...');
  const [doneCount,     setDoneCount]     = useState(0);
  const [errorMsg,      setErrorMsg]      = useState<string | null>(null);

  const timerRef  = useRef<ReturnType<typeof setInterval>>();
  const startRef  = useRef(Date.now());

  // ── Timer ────────────────────────────────────────────────────────────────
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 100) / 10);
    }, 100);
    return () => clearInterval(timerRef.current);
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const setStep = useCallback((key: string, patch: Partial<InstallStep>) => {
    setSteps(prev => prev.map(s => s.key === key ? { ...s, ...patch } : s));
  }, []);

  // ── 1. فحص الحالة عند التحميل ───────────────────────────────────────────
  useEffect(() => {
    const check = async () => {
      try {
        const res = await apiGet<SystemStatus>('/admin/system/status');
        setStatus(res);

        if (res.is_ready) {
          clearInterval(timerRef.current);
          setPhase('ready');
          setCurrentLabel('النظام مُعدّ ✓');
          // انتقل تلقائياً بعد ثانية
          setTimeout(onComplete, 1000);
        } else {
          setPhase('needs_setup');
          setCurrentLabel('يلزم إعداد النظام أولاً');
        }
      } catch (e: any) {
        setErrorMsg(e?.response?.data?.message ?? 'تعذّر الاتصال بالخادم');
        setPhase('error');
        clearInterval(timerRef.current);
      }
    };

    check();
  }, [onComplete]);

  // ── 2. تثبيت البيانات العالمية ─────────────────────────────────────────
  const handleInstall = useCallback(async () => {
    setPhase('installing');
    startRef.current = Date.now();
    setElapsed(0);

    const errors: string[] = [];

    for (const step of INSTALL_STEPS) {
      setCurrentLabel(step.label);
      setStep(step.key, { status: 'installing' });

      // scroll into view
      setTimeout(() => {
        document.getElementById(`boot-step-${step.key}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);

      const t0 = Date.now();
      try {
        await apiPost(step.endpoint);
        setStep(step.key, { status: 'done', ms: Date.now() - t0 });
      } catch (e: any) {
        const msg = e instanceof Error ? e.message : 'خطأ غير معروف';
        setStep(step.key, { status: 'error', message: msg });
        errors.push(`${step.label}: ${msg}`);
      }

      setDoneCount(d => d + 1);
      await new Promise(r => setTimeout(r, 200));
    }

    clearInterval(timerRef.current);

    if (errors.length === 0) {
      setPhase('done');
      setCurrentLabel('اكتمل الإعداد بنجاح ✓');
      setTimeout(onComplete, 1200);
    } else {
      setPhase('error');
      setErrorMsg(errors.join(' — '));
      setCurrentLabel(`اكتمل مع ${errors.length} أخطاء`);
    }
  }, [setStep, onComplete]);

  // ── حساب التقدم ──────────────────────────────────────────────────────────
  const TOTAL    = INSTALL_STEPS.length;
  const progress = phase === 'done'  ? 100
                 : phase === 'ready' ? 100
                 : Math.round((doneCount / TOTAL) * 100);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,.80)', backdropFilter: 'blur(14px)',
      padding: 20, direction: 'rtl',
      animation: 'abFadeIn .25s ease',
    }}>
      <div style={{
        background: 'var(--bg2)',
        borderRadius: 24,
        width: '100%', maxWidth: 500,
        border: '1px solid var(--b3)',
        boxShadow: '0 40px 100px rgba(0,0,0,.55)',
        overflow: 'hidden',
        animation: 'abSlideUp .3s cubic-bezier(.34,1.4,.64,1)',
      }}>

        {/* ══ Header ════════════════════════════════════════════════════════ */}
        <div style={{
          background: phase === 'done' || phase === 'ready'
            ? 'linear-gradient(135deg, #059669 0%, #065f46 100%)'
            : phase === 'error'
            ? 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'
            : 'linear-gradient(135deg, var(--em) 0%, var(--em3) 100%)',
          padding: '28px 28px 22px',
          position: 'relative', overflow: 'hidden',
          transition: 'background .5s',
        }}>
          {/* دوائر زخرفية */}
          <div style={{ position:'absolute', top:-60, left:-60, width:200, height:200, borderRadius:'50%', background:'rgba(255,255,255,.05)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', bottom:-40, right:-30, width:140, height:140, borderRadius:'50%', background:'rgba(255,255,255,.04)', pointerEvents:'none' }} />

          <div style={{ position:'relative', display:'flex', alignItems:'flex-start', gap:16 }}>
            {/* أيقونة */}
            <div style={{
              width: 56, height: 56, borderRadius: 18, flexShrink: 0,
              background: 'rgba(255,255,255,.18)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, boxShadow: '0 4px 16px rgba(0,0,0,.2)',
            }}>
              {phase === 'checking'    && <i className="ti ti-loader-2" style={{ animation:'abSpin .8s linear infinite', color:'#fff', fontSize:26 }} />}
              {phase === 'needs_setup' && <i className="ti ti-settings-2" style={{ color:'#fff', fontSize:26 }} />}
              {phase === 'installing'  && <i className="ti ti-loader-2" style={{ animation:'abSpin .8s linear infinite', color:'#fff', fontSize:26 }} />}
              {phase === 'done'        && <i className="ti ti-circle-check-filled" style={{ color:'#fff', fontSize:26, animation:'abPop .35s cubic-bezier(.34,1.5,.64,1)' }} />}
              {phase === 'ready'       && <i className="ti ti-circle-check-filled" style={{ color:'#fff', fontSize:26 }} />}
              {phase === 'error'       && <i className="ti ti-alert-triangle-filled" style={{ color:'#fff', fontSize:26 }} />}
            </div>

            <div style={{ flex: 1, paddingTop: 2 }}>
              <div style={{ fontSize:9, fontWeight:800, color:'rgba(255,255,255,.6)', letterSpacing:2, textTransform:'uppercase', marginBottom:6 }}>
                إعداد النظام — مدير النظام
              </div>
              <div style={{ fontSize:20, fontWeight:900, color:'#fff', lineHeight:1.25, marginBottom:4 }}>
                {phase === 'checking'    && 'جارٍ فحص النظام...'}
                {phase === 'needs_setup' && 'يلزم إعداد البيانات الأولية'}
                {phase === 'installing'  && 'جارٍ تثبيت البيانات...'}
                {phase === 'done'        && 'اكتمل الإعداد بنجاح!'}
                {phase === 'ready'       && 'النظام جاهز!'}
                {phase === 'error'       && 'حدث خطأ أثناء الإعداد'}
              </div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,.72)', lineHeight:1.5 }}>
                {phase === 'checking'    && 'يتحقق من البيانات العالمية...'}
                {phase === 'needs_setup' && 'الولايات والصلاحيات غير مثبتة — يجب تثبيتها مرة واحدة'}
                {phase === 'installing'  && `جارٍ التثبيت · ${elapsed}ث`}
                {phase === 'done'        && `اكتمل في ${elapsed} ثانية — جارٍ الانتقال...`}
                {phase === 'ready'       && 'البيانات العالمية مثبتة — جارٍ الانتقال...'}
                {phase === 'error'       && 'راجع التفاصيل أدناه'}
              </div>
            </div>
          </div>

          {/* شريط التقدم */}
          {(phase === 'installing' || phase === 'done' || phase === 'ready') && (
            <div style={{ marginTop: 20 }}>
              <div style={{
                height: 6, borderRadius: 99,
                background: 'rgba(255,255,255,.2)',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', borderRadius: 99,
                  background: 'rgba(255,255,255,.9)',
                  width: `${progress}%`,
                  transition: 'width .5s cubic-bezier(.4,0,.2,1)',
                  boxShadow: '0 0 12px rgba(255,255,255,.5)',
                }} />
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                marginTop: 6, fontSize: 11, color: 'rgba(255,255,255,.7)',
              }}>
                <span style={{ animation: phase === 'installing' ? 'abPulse 1.5s ease infinite' : 'none' }}>
                  {currentLabel}
                </span>
                <span style={{ fontWeight: 800, color: '#fff' }}>{progress}٪</span>
              </div>
            </div>
          )}
        </div>

        {/* ══ Body ══════════════════════════════════════════════════════════ */}
        <div style={{ padding: '16px 20px' }}>

          {/* ── حالة الفحص الأولي ─── */}
          {(phase === 'checking' || phase === 'needs_setup') && status && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--t4)', marginBottom: 10, letterSpacing: .5, textTransform: 'uppercase' }}>
                حالة المكونات العالمية
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {status.components.map(comp => (
                  <div key={comp.key} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', borderRadius: 12,
                    background: comp.done ? 'var(--emb)' : 'var(--redb)',
                    border: `1px solid ${comp.done ? 'var(--embo)' : 'var(--redbo)'}`,
                    transition: 'all .2s',
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                      background: comp.done ? 'var(--em)' : 'var(--red)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <i className={`ti ${comp.done ? 'ti-check' : comp.icon}`} style={{ fontSize: 15, color: '#fff' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>{comp.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--t4)' }}>{comp.count}</div>
                    </div>
                    <div style={{
                      fontSize: 10, fontWeight: 800, padding: '3px 8px',
                      borderRadius: 99,
                      background: comp.done ? 'var(--em)' : 'var(--red)',
                      color: '#fff',
                    }}>
                      {comp.done ? 'جاهز' : 'مطلوب'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── خطوات التثبيت ─── */}
          {(phase === 'installing' || phase === 'done' || phase === 'error') && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--t4)', marginBottom: 10, letterSpacing: .5, textTransform: 'uppercase' }}>
                تقدم التثبيت
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {steps.map(step => (
                  <div
                    id={`boot-step-${step.key}`}
                    key={step.key}
                    className="ab-step"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 12px', borderRadius: 10,
                      transition: 'background .15s',
                    }}
                  >
                    {/* أيقونة الحالة */}
                    <div style={{ width: 30, height: 30, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {step.status === 'pending' && (
                        <div style={{ width:22, height:22, borderRadius:'50%', border:'2px solid var(--b3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <i className={`ti ${step.icon}`} style={{ fontSize:11, color:'var(--t4)' }} />
                        </div>
                      )}
                      {step.status === 'installing' && (
                        <i className="ti ti-loader-2" style={{ fontSize:18, color:'var(--em)', animation:'abSpin .7s linear infinite' }} />
                      )}
                      {step.status === 'done' && (
                        <div style={{
                          width:22, height:22, borderRadius:'50%',
                          background:'var(--em)', display:'flex', alignItems:'center', justifyContent:'center',
                          animation:'abPop .3s cubic-bezier(.34,1.5,.64,1)',
                        }}>
                          <i className="ti ti-check" style={{ fontSize:12, color:'#fff', fontWeight:900 }} />
                        </div>
                      )}
                      {step.status === 'error' && (
                        <div style={{
                          width:22, height:22, borderRadius:'50%',
                          background:'var(--red)', display:'flex', alignItems:'center', justifyContent:'center',
                        }}>
                          <i className="ti ti-x" style={{ fontSize:11, color:'#fff' }} />
                        </div>
                      )}
                    </div>

                    {/* النص */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{
                        fontSize:13, fontWeight:600,
                        color: step.status === 'installing' ? 'var(--t1)'
                             : step.status === 'done'       ? 'var(--t2)'
                             : step.status === 'error'      ? 'var(--red)'
                             : 'var(--t4)',
                      }}>
                        {step.label}
                      </div>
                      {step.status === 'installing' && (
                        <div style={{ height:3, borderRadius:99, marginTop:4, background:'var(--bg4)', overflow:'hidden' }}>
                          <div style={{
                            height:'100%', borderRadius:99, width:'60%',
                            background:'linear-gradient(90deg, transparent, var(--em), transparent)',
                            backgroundSize:'400px 100%',
                            animation:'abShimmer 1.2s linear infinite',
                          }} />
                        </div>
                      )}
                      {step.status === 'error' && step.message && (
                        <div style={{ fontSize:11, color:'var(--red)', marginTop:2 }}>{step.message}</div>
                      )}
                    </div>

                    {/* الوقت */}
                    {step.status === 'done' && step.ms !== undefined && (
                      <div style={{ fontSize:10, color:'var(--t4)', flexShrink:0 }}>
                        {step.ms > 0 ? `${step.ms}ms` : <span style={{ color:'var(--em)', fontSize:9, fontWeight:700 }}>فوري</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── رسالة خطأ عامة ─── */}
          {phase === 'error' && errorMsg && (
            <div style={{
              padding: '10px 14px', borderRadius: 10, marginTop: 8,
              background: 'var(--redb)', border: '1px solid var(--redbo)',
              fontSize: 12, color: 'var(--red)', lineHeight: 1.5,
            }}>
              <i className="ti ti-alert-circle" style={{ marginLeft: 6 }} />
              {errorMsg}
            </div>
          )}

          {/* ── تحذير إذا النظام في وضع checking ─── */}
          {phase === 'checking' && !status && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '32px 0', color: 'var(--t4)', gap: 10,
            }}>
              <i className="ti ti-loader-2" style={{ fontSize:20, animation:'abSpin .8s linear infinite' }} />
              <span style={{ fontSize:13 }}>جارٍ فحص حالة النظام...</span>
            </div>
          )}
        </div>

        {/* ══ Footer ════════════════════════════════════════════════════════ */}
        <div style={{
          padding: '12px 20px 20px',
          borderTop: '1px solid var(--b1)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ fontSize:11, color:'var(--t4)' }}>
            {phase === 'installing' && `${doneCount} / ${TOTAL} خطوة`}
            {phase === 'done'       && `${TOTAL} / ${TOTAL} خطوة — مكتمل`}
            {phase === 'ready'      && 'البيانات العالمية موجودة'}
            {phase === 'error'      && 'يمكنك إعادة المحاولة'}
          </div>

          <div style={{ display:'flex', gap:8 }}>
            {/* زر التثبيت — يظهر فقط في needs_setup */}
            {phase === 'needs_setup' && (
              <button
                onClick={handleInstall}
                style={{
                  padding: '9px 20px', borderRadius: 12,
                  border: 'none', background: 'var(--em)', color: '#fff',
                  fontSize: 13, fontWeight: 800, cursor: 'pointer',
                  fontFamily: 'Tajawal, sans-serif',
                  display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: 'var(--emglow)', transition: '.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '.85'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                <i className="ti ti-player-play-filled" style={{ fontSize:13 }} />
                تثبيت البيانات الآن
              </button>
            )}

            {/* زر إعادة المحاولة */}
            {phase === 'error' && (
              <>
                <button
                  onClick={() => {
                    setSteps(INSTALL_STEPS.map(s => ({ ...s, status: 'pending' })));
                    setDoneCount(0);
                    setElapsed(0);
                    setErrorMsg(null);
                    startRef.current = Date.now();
                    handleInstall();
                  }}
                  style={{
                    padding: '8px 16px', borderRadius: 10,
                    border: 'none', background: 'var(--em)', color: '#fff',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    fontFamily: 'Tajawal, sans-serif',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <i className="ti ti-refresh" style={{ fontSize:13 }} />
                  إعادة المحاولة
                </button>
                <button
                  onClick={onComplete}
                  style={{
                    padding: '8px 16px', borderRadius: 10,
                    border: '1px solid var(--b3)', background: 'var(--bg3)',
                    color: 'var(--t3)', fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
                  }}
                >
                  تجاهل والمتابعة
                </button>
              </>
            )}

            {/* جارٍ الانتقال */}
            {(phase === 'done' || phase === 'ready') && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 10,
                background: 'var(--emb)', border: '1px solid var(--embo)',
                fontSize: 12, fontWeight: 700, color: 'var(--em)',
              }}>
                <i className="ti ti-rocket" style={{ fontSize:13 }} />
                جارٍ الانتقال...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
