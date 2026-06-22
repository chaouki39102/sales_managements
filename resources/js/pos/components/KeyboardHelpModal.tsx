import React from 'react';

interface KeyboardHelpModalProps {
  onClose: () => void;
}

export default function KeyboardHelpModal({ onClose }: KeyboardHelpModalProps) {
  const groups = [
    {
      title: 'الوظائف الرئيسية',
      items: [
        { key: 'F2', desc: 'تركيز شريط البحث' },
        { key: 'F4', desc: 'فتح مودال الدفع' },
        { key: 'F5', desc: 'تعليق الفاتورة الحالية' },
        { key: 'F7', desc: 'الفواتير المعلقة' },
        { key: 'F9', desc: 'معاينة / طباعة' },
        { key: 'F12', desc: 'مسح السلة' },
      ],
    },
    {
      title: 'أدوات إضافية',
      items: [
        { key: 'F1', desc: 'هذه المساعدة' },
        { key: 'F3', desc: 'لوحة الفلتر' },
        { key: 'F6', desc: 'إضافة منتج يدوي' },
        { key: 'F8', desc: 'إحصاءات الجلسة' },
        { key: 'F11', desc: 'وضع الشاشة الكاملة' },
        { key: 'Ctrl+P', desc: 'طباعة مباشرة' },
      ],
    },
    {
      title: 'التنقل والعرض',
      items: [
        { key: 'Ctrl+F', desc: 'البحث السريع' },
        { key: 'Ctrl+↑', desc: 'عرض الشبكة' },
        { key: 'Ctrl+↓', desc: 'عرض القائمة' },
        { key: 'Ctrl++', desc: 'تكبير الشبكة' },
        { key: 'Ctrl+-', desc: 'تصغير الشبكة' },
        { key: 'Alt+1..9', desc: 'تصنيف سريع' },
      ],
    },
    {
      title: 'السلة والأصناف',
      items: [
        { key: 'NumPad+', desc: 'زيادة كمية آخر صنف' },
        { key: 'NumPad-', desc: 'إنقاص كمية آخر صنف' },
        { key: 'Del', desc: 'حذف الصنف المحدد' },
        { key: 'Enter (بحث)', desc: 'إضافة أول نتيجة' },
        { key: 'Escape', desc: 'إغلاق المودال / مسح البحث' },
        { key: 'Ctrl+Enter', desc: 'تأكيد الدفع (داخل المودال)' },
      ],
    },
    {
      title: 'الماسح الضوئي',
      items: [
        { key: 'Barcode', desc: 'ينشّط تلقائياً بمسح الباركود' },
        { key: 'أي حرف', desc: 'يُجمع في buffer 300ms' },
        { key: 'Enter', desc: 'تأكيد الباركود وإضافة الصنف' },
      ],
    },
  ];

  return (
    <div className="ov on" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="m-hd">
          <div className="m-title"><i className="ti ti-keyboard" style={{ marginLeft: 6 }} /> دليل الاختصارات</div>
          <div className="m-x" onClick={onClose}><i className="ti ti-x" /></div>
        </div>
        <div className="m-body">
          <div className="kb-help-groups">
            {groups.map(g => (
              <div key={g.title} className="kb-group">
                <div className="kb-group-title">{g.title}</div>
                <div className="kb-help-grid">
                  {g.items.map(s => (
                    <div key={s.key} className="kb-help-row">
                      <kbd className="kb-key">{s.key}</kbd>
                      <span className="kb-desc">{s.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="m-foot">
          <button className="btn btn-p" onClick={onClose}>فهمت</button>
        </div>
      </div>
    </div>
  );
}
