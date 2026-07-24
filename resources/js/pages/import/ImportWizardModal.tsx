import { useState, useMemo, useCallback, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { apiPost } from '@/lib/api/core/client';
import type { EntityConfig, ImportField } from './entityConfig';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

type Step = 'upload' | 'mapping' | 'preview' | 'result';

interface ParsedColumn {
  index: number;
  header: string;
}

interface MappingDef {
  colIndex: number;
  colHeader: string;
  fieldKey: string;
}

interface PendingEntities {
  families?: string[];
  brands?: string[];
  units?: string[];
  price_levels?: string[];
}

interface PreviewResponse {
  validated: Record<string, unknown>[];
  errors: { line: number; errors: string[]; row: Record<string, unknown> }[];
  pending_entities?: PendingEntities;
}

interface ImportResponse {
  imported: number;
  failed: { line: number; error: string }[];
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

interface Props {
  open: boolean;
  onClose: () => void;
  config: EntityConfig;
}

export default function ImportWizardModal({ open, onClose, config }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [columns, setColumns] = useState<ParsedColumn[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [mappings, setMappings] = useState<MappingDef[]>([]);
  const [previewResult, setPreviewResult] = useState<PreviewResponse | null>(null);
  const [importResult, setImportResult] = useState<ImportResponse | null>(null);

  // Reset when modal opens
  const handleClose = useCallback(() => {
    setStep('upload');
    setFileName('');
    setColumns([]);
    setRawRows([]);
    setMappings([]);
    setPreviewResult(null);
    setImportResult(null);
    onClose();
  }, [onClose]);

  // ═══════════════════════════════════════════════════════════════
  // STEP 1 — FILE UPLOAD & PARSE
  // ═══════════════════════════════════════════════════════════════

  const handleFile = useCallback((file: File | null) => {
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

      if (json.length === 0) return;

      const cols: ParsedColumn[] = Object.keys(json[0]).map((h, i) => ({
        index: i,
        header: h,
      }));

      setColumns(cols);
      setRawRows(json);

      // Auto-guess mapping
      const auto: MappingDef[] = cols.map((col) => ({
        colIndex: col.index,
        colHeader: col.header,
        fieldKey: guessField(col.header, config.fields),
      }));
      setMappings(auto);

      setStep('mapping');
    };
    reader.readAsArrayBuffer(file);
  }, [config]);

  // ═══════════════════════════════════════════════════════════════
  // STEP 2 — COLUMN MAPPING
  // ═══════════════════════════════════════════════════════════════

  const updateMapping = useCallback((colIndex: number, fieldKey: string) => {
    setMappings((prev) =>
      prev.map((m) => (m.colIndex === colIndex ? { ...m, fieldKey } : m)),
    );
  }, []);

  const mappedFieldKeys = useMemo(
    () => new Set(mappings.filter((m) => m.fieldKey !== '_skip').map((m) => m.fieldKey)),
    [mappings],
  );

  const missingRequired = useMemo(() => {
    const required = config.fields.filter((f) => f.required);
    return required.filter((f) => !mappedFieldKeys.has(f.key));
  }, [config.fields, mappedFieldKeys]);

  // ═══════════════════════════════════════════════════════════════
  // PREVIEW MUTATION
  // ═══════════════════════════════════════════════════════════════

  const buildRowsPayload = useCallback(() => {
    const map = new Map(mappings.filter((m) => m.fieldKey !== '_skip').map((m) => [m.colIndex, m.fieldKey]));
    return rawRows.map((row) => {
      const mapped: Record<string, unknown> = {};
      map.forEach((fieldKey, colIndex) => {
        const keys = Object.keys(row);
        const val = keys[colIndex] !== undefined ? row[keys[colIndex]] : '';
        mapped[fieldKey] = val;
      });
      return mapped;
    });
  }, [mappings, rawRows]);

  const previewMut = useMutation({
    mutationFn: (rows: Record<string, unknown>[]) =>
      apiPost<PreviewResponse>(config.previewEndpoint, { rows }),
    onSuccess: (res) => {
      setPreviewResult(res);
      setStep('preview');
    },
  });

  const handlePreview = useCallback(() => {
    setPreviewResult(null);
    const payload = buildRowsPayload();
    previewMut.mutate(payload);
  }, [buildRowsPayload, previewMut]);

  // ═══════════════════════════════════════════════════════════════
  // EXECUTE MUTATION
  // ═══════════════════════════════════════════════════════════════

  const executeMut = useMutation({
    mutationFn: (payload: { rows: Record<string, unknown>[]; pending_entities?: PendingEntities }) =>
      apiPost<ImportResponse>(config.executeEndpoint, payload),
    onSuccess: (res) => {
      setImportResult(res);
      setStep('result');
    },
  });

  const handleExecute = useCallback(() => {
    const validRows = previewResult?.validated ?? [];
    if (validRows.length === 0) return;
    executeMut.mutate({
      rows: validRows,
      pending_entities: previewResult?.pending_entities,
    });
  }, [previewResult, executeMut]);

  // ═══════════════════════════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════════════════════════

  const stepTitles: Record<Step, string> = {
    upload:  'رفع ملف Excel',
    mapping: 'مطابقة الأعمدة',
    preview: 'مراجعة البيانات',
    result:  'نتيجة الاستيراد',
  };

  const stepProgress: Record<Step, number> = {
    upload:  1,
    mapping: 2,
    preview: 3,
    result:  4,
  };

  const _totalRows = useMemo(() => {
    if (previewResult) return previewResult.validated.length + previewResult.errors.length;
    return rawRows.length;
  }, [previewResult, rawRows]);

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  const renderUpload = () => (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div
        style={{
          border: '2px dashed var(--b3)', borderRadius: 12, padding: '60px 20px',
          cursor: 'pointer', marginBottom: 16,
          background: 'var(--bg3)',
        }}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--em)'; }}
        onDragLeave={(e) => { e.currentTarget.style.borderColor = 'var(--b3)'; }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.style.borderColor = 'var(--b3)';
          handleFile(e.dataTransfer.files[0]);
        }}
      >
        <i className="ti ti-upload" style={{ fontSize: 48, color: 'var(--t4)' }} />
        <p style={{ marginTop: 12, color: 'var(--t3)' }}>اسحب الملف إلى هنا أو انقر للاختيار</p>
        <p style={{ fontSize: 12, color: 'var(--t4)' }}>.xlsx, .xls فقط</p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />

      {rawRows.length > 0 && (
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>معاينة (أول 5 أسطر):</p>
          <div style={{ overflowX: 'auto', fontSize: 13 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {Object.keys(rawRows[0]).map((h) => (
                    <th key={h} style={{ border: '1px solid var(--b3)', padding: '6px 8px', background: 'var(--bg3)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rawRows.slice(0, 5).map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((val, j) => (
                      <td key={j} style={{ border: '1px solid var(--b3)', padding: '4px 8px' }}>{String(val ?? '')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const renderMapping = () => (
    <div>
      <p style={{ marginBottom: 12, color: 'var(--t3)' }}>
        حدد الحقل المقابل لكل عمود من ملف Excel. الحقول المطلوبة <span style={{ color: 'red' }}>*</span>
      </p>

      {missingRequired.length > 0 && (
        <div style={{ background: 'var(--goldb)', border: '1px solid var(--gold)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13 }}>
          <strong>تنبيه:</strong> الحقول التالية مطلوبة ولم يتم تعيينها: {missingRequired.map((f) => f.label).join('، ')}
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid var(--b3)', padding: '8px', background: 'var(--bg3)', width: 40 }}>#</th>
              <th style={{ border: '1px solid var(--b3)', padding: '8px', background: 'var(--bg3)' }}>العمود في ملف Excel</th>
              <th style={{ border: '1px solid var(--b3)', padding: '8px', background: 'var(--bg3)', width: 60, textAlign: 'center' }}></th>
              <th style={{ border: '1px solid var(--b3)', padding: '8px', background: 'var(--bg3)' }}>الحقل في النظام</th>
              <th style={{ border: '1px solid var(--b3)', padding: '8px', background: 'var(--bg3)', width: 60 }}>مثال</th>
            </tr>
          </thead>
          <tbody>
            {mappings.map((m) => {
              const sample = rawRows[0] ? Object.values(rawRows[0])[m.colIndex] : '';
              return (
                <tr key={m.colIndex}>
                  <td style={{ border: '1px solid var(--b3)', padding: '6px 8px', textAlign: 'center' }}>{m.colIndex + 1}</td>
                  <td style={{ border: '1px solid var(--b3)', padding: '6px 8px', fontWeight: 600 }}>{m.colHeader}</td>
                  <td style={{ border: '1px solid var(--b3)', padding: '6px 8px', textAlign: 'center' }}>←</td>
                  <td style={{ border: '1px solid var(--b3)', padding: '6px 8px' }}>
                    <select
                      value={m.fieldKey}
                      onChange={(e) => updateMapping(m.colIndex, e.target.value)}
                      style={{ width: '100%', padding: '4px 8px', borderRadius: 4, border: '1px solid var(--b3)' }}
                    >
                      <option value="_skip">— تجاهل —</option>
                      {config.fields.map((f) => {
                        const alreadyMapped = f.key !== m.fieldKey && mappedFieldKeys.has(f.key);
                        return (
                          <option key={f.key} value={f.key} disabled={alreadyMapped}>
                            {f.label}{f.required ? ' *' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </td>
                  <td style={{ border: '1px solid var(--b3)', padding: '6px 8px', fontSize: 12, color: 'var(--t3)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {String(sample ?? '')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );

  const renderPreview = () => {
    if (!previewResult) return null;
    const { validated, errors, pending_entities } = previewResult;
    const validCount = validated.length;
    const errorCount = errors.length;

    return (
      <div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <div style={{ flex: 1, background: 'var(--greenb)', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--green)' }}>{validCount}</div>
            <div style={{ fontSize: 13, color: 'var(--green)' }}>سطر صحيح</div>
          </div>
          <div style={{ flex: 1, background: errorCount > 0 ? 'var(--redb)' : 'var(--bg4)', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: errorCount > 0 ? 'var(--red)' : 'var(--t3)' }}>{errorCount}</div>
            <div style={{ fontSize: 13, color: errorCount > 0 ? 'var(--red)' : 'var(--t3)' }}>{errorCount > 0 ? 'خطأ' : 'خطأ'}</div>
          </div>
        </div>

        {errors.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontWeight: 600, marginBottom: 8, color: 'var(--red)' }}>الأخطاء:</p>
            <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--b3)', borderRadius: 8 }}>
              {errors.map((err) => (
                <div key={err.line} style={{ padding: '8px 12px', borderBottom: '1px solid var(--b3)', fontSize: 13 }}>
                  <strong>سطر {err.line}:</strong>
                  <ul style={{ margin: '4px 0 0', paddingRight: 20 }}>
                    {err.errors.map((e, i) => (
                      <li key={i} style={{ color: 'var(--red)' }}>{e}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {pending_entities && (
          <div style={{ marginBottom: 16, background: 'var(--blueb)', border: '1px solid var(--b3)', borderRadius: 8, padding: '12px 16px' }}>
            <p style={{ fontWeight: 600, marginBottom: 8, color: 'var(--blue)' }}>سيتم إنشاء التالي تلقائياً:</p>
            <ul style={{ margin: 0, paddingRight: 20, fontSize: 13, color: 'var(--blue)' }}>
              {pending_entities.families?.map((f) => <li key={f}>الفئة: {f}</li>)}
              {pending_entities.brands?.map((b) => <li key={b}>الماركة: {b}</li>)}
              {pending_entities.units?.map((u) => <li key={u}>الوحدة: {u}</li>)}
              {pending_entities.price_levels?.map((p) => <li key={p}>فئة السعر: {p}</li>)}
            </ul>
          </div>
        )}

        {validCount > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontWeight: 600, marginBottom: 8, color: 'var(--green)' }}>معاينة البيانات الصحيحة (أول 5 أسطر):</p>
            <div style={{ overflowX: 'auto', fontSize: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {Object.keys(validated[0]).map((k) => (
                      <th key={k} style={{ border: '1px solid var(--b3)', padding: '4px 6px', background: 'var(--bg3)', whiteSpace: 'nowrap' }}>
                        {config.fields.find((f) => f.key === k)?.label ?? k}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {validated.slice(0, 5).map((row, i) => (
                    <tr key={i}>
                      {Object.values(row).map((val, j) => (
                        <td key={j} style={{ border: '1px solid var(--b3)', padding: '3px 6px' }}>{String(val ?? '')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    );
  };

  const renderResult = () => {
    if (!importResult) return null;
    const { imported, failed } = importResult;

    return (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <i
          className={`ti ${failed.length === 0 ? 'ti-circle-check' : 'ti-alert-triangle'}`}
          style={{ fontSize: 56, color: failed.length === 0 ? 'var(--green)' : 'var(--gold)' }}
        />
        <p style={{ fontSize: 18, fontWeight: 700, marginTop: 12 }}>
          {config.successMessage(imported)}
        </p>

        {failed.length > 0 && (
          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <p style={{ fontWeight: 600, color: 'var(--gold)' }}>بعض الأسطر لم تُستورد:</p>
            <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--gold)', borderRadius: 8, marginTop: 8 }}>
              {failed.map((f) => (
                <div key={f.line} style={{ padding: '6px 12px', borderBottom: '1px solid var(--gold)', fontSize: 13 }}>
                  <strong>سطر {f.line}:</strong> {f.error}
                </div>
              ))}
            </div>
          </div>
        )}

    </div>
  );
  };

  // ═══════════════════════════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════════════════════════

  const footer = useMemo(() => {
    switch (step) {
      case 'upload':
        return null;
      case 'mapping':
        return (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', width: '100%' }}>
            <Button onClick={() => setStep('upload')}>السابق</Button>
            <Button
              variant="primary"
              onClick={handlePreview}
              loading={previewMut.isPending}
              disabled={missingRequired.length > 0}
            >
              {previewMut.isPending ? 'جارٍ التحقق...' : 'التحقق من البيانات'}
            </Button>
          </div>
        );
      case 'preview': {
        const validCount = previewResult?.validated?.length ?? 0;
        return (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', width: '100%' }}>
            <Button onClick={() => setStep('mapping')}>السابق</Button>
            {validCount > 0 && (
              <Button variant="primary" onClick={handleExecute} loading={executeMut.isPending}>
                {executeMut.isPending ? 'جارٍ الاستيراد...' : `استيراد ${validCount} ${config.label}`}
              </Button>
            )}
          </div>
        );
      }
      case 'result':
        return (
          <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <Button variant="primary" onClick={handleClose}>تم</Button>
          </div>
        );
    }
  }, [step, previewResult, handlePreview, handleExecute, handleClose, previewMut.isPending, executeMut.isPending, missingRequired.length, config.label]);

  return (
    <Modal open={open} onClose={handleClose} title={`استيراد ${config.labelPlural}`} size="lg" footer={footer}>
      {/* Steps indicator */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, padding: '0 4px' }}>
        {(['upload', 'mapping', 'preview', 'result'] as Step[]).map((s, i) => {
          const current = stepProgress[step];
          const idx = i + 1;
          const active = idx <= current;
          return (
            <div key={s} style={{ flex: 1, textAlign: 'center' }}>
              <div
                style={{
                  width: 28, height: 28, borderRadius: '50%', margin: '0 auto 4px',
                  background: active ? 'var(--em)' : 'var(--b3)',
                  color: active ? '#fff' : 'var(--t4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700,
                }}
              >
                {idx}
              </div>
              <div style={{ fontSize: 11, color: active ? 'var(--em)' : 'var(--t4)' }}>{stepTitles[s]}</div>
            </div>
          );
        })}
      </div>

      {/* Body */}
      {step === 'upload' && renderUpload()}
      {step === 'mapping' && renderMapping()}
      {step === 'preview' && renderPreview()}
      {step === 'result' && renderResult()}
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════
// GUESS FIELD
// ═══════════════════════════════════════════════════════════════════

function guessField(header: string, fields: ImportField[]): string {
  const h = header.toLowerCase().trim();

  // Try exact match on key
  const exact = fields.find((f) => f.key.toLowerCase() === h);
  if (exact) return exact.key;

  // Try match on label
  const byLabel = fields.find((f) => f.label.toLowerCase().includes(h));
  if (byLabel) return byLabel.key;

  // Arabic/French/English keyword matching
  const kw: [RegExp, string][] = [
    // Product fields
    [/منتج|produit|product|item|article|سلعة|صنف|اسم|designation|libellé|description/i, 'name'],
    [/مرجع|ref|code|sku|كود|référence|reference/i, 'ref'],
    [/باركود|barcode|code-barres|ean/i, 'barcode'],
    [/فئة|famille|family|category|catégorie|تصنيف/i, 'family'],
    [/ماركة|marque|brand|علامة/i, 'brand'],
    [/tva|ضريبة|tva|tax|ضريبة|taux/i, 'tva'],
    [/وحدة|unité|unit|unite/i, 'unit'],
    [/شراء|achat|purchase|cout|cost|coût|prix d'achat/i, 'purchase_price_ht'],
    [/بيع|vente|sell|prix|price|سعر/i, 'selling_price'],
    [/مخزون|stock|inventory/i, 'manages_stock'],
    [/تنبيه|alert|min|minimum/i, 'min_stock_alert'],
    [/نشط|actif|active|activé/i, 'active'],

    // Party fields
    [/اسم|nom|name|الاسم/i, 'name'],
    [/نوع|type|category/i, 'party_type'],
    [/كود|code|رمز/i, 'code'],
    [/تجاري|commercial|raison.sociale|enseigne/i, 'commercial_name'],
    [/نشاط|activité|activity/i, 'activity'],
    [/هاتف|telephone|téléphone|phone|tel|fixe/i, 'phone'],
    [/جوال|mobile|gsm|portable|mob/i, 'mobile'],
    [/فاكس|fax/i, 'fax'],
    [/عنوان|adresse|address/i, 'address'],
    [/nif|ice|رقم جبائي|جبائي|id fiscal|رقم التعريف/i, 'nif'],
    [/rc|سجل تجاري|registre/i, 'rc'],
    [/nis|إحصائي|statistique/i, 'nis'],
    [/ai|مادة|article/i, 'ai'],
    [/تاريخ.*سجل|rc.*date|date.*rc/i, 'rc_date'],
    [/شكل.*قانوني|forme.*juridique|legal.*form/i, 'legal_form'],
    [/رأس.*مال|capital.*social|capital/i, 'capital_amount'],
    [/ولاية|wilaya/i, 'wilaya'],
    [/بلدية|commune/i, 'commune'],
    [/فئة سعر|price.level|prix|price/i, 'price_level'],
    [/بنك|bank/i, 'bank_name'],
    [/rib|حساب.*بنكي|compte.*bancaire/i, 'rib'],
    [/ائتمان|crédit|credit.*jour|délai/i, 'credit_days'],
    [/حد ائتمان|limite|limit.*credit|plafond/i, 'credit_limit'],
    [/معفى|exempt|tva.*exo|exonéré/i, 'is_tva_exempt'],
    [/خاضع|taxable|soumis/i, 'is_taxable'],
    [/نظام.*ضريبي|régime.*fiscal|tax.*regime|forfaitaire|reel/i, 'tax_regime'],
    [/cnas|casnos/i, 'cnas_number'],
    [/مستهلك.*نهائي|final.*consumer/i, 'is_final_consumer'],
    [/بريد|email|e.mail|courriel/i, 'email'],
  ];

  for (const [regex, key] of kw) {
    if (regex.test(h)) return key;
  }

  return '_skip';
}
