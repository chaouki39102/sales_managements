import React from 'react';
import { Section, AlertBanner, ColumnManager } from '../components/DocumentUIPrimitives';
import { BarcodeInput } from '../components/BarcodeInput';
import { LineCard } from '../components/LineCard';
import { DocumentLineRow } from '../components/DocumentLineRow';
import { SmartSuggestionsPanel } from '../components/SmartSuggestionsPanel';
import type { LineItem, ColKey } from '../types/document.types';
import { ALL_COLUMNS } from '../types/document.types';
import type { ComputeLineWarning } from '../hooks/useComputeLine';
import { validateLineStock } from '../utils/document.utils';

interface DocumentLinesSectionProps {
  lines: LineItem[];
  isLinesReadOnly: boolean;
  isReadOnly: boolean;
  isPurchase: boolean;
  isPartyExempt: boolean;
  products: Array<{ id: number; name: string; ref?: string | null; barcode?: string | null }>;
  isLoadingProducts: boolean;
  visibleCols: Set<ColKey>;
  handleColsChange: (cols: Set<ColKey>) => void;
  lineMode: 'table' | 'card';
  setLineMode: React.Dispatch<React.SetStateAction<'table' | 'card'>>;
  lineWarnings: Map<number, ComputeLineWarning[]>;
  stockData: Record<number, number>;
  addLine: () => void;
  addLineWithProduct: (productId: string, unitPrice?: number, tvaRate?: number) => void;
  removeLine: (idx: number) => void;
  duplicateLine: (idx: number) => void;
  updateLine: (idx: number, patch: Partial<LineItem>, product?: unknown) => void;
  lineErr: string;
  savedDraft: Record<string, unknown> | null;
  draftKey: string;
  restoreDraft: () => Record<string, unknown> | null;
  set: (field: string, value: unknown) => void;
  needsParty: boolean;
  productSuggestions: unknown;
  isLoadingSuggestions: boolean;
  setShowBulkImport: React.Dispatch<React.SetStateAction<boolean>>;
  slug: string | undefined;
  affectsStock: boolean;
  stockDir: 1 | -1 | 0;
  warehouses: Array<{ id: number; name: string }>;
}

export default function DocumentLinesSection({
  lines, isLinesReadOnly, isReadOnly, isPurchase, isPartyExempt,
  products, isLoadingProducts,
  visibleCols, handleColsChange,
  lineMode, setLineMode,
  lineWarnings, stockData,
  addLine, addLineWithProduct, removeLine, duplicateLine, updateLine,
  lineErr, savedDraft, draftKey, restoreDraft, set,
  needsParty, productSuggestions, isLoadingSuggestions,
  setShowBulkImport, slug,
  affectsStock, stockDir,
  warehouses,
}: DocumentLinesSectionProps) {
  return (
    <Section
      title="أسطر المستند"
      icon="ti-list-details"
      fillHeight
      badge={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {lines.length > 0 && (
            <span style={{
              padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700,
              background: 'var(--emb)', color: 'var(--em)',
            }}>
              {lines.length} سطر
            </span>
          )}
          {isLinesReadOnly && (
            <span style={{
              padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700,
              background: 'var(--bg3)', color: 'var(--t4)',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <i className="ti ti-lock" style={{ fontSize: 10 }} />
              محمية
            </span>
          )}
          {!isLinesReadOnly && (
            <ColumnManager visible={visibleCols} onChange={handleColsChange} />
          )}
        </div>
      }
    >
      {affectsStock && (
        <AlertBanner
          type={stockDir > 0 ? 'info' : 'warning'}
          message={stockDir > 0
            ? 'هذا المستند سيضيف الكميات إلى المخزون عند الحفظ'
            : 'هذا المستند سيخصم الكميات من المخزون عند الحفظ'}
        />
      )}

      {lineErr && <AlertBanner type="error" message={lineErr} />}

      {!isLinesReadOnly && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <BarcodeInput
            products={products}
            onProductFound={(productId) => {
              addLineWithProduct(String(productId));
            }}
            disabled={isLinesReadOnly}
          />
          <button
            onClick={() => setLineMode((m) => {
              const next = m === 'table' ? 'card' : 'table';
              try { localStorage.setItem(`doc_line_mode_${slug ?? 'default'}`, next); } catch {}
              return next;
            })}
            style={{
              padding: '5px 10px', borderRadius: 'var(--r1)',
              border: '1px solid var(--b3)', background: 'transparent',
              color: 'var(--t3)', cursor: 'pointer', fontSize: 11,
              display: 'flex', alignItems: 'center', gap: 4,
              fontFamily: 'inherit',
            }}
          >
            <i className={`ti ti-${lineMode === 'table' ? 'layout-cards' : 'table'}`} />
            {lineMode === 'table' ? 'عرض البطاقات' : 'عرض الجدول'}
          </button>
        </div>
      )}

      {isLoadingProducts ? (
        <div style={{
          textAlign: 'center', padding: 24, color: 'var(--t4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
          جاري تحميل المنتجات...
        </div>
      ) : (
        <>
          {lines.length === 0 ? (
            <div>
              {savedDraft && (
                <div style={{
                  padding: '10px 14px', marginBottom: 8, borderRadius: 'var(--r2)',
                  background: 'color-mix(in srgb, var(--blue) 8%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--blue) 20%, transparent)',
                  display: 'flex', alignItems: 'center', gap: 10, fontSize: 12,
                }}>
                  <i className="ti ti-history" style={{ color: 'var(--blue)', fontSize: 16 }} />
                  <span style={{ flex: 1, color: 'var(--t2)' }}>
                    لديك مسودة محفوظة من قبل — هل تريد استعادتها؟
                  </span>
                  <button
                    onClick={() => {
                      const draft = restoreDraft();
                      if (draft) {
                        Object.keys(draft).forEach((k) => {
                          if (k !== '_savedAt' && typeof set === 'function') {
                            (set as (field: string, value: unknown) => void)(k, draft[k]);
                          }
                        });
                        try { localStorage.removeItem(draftKey); } catch {}
                      }
                    }}
                    style={{
                      padding: '5px 12px', borderRadius: 'var(--r1)',
                      border: '1px solid var(--blue)', background: 'var(--emb)',
                      color: 'var(--blue)', cursor: 'pointer', fontSize: 11,
                      fontWeight: 700, fontFamily: 'inherit',
                    }}
                  >
                    استعادة
                  </button>
                  <button
                    onClick={() => { try { localStorage.removeItem(draftKey); } catch {} }}
                    style={{
                      padding: '5px 10px', borderRadius: 'var(--r1)',
                      border: '1px solid var(--b3)', background: 'transparent',
                      color: 'var(--t3)', cursor: 'pointer', fontSize: 11,
                      fontFamily: 'inherit',
                    }}
                  >
                    تجاهل
                  </button>
                </div>
              )}
              <div style={{
                padding: 16, textAlign: 'center', color: 'var(--t4)',
                fontSize: 12, background: 'var(--bg3)', borderRadius: 'var(--r2)',
              }}>
                {isLinesReadOnly ? 'لا أسطر — المستند فارغ' : 'لا أسطر بعد — اضغط "إضافة سطر" أدناه'}
              </div>
            </div>
          ) : lineMode === 'card' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {lines.map((line, idx) => {
                const stockResult = line._product
                  ? validateLineStock(line, line._product, isPurchase, stockData)
                  : { ok: true as const };
                return (
                  <LineCard
                    key={idx}
                    line={line}
                    idx={idx}
                    products={products}
                    isPurchase={isPurchase}
                    disabled={isLinesReadOnly}
                    stockData={stockData}
                    stockValidation={stockResult}
                    isTvaExempt={!isPurchase && isPartyExempt}
                    lineWarnings={lineWarnings.get(idx)}
                    warehouses={warehouses}
                    onUpdate={updateLine}
                    onRemove={removeLine}
                    onDuplicate={duplicateLine}
                  />
                );
              })}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--bg3)', borderBottom: '2px solid var(--b2)' }}>
                  {ALL_COLUMNS.filter((c) => visibleCols.has(c.key)).map((col) => (
                    <th key={col.key} style={{
                      padding: '6px 8px', textAlign: 'right', fontWeight: 700,
                      color: 'var(--t3)', fontSize: 11, whiteSpace: 'nowrap',
                      minWidth: col.w,
                    }}>
                      {col.label}
                    </th>
                  ))}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => {
                    const stockResult = line._product
                      ? validateLineStock(line, line._product, isPurchase, stockData)
                      : { ok: true as const };
                    const lineIdxWarnings = lineWarnings.get(idx);
                    return (
                      <DocumentLineRow
                        key={idx}
                        line={line}
                        idx={idx}
                        visibleCols={visibleCols}
                        isPurchase={isPurchase}
                        disabled={isLinesReadOnly}
                        products={products}
                        stockData={stockData}
                        stockValidation={stockResult}
                        onUpdate={updateLine}
                        onRemove={removeLine}
                        onDuplicate={duplicateLine}
                        isTvaExempt={!isPurchase && isPartyExempt}
                        lineWarnings={lineIdxWarnings}
                        warehouses={warehouses}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!isLinesReadOnly && needsParty && (
            <SmartSuggestionsPanel
              suggestions={productSuggestions}
              isLoading={isLoadingSuggestions}
              onAddProduct={(productId, suggestedPrice, suggestedTva) => {
                addLineWithProduct(String(productId), suggestedPrice ?? undefined, suggestedTva ?? undefined);
              }}
              disabled={isReadOnly}
            />
          )}

          {!isLinesReadOnly && (
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <button
                onClick={addLine}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 'var(--r2)',
                  border: '1px dashed var(--b3)', background: 'transparent',
                  color: 'var(--t3)', cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--em)'; e.currentTarget.style.color = 'var(--em)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--b3)'; e.currentTarget.style.color = 'var(--t3)'; }}
              >
                <i className="ti ti-plus" />
                إضافة سطر
              </button>
              <button
                onClick={() => setShowBulkImport(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 'var(--r2)',
                  border: '1px dashed var(--b3)', background: 'transparent',
                  color: 'var(--t3)', cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--purple)'; e.currentTarget.style.color = 'var(--purple)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--b3)'; e.currentTarget.style.color = 'var(--t3)'; }}
              >
                <i className="ti ti-upload" />
                استيراد من Excel
              </button>
            </div>
          )}
        </>
      )}
    </Section>
  );
}
