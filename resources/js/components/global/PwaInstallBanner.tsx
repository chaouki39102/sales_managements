// ════════════════════════════════════════════════════════════════════════════
// components/global/PwaInstallBanner.tsx
//
// لافتة تثبيت التطبيق (PWA install banner) — تظهر عندما يكون المتصفح جاهزاً
// لتثبيت التطبيق (حدث beforeinstallprompt) ولا يزال يعمل داخل تبويب عادي
// (غير standalone). لا نستخدم موافقة المتصفح الافتراضية (auto-accept) بل
// نستمع للحدث ونتحكم في الظهور بأنفسنا:
//
//   - زر «تثبيت» يستدعي prompt() الأصلي ليفتح نافذة التثبيت الرسمية.
//   - زر إغلاق يخفي اللافتة مؤقتاً (7 أيام عبر localStorage).
//   - تختفي تلقائياً بعد appinstalled أو عند التثبيت من قبل.
//   - على iOS Safari لا يوجد beforeinstallprompt → لا تظهر أصلاً.
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';

// قبلinstallprompt خارج مكتبة TS القياسية — نعرّف شكله هنا.
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

const DISMISS_KEY = 'pwa-install-dismissed-at';
const RE_SHOW_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    ((navigator as unknown as { standalone?: boolean }).standalone === true)
  );
}

export function PwaInstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setPrompt(null);

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!prompt) return null;

  // تم إغلاقها يدوياً مؤخراً → لا نعيد عرضها قبل انقضاء المدة.
  try {
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    if (dismissedAt && Date.now() - dismissedAt < RE_SHOW_AFTER_MS) return null;
  } catch { /* تجاهل — التخزين المحلي غير إلزامي */ }

  const handleInstall = async () => {
    setInstalling(true);
    try {
      await prompt.prompt();
      // prompt() يُستهلك مرة واحدة فقط — بعد القرار نتخلص من المرجع مهما كانت النتيجة.
      const choice = await prompt.userChoice;
      if (choice.outcome === 'accepted') setPrompt(null);
    } catch { /* أُلغيت أو غير مدعومة */ }
    setInstalling(false);
  };

  const handleDismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* تجاهل */ }
    setPrompt(null);
  };

  return (
    <div className="pwa-banner" role="region" aria-label="تثبيت تطبيق POSDZ">
      <div className="pwa-banner-ic">
        <img src="/pwa-192x192.png" alt="" width={44} height={44} />
      </div>
      <div className="pwa-banner-tx">
        <b>ثبّت تطبيق POSDZ</b>
        <span>وصول أسرع، شاشة مستقلة، وتنبيهات فورية</span>
      </div>
      <div className="pwa-banner-actions">
        <button className="pwa-banner-btn" type="button" onClick={handleInstall} disabled={installing}>
          {installing ? (
            <i className="ti ti-loader animate-spin" />
          ) : (
            <><i className="ti ti-download" /> تثبيت</>
          )}
        </button>
        <button className="pwa-banner-x" type="button" onClick={handleDismiss} aria-label="إغلاق">
          <i className="ti ti-x" />
        </button>
      </div>
    </div>
  );
}
