// ════════════════════════════════════════════════════════════════════════════
// pages/documents/components/DocEditorPrefsTab.tsx
//
// تبويب «خيارات المحرر» داخل نافذة «خيارات إضافية» — تفضيلات سطح المحرر
// (عرض الأسعار، عدد النسخ، افتراضيات الشحن/الدفع للمستند الجديد) مخزنة
// محلياً لكل شركة عبر useDocPrefs (المفتاح doc_prefs:{slug}).
// ════════════════════════════════════════════════════════════════════════════

import { useDocPrefs } from '../hooks/useDocPrefs';
import type { DocPrefs, DocPriceDisplayMode } from '../utils/docPrefs';
import { inputStyle, labelStyle } from './DocumentUIPrimitives';
import type { ShippingInfo } from '../types/document.types';

interface SectionHeaderProps {
  icon: string;
  title: string;
  desc: string;
}

function SectionHeader({ icon, title, desc }: SectionHeaderProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '10px 4px',
      fontSize: 11.5, color: 'var(--t3)', borderBottom: '1px solid var(--b2)',
    }}>
      <i className={icon} style={{ color: 'var(--em)' }} />
      <span style={{ fontWeight: 700, color: 'var(--t1)' }}>{title}</span>
      <span style={{ fontSize: 10.5, color: 'var(--t4)', marginRight: 'auto' }}>{desc}</span>
    </div>
  );
}

function SegButton({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1, padding: '6px 10px', fontSize: 12, fontWeight: 700,
        borderRadius: 8, border: active ? '1px solid var(--em)' : '1px solid var(--b3)',
        background: active ? 'color-mix(in srgb, var(--em) 12%, var(--bg1))' : 'var(--bg1)',
        color: active ? 'var(--em)' : 'var(--t3)',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

export function DocEditorPrefsTab({ slug }: { slug?: string | null }) {
  const { prefs, set } = useDocPrefs(slug);

  const setShipping = (patch: Partial<ShippingInfo>) =>
    set({ defaultShippingInfo: { ...prefs.defaultShippingInfo, ...patch } });

  return (
    <div>
      <SectionHeader icon="ti-adjustments-horizontal" title="عرض الأسعار" desc="المحفوظة محلياً على هذا الجهاز" />

      {/* عرض الأسعار */}
      <div style={{ padding: '10px 4px' }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--t1)' }}>طريقة عرض الأسعار</div>
        <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 1, marginBottom: 8 }}>
          اختيار HT (سعر خالص الضريبة) أو TTC (شامل الضريبة) في أسطر المستند ومنتقي المنتج.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <SegButton
            active={prefs.priceDisplayMode === 'ht'}
            onClick={() => set({ priceDisplayMode: 'ht' as DocPriceDisplayMode })}
          >
            HT (خالص الضريبة)
          </SegButton>
          <SegButton
            active={prefs.priceDisplayMode === 'ttc'}
            onClick={() => set({ priceDisplayMode: 'ttc' as DocPriceDisplayMode })}
          >
            TTC (شامل الضريبة)
          </SegButton>
        </div>
      </div>

      <SectionHeader icon="ti-printer" title="الطباعة" desc="عدد النسخ عند الطباعة" />

      {/* عدد النسخ */}
      <div style={{ padding: '10px 4px' }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--t1)' }}>عدد نسخ الطباعة</div>
        <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 1, marginBottom: 8 }}>
          عند الطباعة من المحرر، تُمرَّر كأفضل جهد إلى نافذة طباعة المتصفح.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[1, 2, 3].map((n) => (
            <SegButton key={n} active={prefs.printCopies === n} onClick={() => set({ printCopies: n })}>
              {n}
            </SegButton>
          ))}
        </div>
      </div>

      <SectionHeader icon="ti-truck-delivery" title="الشحن الافتراضي للمستند الجديد" desc="تُعبَّأ تلقائياً" />

      {/* افتراضيات الشحن */}
      <div style={{ padding: '10px 4px' }}>
        <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 10 }}>
          القيم أدناه تُملأ في قسم الشحن عند فتح أي مستند جديد (يمكن تغييرها لكل مستند).
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ gridColumn: 'span 2' }}>
            <span style={{ ...labelStyle, fontSize: 10 }}>عنوان التسليم</span>
            <input
              type="text"
              style={inputStyle()}
              value={prefs.defaultShippingInfo.address ?? ''}
              onChange={(e) => setShipping({ address: e.target.value || undefined })}
              placeholder="العنوان الكامل للتسليم"
            />
          </div>
          <div>
            <span style={{ ...labelStyle, fontSize: 10 }}>وسيلة النقل</span>
            <select
              style={{ ...inputStyle(), cursor: 'pointer' }}
              value={prefs.defaultShippingInfo.transport_mode ?? ''}
              onChange={(e) => setShipping({ transport_mode: e.target.value || undefined })}
            >
              <option value="">— اختر —</option>
              <option value="company">سيارة الشركة</option>
              <option value="external">نقل خارجي</option>
              <option value="client">استلام من الزبون</option>
              <option value="courier">توصيل (كوريير)</option>
            </select>
          </div>
          <div>
            <span style={{ ...labelStyle, fontSize: 10 }}>اسم السائق</span>
            <input
              type="text"
              style={inputStyle()}
              value={prefs.defaultShippingInfo.driver_name ?? ''}
              onChange={(e) => setShipping({ driver_name: e.target.value || undefined })}
              placeholder="اسم السائق"
            />
          </div>
          <div>
            <span style={{ ...labelStyle, fontSize: 10 }}>لوحة المركبة</span>
            <input
              type="text"
              style={inputStyle()}
              value={prefs.defaultShippingInfo.vehicle_plate ?? ''}
              onChange={(e) => setShipping({ vehicle_plate: e.target.value || undefined })}
              placeholder="رقم اللوحة"
            />
          </div>
          <div>
            <span style={{ ...labelStyle, fontSize: 10 }}>ملاحظات السائق</span>
            <input
              type="text"
              style={inputStyle()}
              value={prefs.defaultShippingInfo.driver_notes ?? ''}
              onChange={(e) => setShipping({ driver_notes: e.target.value || undefined })}
              placeholder="ملاحظات للتوصيل..."
            />
          </div>
        </div>
      </div>

      <SectionHeader icon="ti-calendar" title="شروط الدفع الافتراضية" desc="للمستند الجديد" />

      {/* افتراضيات شروط الدفع */}
      <div style={{ padding: '10px 4px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <span style={{ ...labelStyle, fontSize: 10 }}>أجل الدفع (أيام)</span>
            <input
              type="number" min={0} step={1}
              style={inputStyle()}
              value={prefs.defaultPaymentTermsDays}
              onChange={(e) =>
                set({ defaultPaymentTermsDays: Math.max(0, parseInt(e.target.value, 10) || 0) })
              }
            />
            <div style={{ fontSize: 10.5, color: 'var(--t4)', marginTop: 3 }}>
              0 = دفع فوري (بدون أجل).
            </div>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <span style={{ ...labelStyle, fontSize: 10 }}>ملاحظة شروط الدفع</span>
            <input
              type="text"
              style={inputStyle()}
              value={prefs.defaultPaymentTermsNotes}
              onChange={(e) => set({ defaultPaymentTermsNotes: e.target.value })}
              placeholder="مثال: الدفع نقداً عند التسليم..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export type { DocPrefs };
