import React, { useState, useCallback, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import type { LineItem, Product } from '../types/document.types';

interface ParsedRow {
  product_ref?: string;
  product_name?: string;
  quantity: number;
  unit_price_ht?: number;
  packaging_label?: string;
  line_note?: string;
  _match?: Product | null;
  _errors?: string;
}

interface BulkImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (lines: Array<Partial<LineItem>>) => void;
  products?: Product[];
}

const COLUMN_MAP: Record<string, keyof ParsedRow> = {
  'المنتج': 'product_name',
  'المرجع': 'product_ref',
  'الكمية': 'quantity',
  'السعر': 'unit_price_ht',
  'التعبئة': 'packaging_label',
  'ملاحظة': 'line_note',
};

export function BulkImportModal({ open, onClose, onImport, products }: BulkImportModalProps) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const productsIndex = useMemo(() => {
    const idx = new Map<string, Product>();
    if (!products) return idx;
    for (const p of products) {
      if (p.ref) idx.set(p.ref.toLowerCase(), p);
      if (p.barcode) idx.set(p.barcode.toLowerCase(), p);
    }
    return idx;
  }, [products]);

  const matchProduct = useCallback((row: ParsedRow): Product | null => {
    if (row.product_ref) {
      const byRef = productsIndex.get(row.product_ref.toLowerCase());
      if (byRef) return byRef;
    }
    if (row.product_name && products) {
      const name = row.product_name.toLowerCase().trim();
      const byName = products.find(p => p.name.toLowerCase().trim() === name);
      if (byName) return byName;
      const byPartial = products.find(p =>
        p.name.toLowerCase().trim().includes(name) || name.includes(p.name.toLowerCase().trim()),
      );
      if (byPartial) return byPartial;
    }
    return null;
  }, [products, productsIndex]);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

      const parsed: ParsedRow[] = json.map((row, i) => {
        const out: ParsedRow = { quantity: 0 };
        for (const [header, value] of Object.entries(row)) {
          const key = COLUMN_MAP[header.trim()] ?? guessColumn(header.trim());
          if (key === 'quantity') out.quantity = parseFloat(String(value)) || 0;
          else if (key === 'unit_price_ht') out.unit_price_ht = parseFloat(String(value)) || 0;
          else if (key) (out as any)[key] = String(value).trim();
        }
        if (!out.quantity) out._errors = 'الكمية مطلوبة';
        return out;
      });

      const matched = parsed.filter(r => r.quantity > 0 || r.product_ref || r.product_name);
      setRows(matched.map(r => ({ ...r, _match: matchProduct(r) })));
    };
    reader.readAsArrayBuffer(file);
  }, [products, productsIndex, matchProduct]);

  const matchedCount = rows.filter(r => r._match).length;
  const unmatchedCount = rows.length - matchedCount;
  const allMatched = rows.length > 0 && unmatchedCount === 0;

  const handleConfirm = useCallback(() => {
    const lines: Array<Partial<LineItem>> = rows.map(r => {
      const match = r._match;
      return {
        product_id: match ? String(match.id) : '',
        description: r.product_name ?? match?.name ?? r.product_ref ?? '',
        quantity: r.quantity,
        unit_price_ht: r.unit_price_ht ?? (match?.default_selling_price_ht ? Number(match.default_selling_price_ht) : 0),
        price_per_pack: r.unit_price_ht ?? (match?.default_selling_price_ht ? Number(match.default_selling_price_ht) : 0),
        discount_mode: 'percent' as const,
        discount_percentage: 0,
        discount_amount_fixed: 0,
        tva_rate: match?.tva?.rate ?? 0,
        packaging_id: '',
        stock_lot_id: '',
        _packQty: 1,
        line_note: r.line_note,
      };
    });
    onImport(lines);
    setRows([]);
    setFileName('');
    onClose();
  }, [rows, onImport, onClose]);

  const handleClose = useCallback(() => {
    setRows([]);
    setFileName('');
    onClose();
  }, [onClose]);

  return (
    <Modal isOpen={open} onClose={handleClose} title="استيراد من Excel" style={{ maxWidth: 700 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 13, color: 'var(--t3)' }}>
          ارفع ملف Excel يحتوي على أعمدة: المنتج / المرجع، الكمية، السعر (اختياري)
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFile}
            style={{ display: 'none' }}
          />
          <Button size="sm" variant="outline" icon={<i className="ti ti-upload" />}
            onClick={() => fileRef.current?.click()}>
            اختيار ملف
          </Button>
          {fileName && <span style={{ fontSize: 12, color: 'var(--em)' }}>{fileName}</span>}
        </div>

        {rows.length > 0 && (
          <>
            <div style={{ fontSize: 12, color: 'var(--t4)', display: 'flex', gap: 10, alignItems: 'center' }}>
              <span>تم التعرف على {rows.length} سطر</span>
              {unmatchedCount > 0 && (
                <span style={{ color: 'var(--orange)' }}>
                  ({matchedCount} مطابق، {unmatchedCount} غير مطابق)
                </span>
              )}
              {allMatched && (
                <span style={{ color: 'var(--green)' }}>✓ الكل مطابق</span>
              )}
            </div>
            <div className="tw" style={{ maxHeight: 300, overflow: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>المنتج</th>
                    <th>الكمية</th>
                    <th>السعر</th>
                    <th>الحالة</th>
                    <th>ملاحظة</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} style={r._errors ? { background: 'var(--redb)' } : !r._match ? { background: 'var(--orangeb, #fff3e0)' } : undefined}>
                      <td>{i + 1}</td>
                      <td>{r.product_name ?? r.product_ref ?? '—'}</td>
                      <td>{r.quantity}</td>
                      <td>{r.unit_price_ht?.toLocaleString('fr-DZ') ?? '—'}</td>
                      <td>
                        {r._match
                          ? <span style={{ color: 'var(--green)', fontSize: 11 }}>✓ {r._match.name}</span>
                          : <span style={{ color: 'var(--orange)', fontSize: 11 }}>⚠ بدون مطابقة</span>
                        }
                      </td>
                      <td style={{ color: 'var(--t4)', fontSize: 12 }}>{r.line_note ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {unmatchedCount > 0 && (
              <div style={{ fontSize: 12, color: 'var(--orange)', padding: '6px 10px', background: 'var(--orangeb, #fff3e0)', borderRadius: 'var(--r1)' }}>
                {unmatchedCount} منتج غير متطابق — سيتم إضافتها كوصف فقط بدون product_id. قد يرفضها الباكاند إذا كان product_id إلزامياً.
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button size="sm" variant="outline" onClick={handleClose}>إلغاء</Button>
              <Button size="sm" variant="primary" onClick={handleConfirm}>
                إضافة {rows.length} سطر
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function guessColumn(header: string): keyof ParsedRow | null {
  const h = header.toLowerCase().trim();
  if (/منتج|produit|product|item|article|سلعة|صنف/i.test(h)) return 'product_name';
  if (/مرجع|ref|code|sku|كود/i.test(h)) return 'product_ref';
  if (/كمية|qty|quantity|quantite|عدد/i.test(h)) return 'quantity';
  if (/سعر|prix|price|unit|ثمن/i.test(h)) return 'unit_price_ht';
  if (/تعبئة|pack|emballage/i.test(h)) return 'packaging_label';
  if (/ملاحظة|note|observ|remarq/i.test(h)) return 'line_note';
  return null;
}
