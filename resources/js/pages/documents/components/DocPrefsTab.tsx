// ════════════════════════════════════════════════════════════════════════════
// pages/documents/components/DocPrefsTab.tsx
//
// تبويب «الإدخال السريع» داخل نافذة «خيارات إضافية» — مفاتيح تبديل لتفضيلات
// إدخال الأسطر، مخزنة محلياً عبر useDocLinePrefs.
// ════════════════════════════════════════════════════════════════════════════

import { useDocLinePrefs } from '../hooks/useDocLinePrefs';
import { DocLinePrefs } from '../utils/docLinePrefs';

interface RowProps {
  icon: string;
  title: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function PrefRow({ icon, title, desc, checked, onChange }: RowProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '9px 4px', borderBottom: '1px solid var(--b3)',
    }}>
      <span style={{
        width: 32, height: 32, flex: '0 0 32', display: 'flex', alignItems: 'center',
        justifyContent: 'center', borderRadius: 8, background: 'var(--bg2)', color: 'var(--em)',
      }}>
        <i className={icon} style={{ fontSize: 16 }} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--t1)' }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 1 }}>{desc}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          width: 38, height: 22, flex: '0 0 38', borderRadius: 999, border: 'none', cursor: 'pointer',
          position: 'relative', background: checked ? 'var(--em)' : 'var(--b3)',
          transition: 'background 0.15s',
        }}
      >
        <span style={{
          position: 'absolute', top: 3, width: 16, height: 16, borderRadius: 999,
          background: '#fff', transition: 'left 0.15s',
          left: checked ? 19 : 3,
        }} />
      </button>
    </div>
  );
}

export function DocPrefsTab() {
  const { prefs, set } = useDocLinePrefs();

  const rows: Array<{ icon: string; key: keyof DocLinePrefs; title: string; desc: string }> = [
    {
      icon: 'ti-stack-2',
      key: 'fillFullStock',
      title: 'ملء كمية السطر من المخزون',
      desc: 'عند إضافة منتج، تُملأ كمية السطر تلقائياً بإجمالي المخزون المتاح.',
    },
    {
      icon: 'ti-arrow-bar-to-down',
      key: 'skipAmountField',
      title: 'تجاوز حقل المبلغ (Enter)',
      desc: 'عند الضغط Enter على كمية السطر، يُضاف سطر جديد مباشرة دون الانتقال إلى حقل المبلغ.',
    },
    {
      icon: 'ti-eraser',
      key: 'clearProductSearch',
      title: 'مسح نص البحث بعد الاختيار',
      desc: 'بعد اختيار منتج من البحث، يُمسح نص البحث تلقائياً (أعد تفعيله لكي يحتفظ النص).',
    },
    {
      icon: 'ti-click',
      key: 'autoOpenProductOnEmpty',
      title: 'فتح منتقي المنتج تلقائياً',
      desc: 'عند التركيز على سطر فارغ، تُفتح قائمة المنتجات تلقائياً لسرعة الإدخال.',
    },
    {
      icon: 'ti-rotate',
      key: 'resetQtyOnChange',
      title: 'إعادة تعيين الكمية عند تغيير المنتج',
      desc: 'عند تغيير منتج سطر موجود، تُعاد كمية السطر إلى القيمة الافتراضية (وإلى المخزون الكامل إن كان الملء مفعّلاً).',
    },
  ];

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 4px',
        fontSize: 11.5, color: 'var(--t3)', borderBottom: '1px solid var(--b2)',
      }}>
        <i className="ti ti-zap" style={{ color: 'var(--em)' }} />
        تفضيلات أدخل البيانات سريعاً — تُحفظ محلياً على هذا الجهاز
      </div>
      {rows.map((r) => (
        <PrefRow
          key={r.key}
          icon={r.icon}
          title={r.title}
          desc={r.desc}
          checked={prefs[r.key]}
          onChange={(v) => set({ [r.key]: v } as Partial<DocLinePrefs>)}
        />
      ))}
    </div>
  );
}
