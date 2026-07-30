import { InfoPanel } from './DocumentUIPrimitives';
import { fmtDZD } from '../utils/document.utils';
import type { ProductSuggestion } from '../hooks/useProductSuggestions';

interface SmartSuggestionsPanelProps {
  suggestions:  ProductSuggestion[] | undefined;
  isLoading:    boolean;
  onAddProduct: (productId: number, suggestedPrice?: number | null, suggestedTva?: number | null) => void;
  disabled?:    boolean;
}

export function SmartSuggestionsPanel({
  suggestions, isLoading, onAddProduct, disabled,
}: SmartSuggestionsPanelProps) {
  if (isLoading) {
    return (
      <div style={{
        marginTop: 10, padding: '10px 12px', borderRadius: 'var(--r2)',
        background: 'var(--bg3)', border: '1px solid var(--b2)',
        display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--t4)',
      }}>
        <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite', fontSize: 13 }} />
        جاري تحميل الاقتراحات...
      </div>
    );
  }

  if (!suggestions || suggestions.length === 0) return null;

  return (
    // ✅ كان هذا زر + useState محلي بنفس الملف — أصبح الآن InfoPanel المشتركة
    // (نفس المكوّن الذي يستخدمه CustomerInsightPanel) بدل تكرار نفس منطق
    // الطي بكود منفصل. defaultOpen=true للحفاظ على نفس السلوك القديم بالضبط
    // (كانت هذه اللوحة مفتوحة افتراضياً، عكس CustomerInsightPanel المغلقة).
    <InfoPanel
      title="منتجات مقترحة"
      icon="ti-bulb"
      defaultOpen
      badge={
        <span style={{
          padding: '1px 6px', borderRadius: 99, fontSize: 10,
          background: 'var(--em)', color: 'white', fontWeight: 700,
        }}>
          {suggestions.length}
        </span>
      }
    >
      {suggestions.map((p) => (
        <div key={p.id} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 8px', borderRadius: 'var(--r1)',
          transition: 'background .15s',
          cursor: disabled ? 'not-allowed' : 'default',
          opacity: disabled ? 0.6 : 1,
        }}
          onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = 'var(--bg2)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <i className="ti ti-package" style={{ fontSize: 11, color: 'var(--t4)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 12, fontWeight: 600, color: 'var(--t2)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {p.name}
            </div>
            <div style={{ fontSize: 10, color: 'var(--t4)', display: 'flex', gap: 8 }}>
              {p.ref && <span>({p.ref})</span>}
              <span>×{p.order_count} فاتورة</span>
              {p.suggested_price !== null && (
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {fmtDZD(p.suggested_price)} دج
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => {
              if (disabled) return;
              onAddProduct(p.id, p.suggested_price, p.suggested_tva);
            }}
            disabled={disabled}
            style={{
              padding: '4px 10px', borderRadius: 'var(--r1)',
              border: '1px solid var(--em)', background: 'var(--emb)',
              color: 'var(--em)', cursor: disabled ? 'not-allowed' : 'pointer',
              fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
              whiteSpace: 'nowrap', flexShrink: 0,
              transition: 'all .12s',
            }}
            onMouseEnter={(e) => {
              if (!disabled) {
                e.currentTarget.style.background = 'var(--em)';
                e.currentTarget.style.color = 'white';
              }
            }}
            onMouseLeave={(e) => {
              if (!disabled) {
                e.currentTarget.style.background = 'var(--emb)';
                e.currentTarget.style.color = 'var(--em)';
              }
            }}
          >
            <i className="ti ti-plus" style={{ marginLeft: 3, fontSize: 10 }} />
            أضف
          </button>
        </div>
      ))}
    </InfoPanel>
  );
}
