// ════════════════════════════════════════════════════════════════════════════
// components/global/GlobalDocumentFAB.tsx
//
// زر عائم ثابت (أسفل يسار الشاشة) + اختصار لوحة مفاتيح Ctrl+Alt+N لفتح إنشاء
// مستند تجاري جديد من أي صفحة بالمشروع. يُركَّب مرة واحدة فقط داخل
// <DocumentQuickCreateProvider> (انظر documentQuickCreateStore.tsx).
//
// سلوك النقر/الاختصار:
//   - أول استخدام: لا يوجد "آخر نوع مُستخدم" بعد → يفتح قائمة صغيرة لاختيار
//     النوع.
//   - الاستخدام المعتاد: نقرة واحدة (أو الاختصار) تفتح مباشرة آخر نوع مستند
//     استُخدم — صفر خطوات إضافية للعمل المتكرر طوال اليوم.
//   - زر صغير ملتصق (▲) يفتح القائمة دائماً لتغيير النوع، بلا المرور عبر
//     "آخر نوع مُستخدم".
// ════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { apiGet } from '@/lib/api/core/client';
import { useActiveSlug } from '@/lib/store/appStore';
import type { DocumentType } from '@/lib/api/core/types';
import { useDocumentQuickCreate } from '@/lib/store/documentQuickCreateStore';

const LAST_TYPE_STORAGE_KEY = 'doc_quickcreate_last_type_code';

function loadLastTypeCode(slug: string | null | undefined): string | null {
  try { return localStorage.getItem(`${LAST_TYPE_STORAGE_KEY}_${slug ?? 'default'}`); }
  catch { return null; }
}
function saveLastTypeCode(slug: string | null | undefined, code: string) {
  try { localStorage.setItem(`${LAST_TYPE_STORAGE_KEY}_${slug ?? 'default'}`, code); }
  catch { /* تجاهل — التخزين المحلي غير إلزامي لعمل الزر */ }
}

function isTypingContext(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' ||
    el.isContentEditable
  );
}

export function GlobalDocumentFAB() {
  const slug = useActiveSlug();
  const { state, openQuickCreate } = useDocumentQuickCreate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [minimized, setMinimized] = useState(() => {
    try { return localStorage.getItem('doc_fab_minimized') === 'true'; }
    catch { return false; }
  });
  const wrapperRef = useRef<HTMLDivElement>(null);

  const lastTypeCode = useMemo(() => loadLastTypeCode(slug), [slug]);

  const { data: documentTypes = [] } = useQuery<DocumentType[]>({
    queryKey: [slug, 'document-types-all'],
    queryFn: () =>
      apiGet<{ data?: DocumentType[] }>('/document-types', { per_page: 500 }).then((res) => {
        const list = Array.isArray(res) ? (res as DocumentType[]) : ((res as Record<string, unknown>).data as DocumentType[]) ?? [];
        return list;
      }),
    enabled: !!slug && (menuOpen || !lastTypeCode),
    staleTime: 10 * 60_000,
  });
  const lastType = useMemo(
    () => documentTypes.find((t) => t.code === lastTypeCode) ?? null,
    [documentTypes, lastTypeCode],
  );

  const chooseType = useCallback((type: DocumentType) => {
    saveLastTypeCode(slug, type.code);
    setMenuOpen(false);
    openQuickCreate(type);
  }, [slug, openQuickCreate]);

  const triggerQuickAction = useCallback(() => {
    if (state.open) return;
    if (lastType) {
      openQuickCreate(lastType);
    } else {
      setMenuOpen(true);
    }
  }, [state.open, lastType, openQuickCreate]);

  const toggleMinimized = useCallback(() => {
    setMinimized(prev => {
      const next = !prev;
      try { localStorage.setItem('doc_fab_minimized', String(next)); } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isShortcut = e.ctrlKey && e.altKey && !e.shiftKey && e.key.toLowerCase() === 'n';
      if (!isShortcut) return;
      if (isTypingContext(e.target)) return;
      e.preventDefault();
      triggerQuickAction();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerQuickAction]);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const isDocEditor = /^\/documents\/[^/]+\/(new|[^/]+\/edit)$/.test(location.pathname);
  const isPortal = location.pathname.startsWith('/portal');
  // الزر خاص بتطبيق الشركة (لوحات التحكم) فقط — لا يظهر في صفحات الدخول
  // والتسجيل وحالة الاتصال والإعداد الأولي ومنطقة الأدمن.
  const isNonTenant =
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname === '/status' ||
    location.pathname === '/' ||
    location.pathname === '/onboarding' ||
    location.pathname.startsWith('/admin');
  if (isDocEditor || isPortal || isNonTenant) return null;

  return (
    <div
      ref={wrapperRef}
      className="doc-fab-root"
      style={{
        position: 'fixed', left: 24, zIndex: 900,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8,
        pointerEvents: 'none',
      }}
    >
      {menuOpen && !minimized && (
        <div
          style={{
            position: 'absolute', bottom: 60, left: 0,
            minWidth: 220, maxHeight: 320, overflowY: 'auto',
            background: 'var(--bg1)', border: '1px solid var(--b2)',
            borderRadius: 'var(--r2)', boxShadow: '0 10px 30px rgba(0,0,0,.25)',
            padding: 6, direction: 'rtl', pointerEvents: 'auto',
          }}
        >
          <div style={{
            fontSize: 10.5, fontWeight: 700, color: 'var(--t4)',
            padding: '4px 8px 6px', textTransform: 'uppercase', letterSpacing: 0.4,
          }}>
            إنشاء مستند جديد
          </div>
          {documentTypes.length === 0 ? (
            <div style={{ padding: '10px 8px', fontSize: 12, color: 'var(--t4)' }}>
              جاري تحميل الأنواع...
            </div>
          ) : (
            documentTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => chooseType(type)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', textAlign: 'right', padding: '8px 10px',
                  border: 'none', background: 'transparent', cursor: 'pointer',
                  borderRadius: 'var(--r1)', fontSize: 13, color: 'var(--t1)',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg3)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <i className="ti ti-file-plus" style={{ color: 'var(--em)', fontSize: 14 }} />
                {type.name}
                {type.code === lastTypeCode && (
                  <span style={{
                    marginRight: 'auto', fontSize: 9.5, fontWeight: 700,
                    color: 'var(--t4)', background: 'var(--bg3)',
                    padding: '1px 6px', borderRadius: 99,
                  }}>
                    الأخير
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}

      {minimized ? (
        <button
          onClick={toggleMinimized}
          title="إظهار زر الإنشاء السريع"
          style={{
            width: 36, height: 36, borderRadius: '50%',
            border: '1px solid var(--b2)', cursor: 'pointer',
            background: 'var(--bg1)', color: 'var(--t3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,.15)', fontSize: 14, opacity: 0.5,
            pointerEvents: 'auto',
          }}
        >
          <i className="ti ti-plus" />
        </button>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, pointerEvents: 'auto' }}>
            <button
              onClick={triggerQuickAction}
              title={lastType ? `مستند جديد: ${lastType.name} (Ctrl+Alt+N)` : 'مستند جديد (Ctrl+Alt+N)'}
              style={{
                width: 52, height: 52, borderRadius: '50%',
                border: 'none', cursor: 'pointer',
                background: 'var(--em)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 6px 18px color-mix(in srgb, var(--em) 40%, transparent)',
                fontSize: 22, transition: 'transform .12s',
              }}
              onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.94)'; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <i className="ti ti-plus" />
            </button>

            <button
              onClick={() => setMenuOpen((v) => !v)}
              title="اختيار نوع المستند"
              style={{
                width: 28, height: 28, borderRadius: '50%',
                border: '1px solid var(--b2)', cursor: 'pointer',
                background: 'var(--bg1)', color: 'var(--t3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,.15)', fontSize: 12,
              }}
            >
              <i className={`ti ti-chevron-${menuOpen ? 'down' : 'up'}`} />
            </button>
          </div>

          <button
            onClick={toggleMinimized}
            title="طي الزر"
            style={{
              width: 20, height: 20, borderRadius: '50%',
              border: 'none', cursor: 'pointer',
              background: 'var(--bg3)', color: 'var(--t4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, opacity: 0.5, marginTop: 2, pointerEvents: 'auto',
            }}
          >
            <i className="ti ti-chevron-down" />
          </button>
        </>
      )}
    </div>
  );
}
