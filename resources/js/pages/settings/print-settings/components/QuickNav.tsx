import React, { useState, useEffect } from 'react';

const NAV_SECTIONS = [
  { id: 's-header', label: 'الشعار'    },
  { id: 's-doc',    label: 'المستند'   },
  { id: 's-items',  label: 'المنتجات'  },
  { id: 's-totals', label: 'الإجمالي'  },
  { id: 's-footer', label: 'التذييل'   },
  { id: 's-format', label: 'التنسيق'   },
  { id: 's-rules',  label: 'القواعد'   },
  { id: 's-report', label: 'التقرير'   },
];

export function QuickNav({ controlsRef }: { controlsRef: React.RefObject<HTMLDivElement> }) {
  const [active, setActive] = useState('s-header');

  useEffect(() => {
    const container = controlsRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { root: container, threshold: 0.3 },
    );

    NAV_SECTIONS.forEach(s => {
      const el = container.querySelector(`#${s.id}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [controlsRef]);

  return (
    <div style={{
      display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 8,
      padding: '6px 8px', background: 'var(--bg3)', borderRadius: 'var(--r2)',
      border: '1px solid var(--b2)',
    }}>
      {NAV_SECTIONS.map(s => (
        <button
          key={s.id} type="button"
          onClick={() => {
            const el = controlsRef.current?.querySelector(`#${s.id}`);
            el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          style={{
            padding: '3px 8px', borderRadius: 5, fontSize: 11,
            fontFamily: 'Tajawal, sans-serif', fontWeight: 700,
            border: `1px solid ${active === s.id ? 'var(--em)' : 'var(--b2)'}`,
            background: active === s.id ? 'var(--emb)' : 'transparent',
            color: active === s.id ? 'var(--em)' : 'var(--t4)',
            cursor: 'pointer', transition: 'all .12s',
          }}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
