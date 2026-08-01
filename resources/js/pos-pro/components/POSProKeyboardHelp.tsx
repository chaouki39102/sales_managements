// ════════════════════════════════════════════════════════════════════════════
// pos-pro/components/POSProKeyboardHelp.tsx
//
// مساعدة لوحة المفاتيح لصفحة POS PRO — قائمة ثابتة بالاختصارات الحالية.
// (بخلاف مودال POS الكلاسيكي الذي يسمح بإعادة تعيين الاختصارات، اختصارات
// POS PRO محدودة ومكتوبة مباشرة في الصفحة فلا حاجة لواجهة تخصيص.)
// ════════════════════════════════════════════════════════════════════════════
import Modal from '@/components/ui/Modal';

interface Props {
  onClose: () => void;
}

interface ShortcutGroup {
  title: string;
  icon:  string;
  items: Array<{ keys: string[]; desc: string }>;
}

const GROUPS: ShortcutGroup[] = [
  {
    title: 'الوظائف الرئيسية',
    icon: 'ti-zap',
    items: [
      { keys: ['F2'], desc: 'فتح منتقي المنتجات' },
      { keys: ['Enter'], desc: 'إضافة أول نتيجة مطابقة في شريط البحث' },
      { keys: ['F1'], desc: 'هذه المساعدة' },
    ],
  },
  {
    title: 'شريط البحث / المسح',
    icon: 'ti-scan',
    items: [
      { keys: ['أسهم ↑ ↓'], desc: 'التنقل بين نتائج القائمة المنسدلة' },
      { keys: ['Enter'], desc: 'إضافة الصنف المحدد (أو التطابق التام للباركود فوراً)' },
      { keys: ['Esc'], desc: 'إغلاق القائمة المنسدلة' },
    ],
  },
  {
    title: 'إدارة السلة',
    icon: 'ti-shopping-cart',
    items: [
      { keys: ['تعليق'], desc: 'زر الشريط الجانبي: تعليق الفاتورة الحالية' },
      { keys: ['المعلقة'], desc: 'زر الشريط الجانبي: استرجاع / حذف الفواتير المعلقة' },
      { keys: ['مرتجع'], desc: 'زر الشريط الجانبي: إنشاء مرتجع من فاتورة' },
    ],
  },
];

export default function POSProKeyboardHelp({ onClose }: Props) {
  return (
    <Modal
      open
      onClose={onClose}
      title={<><i className="ti ti-keyboard" style={{ marginInlineEnd: 6 }} /> مساعدة لوحة المفاتيح</>}
      size="md"
      footer={<button type="button" className="btn" onClick={onClose}>إغلاق</button>}
    >
      <div className="pp-kb-help">
        {GROUPS.map(g => (
          <div key={g.title} className="pp-kb-group">
            <div className="pp-kb-group-title"><i className={`ti ${g.icon}`} /> {g.title}</div>
            <div className="pp-kb-grid">
              {g.items.map((item, i) => (
                <div key={i} className="pp-kb-row">
                  <div className="pp-kb-keys">
                    {item.keys.map(k => <kbd key={k}>{k}</kbd>)}
                  </div>
                  <span className="pp-kb-desc">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
