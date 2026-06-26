// resources/js/pages/settings/PrintSettingsPage.tsx
// ════════════════════════════════════════════════════════════════════════════
// إصلاحات جوهرية:
//
//  1. الحفظ في DB عبر settingsApi.update() — ليس localStorage فقط
//  2. قالب منفصل لكل (docTypeCode × paperSize)
//     تغيير selectedDoc → يُحمِّل قالبه من DB تلقائياً
//  3. docConfigs تُحمَّل من DB عند الفتح
//  4. تبديل القالب: copyTpl() ينسخ قالب مستند إلى آخر
//  5. resetTpl() يعيد القالب الافتراضي لهذا المستند فقط
//  6. مؤشر تحميل + toast عند الحفظ
//  7. لا بيانات ثابتة — كل شيء من DB أو activeCompany
// ════════════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
  ReceiptPreview,
  HeaderSectionControls,
  DocumentSectionControls,
  ItemsSectionControls,
  TotalsSectionControls,
  FooterSectionControls,
  FormattingSectionControls,
} from './print-settings';
import type {
  DetectedPrinter, DocumentPrintConfig,
  ReceiptTemplate80mm, PaperSize, CompanyPreviewData,
} from './print-settings/types';
import { defaultTemplate } from './print-settings/types';
import {
  useDocPrintConfigs, usePrintersList,
  usePrintTemplate,
  useSavePrintTemplate, useSaveDocConfigs, useSavePrinters,
  TPL_KEY,
} from '../../pos/hooks/usePrintSettings';
import { useActiveCompany } from '../../lib/store/appStore';

// ─── أنواع المستندات الافتراضية (تُستخدم إذا لم يكن في DB بعد) ─────────────

const DEFAULT_DOC_TYPES: Omit<DocumentPrintConfig, 'printerId'>[] = [
  { docTypeCode: 'FV',  docTypeName: 'فاتورة المبيعات',   enabled: true,  paperSize: '80mm', copies: 1, autoPrint: false, showPreview: true,  templates: ['80mm', 'A4', 'A5'] },
  { docTypeCode: 'BL',  docTypeName: 'وصل التسليم',       enabled: true,  paperSize: '80mm', copies: 1, autoPrint: false, showPreview: false, templates: ['80mm', 'A4'] },
  { docTypeCode: 'FA',  docTypeName: 'فاتورة الشراء',     enabled: false, paperSize: 'A4',   copies: 1, autoPrint: false, showPreview: true,  templates: ['A4', 'A5'] },
  { docTypeCode: 'BR',  docTypeName: 'وصل الاستلام',      enabled: false, paperSize: 'A4',   copies: 1, autoPrint: false, showPreview: false, templates: ['A4'] },
  { docTypeCode: 'AV',  docTypeName: 'مرتجع المبيعات',    enabled: true,  paperSize: '80mm', copies: 1, autoPrint: false, showPreview: true,  templates: ['80mm', 'A4'] },
  { docTypeCode: 'DEV', docTypeName: 'عرض السعر',         enabled: true,  paperSize: 'A4',   copies: 1, autoPrint: false, showPreview: true,  templates: ['A4', 'A5'] },
  { docTypeCode: 'DDP', docTypeName: 'إذن التسليم',       enabled: true,  paperSize: 'A4',   copies: 2, autoPrint: false, showPreview: false, templates: ['A4', 'A5'] },
  { docTypeCode: 'BCC', docTypeName: 'طلب الشراء',        enabled: false, paperSize: 'none', copies: 1, autoPrint: false, showPreview: false, templates: ['A4'] },
  { docTypeCode: 'BCF', docTypeName: 'طلب العميل',        enabled: false, paperSize: 'none', copies: 1, autoPrint: false, showPreview: false, templates: ['A4'] },
  { docTypeCode: 'BT',  docTypeName: 'تحويل المخزون',    enabled: false, paperSize: 'A4',   copies: 1, autoPrint: false, showPreview: false, templates: ['A4'] },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function PrintSettingsPage() {
  const activeCompany = useActiveCompany();

  // ── بيانات الشركة من activeCompany ────────────────────────────────────────
  const companyPreviewData: CompanyPreviewData | null = activeCompany
    ? {
        name:    activeCompany.name    ?? '',
        address: activeCompany.address ?? '',
        phone:   activeCompany.phone   ?? '',
        nif:     activeCompany.nif     ?? '',
        rc:      activeCompany.rc      ?? '',
        nis:     activeCompany.nis     ?? '',
        ice:     '',
        article: (activeCompany as any).ai ?? '',
        logoUrl: (activeCompany as any).avatar ?? null,
      }
    : null;

  // ── UI state ───────────────────────────────────────────────────────────────
  const [activeTab,   setActiveTab]   = useState<'printers' | 'documents' | 'templates'>('printers');
  const [selectedDoc, setSelectedDoc] = useState<string>('FV');
  const [scanning,    setScanning]    = useState(false);

  // ── إعدادات المستندات من DB ────────────────────────────────────────────────
  const { data: dbDocConfigs = [],  isLoading: loadingConfigs } = useDocPrintConfigs();
  const { data: dbPrinters   = [],  isLoading: loadingPrinters } = usePrintersList();

  // دمج القيم من DB مع القيم الافتراضية لضمان كل أنواع المستندات
  const [docConfigs, setDocConfigs] = useState<DocumentPrintConfig[]>(
    DEFAULT_DOC_TYPES.map(d => ({ ...d, printerId: null })),
  );
  const [printers, setPrinters] = useState<DetectedPrinter[]>([]);

  // تحديث عند تحميل DB
  useEffect(() => {
    if (dbDocConfigs.length > 0) {
      setDocConfigs(
        DEFAULT_DOC_TYPES.map(def => {
          const fromDb = dbDocConfigs.find(d => d.docTypeCode === def.docTypeCode);
          return fromDb ? { ...def, ...fromDb } : { ...def, printerId: null };
        }),
      );
    }
  }, [dbDocConfigs]);

  useEffect(() => {
    if (dbPrinters.length > 0) setPrinters(dbPrinters);
  }, [dbPrinters]);

  // ── قالب المستند المحدد حالياً ───────────────────────────────────────────
  const selectedDocConfig = docConfigs.find(d => d.docTypeCode === selectedDoc);
  const selectedSize      = (selectedDocConfig?.paperSize ?? '80mm') as PaperSize;

  // جلب قالب المستند المحدد من DB
  const { data: dbTpl, isLoading: loadingTpl } = usePrintTemplate(
    selectedDoc,
    selectedSize !== 'none' ? selectedSize : '80mm',
  );

  // قالب قابل للتعديل محلياً — يُعاد تهيئته عند تغيير المستند
  const [tpl, setTpl] = useState<ReceiptTemplate80mm>(defaultTemplate());
  const prevDocRef    = useRef<string>('');

  useEffect(() => {
    // عند تغيير المستند المحدد → حمِّل قالبه
    if (selectedDoc !== prevDocRef.current) {
      prevDocRef.current = selectedDoc;
      setTpl(dbTpl ?? defaultTemplate());
    }
  }, [selectedDoc, dbTpl]);

  // حين يصل القالب من DB لأول مرة
  useEffect(() => {
    if (dbTpl && selectedDoc === prevDocRef.current) {
      setTpl(prev => ({ ...defaultTemplate(), ...dbTpl, ...prev }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbTpl]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const saveTplMut      = useSavePrintTemplate();
  const saveConfigsMut  = useSaveDocConfigs();
  const savePrintersMut = useSavePrinters();

  // ── حفظ القالب (حفظ في DB) ───────────────────────────────────────────────
  const handleSaveTemplate = useCallback(async () => {
    try {
      await saveTplMut.mutateAsync({
        docCode:  selectedDoc,
        size:     selectedSize !== 'none' ? selectedSize : '80mm',
        template: tpl,
      });
      toast.success('تم حفظ القالب بنجاح');
    } catch {
      toast.error('فشل حفظ القالب');
    }
  }, [saveTplMut, selectedDoc, selectedSize, tpl]);

  // ── حفظ إعدادات المستندات ─────────────────────────────────────────────────
  const handleSaveDocConfigs = useCallback(async (configs: DocumentPrintConfig[]) => {
    try {
      await saveConfigsMut.mutateAsync(configs);
      toast.success('تم حفظ إعدادات المستندات');
    } catch {
      toast.error('فشل حفظ الإعدادات');
    }
  }, [saveConfigsMut]);

  // ── حفظ الطابعات ──────────────────────────────────────────────────────────
  const handleSavePrinters = useCallback(async (p: DetectedPrinter[]) => {
    setPrinters(p);
    try {
      await savePrintersMut.mutateAsync(p);
    } catch {
      // silent — localStorage cache موجود
    }
  }, [savePrintersMut]);

  // ── تحديث إعداد مستند واحد ────────────────────────────────────────────────
  const updateDoc = useCallback((code: string, patch: Partial<DocumentPrintConfig>) => {
    setDocConfigs(prev => {
      const next = prev.map(d => d.docTypeCode === code ? { ...d, ...patch } : d);
      handleSaveDocConfigs(next);
      return next;
    });
  }, [handleSaveDocConfigs]);

  // ── نسخ قالب مستند لآخر ──────────────────────────────────────────────────
  const handleCopyTemplate = useCallback(async (targetCode: string) => {
    const targetConfig = docConfigs.find(d => d.docTypeCode === targetCode);
    if (!targetConfig) return;
    try {
      await saveTplMut.mutateAsync({
        docCode:  targetCode,
        size:     (targetConfig.paperSize !== 'none' ? targetConfig.paperSize : '80mm') as PaperSize,
        template: tpl,
      });
      toast.success(`تم نسخ القالب إلى ${targetConfig.docTypeName}`);
    } catch {
      toast.error('فشل نسخ القالب');
    }
  }, [tpl, docConfigs, saveTplMut]);

  // ── إعادة ضبط القالب ──────────────────────────────────────────────────────
  const handleResetTemplate = useCallback(() => {
    setTpl(defaultTemplate());
    toast.success('تم استعادة القالب الافتراضي — انقر "حفظ" للتطبيق');
  }, []);

  // ── اكتشاف الطابعات ──────────────────────────────────────────────────────
  const detectPrinters = useCallback(async () => {
    setScanning(true);
    try {
      const detected: DetectedPrinter[] = [];

      if (typeof navigator !== 'undefined' && 'usb' in navigator) {
        try {
          const usbDevices = await (navigator as any).usb.getDevices();
          usbDevices.forEach((dev: any, i: number) => {
            detected.push({
              id:        `usb-${dev.serialNumber ?? i}`,
              name:      dev.productName || dev.manufacturerName || 'طابعة USB',
              isDefault: i === 0,
              status:    'ready',
              source:    'usb',
            });
          });
        } catch { /* WebUSB not permitted yet */ }
      }

      if (detected.length === 0 && printers.length > 0) {
        // إعادة استخدام المحفوظة
        toast.success('تم إعادة تحميل الطابعات المحفوظة');
        return;
      }

      await new Promise(r => setTimeout(r, 600));

      if (detected.length === 0) {
        detected.push(
          { id: 'thermal-demo', name: 'طابعة حرارية 80mm (تجريبي)', isDefault: true,  status: 'ready',   source: 'demo' },
          { id: 'pdf-demo',     name: 'Microsoft Print to PDF',      isDefault: false, status: 'ready',   source: 'demo' },
        );
      }

      await handleSavePrinters(detected);
      toast.success(`تم اكتشاف ${detected.length} طابعة`);
    } finally {
      setScanning(false);
    }
  }, [printers, handleSavePrinters]);

  const handlePairUsb = useCallback(async () => {
    if (!('usb' in navigator)) {
      toast.error('WebUSB غير مدعوم — استخدم Chrome أو Edge');
      return;
    }
    try {
      const device = await (navigator as any).usb.requestDevice({ filters: [] });
      const newPrinter: DetectedPrinter = {
        id:        `usb-${device.serialNumber ?? Date.now()}`,
        name:      device.productName || device.manufacturerName || 'طابعة حرارية USB',
        isDefault: printers.length === 0,
        status:    'ready',
        source:    'usb',
      };
      await handleSavePrinters([...printers, newPrinter]);
      toast.success(`تم ربط "${newPrinter.name}"`);
    } catch (err: any) {
      if (err?.name !== 'NotFoundError') toast.error('تعذر الاتصال: ' + err?.message);
    }
  }, [printers, handleSavePrinters]);

  const handleThermalTest = useCallback(async () => {
    if (!('usb' in navigator)) {
      toast.error('WebUSB غير مدعوم — استخدم Chrome أو Edge');
      return;
    }
    try {
      const devices = await (navigator as any).usb.getDevices();
      const device  = devices[0] ?? await (navigator as any).usb.requestDevice({ filters: [] });
      if (!device) return;

      await device.open();
      if (device.configuration === null) await device.selectConfiguration(1);

      let ifNum = -1, epNum = -1;
      for (const iface of device.configuration?.interfaces ?? []) {
        const alt = iface.alternates?.[0];
        if (!alt || alt.interfaceClass === 2) continue;
        const ep = alt.endpoints?.find((e: any) => e.direction === 'out');
        if (ep) { ifNum = iface.interfaceNumber; epNum = ep.endpointNumber; break; }
      }

      if (ifNum === -1) { await device.close(); toast.error('لم يُعثَر على منفذ كتابة'); return; }

      await device.claimInterface(ifNum);

      const ESC = 0x1B, GS = 0x1D, LF = 0x0A;
      const enc = (s: string) => [...s].map(c => { const cp = c.codePointAt(0) ?? 63; return cp < 128 ? cp : 63; });
      const buf = [
        ESC, 0x40,                      // init
        ESC, 0x74, 0x10,               // code page Arabic
        ESC, 0x61, 1,                  // center
        ESC, 0x45, 1,                  // bold on
        ...enc(companyPreviewData?.name ?? 'طباعة اختبارية'),
        LF,
        ESC, 0x45, 0,                  // bold off
        ...enc('-------------------'), LF,
        ...enc('طباعة حرارية ✓'), LF,
        ...enc(new Date().toLocaleString('ar-DZ')), LF,
        LF, LF,
        GS, 0x56, 0,                   // cut
      ];

      await device.transferOut(epNum, new Uint8Array(buf));
      await device.releaseInterface(ifNum);
      await device.close();
      toast.success('✅ تمت الطباعة الحرارية');
    } catch (err: any) {
      toast.error('❌ فشلت الطباعة: ' + (err?.message ?? ''));
    }
  }, [companyPreviewData]);

  // ── طباعة تجريبية في المتصفح ──────────────────────────────────────────────
  const handleTestPrint = useCallback(() => {
    const paper = document.querySelector('.ps-preview-paper') as HTMLElement | null;
    if (!paper) { window.print(); return; }

    const win = window.open('', '_blank', 'width=420,height=700');
    if (!win) { window.print(); return; }

    win.document.write(`<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="UTF-8"/>
  <title>طباعة تجريبية</title>
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;600;700;900&display=swap" rel="stylesheet"/>
  <style>
    body { margin: 0; padding: 10px; background: #fff; font-family: 'Tajawal', sans-serif; }
    @page { margin: 0; }
  </style>
</head>
<body>
  ${paper.outerHTML}
  <script>
    document.fonts.ready.then(function() {
      setTimeout(function() { window.print(); setTimeout(function() { window.close(); }, 500); }, 200);
    });
  </script>
</body></html>`);
    win.document.close();
  }, []);

  // ── تحديث القالب محلياً ───────────────────────────────────────────────────
  const updateTpl = useCallback(<K extends keyof ReceiptTemplate80mm>(
    key: K, val: ReceiptTemplate80mm[K],
  ) => setTpl(prev => ({ ...prev, [key]: val })), []);

  const isSaving = saveTplMut.isPending || saveConfigsMut.isPending;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="page on ps-page" id="p-print-settings">

      {/* ══ HEADER ══ */}
      <div className="ps-header">
        <div className="ps-header-left">
          <div className="ps-header-icon">
            <i className="ti ti-printer" />
          </div>
          <div>
            <h1 className="ps-header-title">إعدادات الطباعة</h1>
            <p className="ps-header-sub">
              الطابعات · نماذج المستندات · تخصيص القوالب — محفوظة في قاعدة البيانات
            </p>
          </div>
        </div>
        <div className="ps-header-actions">
          {/* نسخ قالب إلى مستند آخر */}
          {activeTab === 'templates' && (
            <CopyTemplateMenu
              docConfigs={docConfigs}
              currentCode={selectedDoc}
              onCopy={handleCopyTemplate}
              isSaving={saveTplMut.isPending}
            />
          )}
          {activeTab === 'templates' && (
            <button className="ps-btn ps-btn--ghost" onClick={handleResetTemplate}>
              <i className="ti ti-refresh" /> استعادة الافتراضي
            </button>
          )}
          {activeTab === 'templates' && (
            <button
              className="ps-btn ps-btn--primary"
              onClick={handleSaveTemplate}
              disabled={isSaving}
            >
              <i className={`ti ${isSaving ? 'ti-loader-2 spin' : 'ti-device-floppy'}`} />
              {isSaving ? 'جاري الحفظ...' : 'حفظ القالب'}
            </button>
          )}
        </div>
      </div>

      {/* ══ TABS ══ */}
      <div className="ps-tabs">
        {[
          { key: 'printers',  label: 'الطابعات',           icon: 'ti-printer'     },
          { key: 'documents', label: 'إعدادات المستندات',  icon: 'ti-file-text'   },
          { key: 'templates', label: 'تصميم القوالب',       icon: 'ti-layout'      },
        ].map(t => (
          <button
            key={t.key}
            className={`ps-tab ${activeTab === t.key ? 'on' : ''}`}
            onClick={() => setActiveTab(t.key as any)}
            type="button"
          >
            <i className={`ti ${t.icon}`} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ TAB: PRINTERS ══ */}
      {activeTab === 'printers' && (
        <div className="ps-content">
          <div className="ps-printers-header">
            <div>
              <div className="ps-section-title">الطابعات المتاحة</div>
              <div className="ps-section-sub">
                الطابعات محفوظة في قاعدة البيانات — مشتركة بين أعضاء الفريق
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="ps-btn ps-btn--primary"
                onClick={detectPrinters}
                disabled={scanning}
                type="button"
              >
                <i className={`ti ${scanning ? 'ti-loader-2 spin' : 'ti-refresh'}`} />
                {scanning ? 'جاري الاكتشاف...' : 'اكتشاف الطابعات'}
              </button>
              <button className="ps-btn ps-btn--ghost" onClick={handleThermalTest} type="button">
                <i className="ti ti-printer" /> اختبار حراري
              </button>
            </div>
          </div>

          {loadingPrinters ? (
            <div className="ps-loading">
              <i className="ti ti-loader-2 spin" /> جاري التحميل...
            </div>
          ) : printers.length === 0 ? (
            <div className="ps-no-printers">
              <i className="ti ti-printer-off" />
              <p>لا توجد طابعات مُسجَّلة</p>
              <span>انقر على "اكتشاف الطابعات" أو "ربط طابعة USB"</span>
            </div>
          ) : (
            <div className="ps-printers-grid">
              {printers.map(p => (
                <PrinterCard
                  key={p.id}
                  printer={p}
                  onSetDefault={id => handleSavePrinters(printers.map(x => ({ ...x, isDefault: x.id === id })))}
                  onRename={(id, name) => handleSavePrinters(printers.map(x => x.id === id ? { ...x, name } : x))}
                  onRemove={id => handleSavePrinters(printers.filter(x => x.id !== id))}
                />
              ))}
            </div>
          )}

          <div className="ps-usb-section">
            <div className="ps-section-title" style={{ marginBottom: 10 }}>
              ربط طابعة حرارية عبر USB
            </div>
            <p className="ps-usb-info">
              <i className="ti ti-info-circle" />
              يعمل عبر WebUSB على Chrome / Edge فقط. بعد الربط تُحفَظ الطابعة
              في قاعدة البيانات ويراها كل أعضاء الفريق.
            </p>
            <button className="ps-btn ps-btn--primary" onClick={handlePairUsb} type="button">
              <i className="ti ti-plug-connected" /> ربط طابعة USB
            </button>
          </div>

          <div className="ps-add-printer">
            <div className="ps-section-title" style={{ marginBottom: 10 }}>
              إضافة طابعة يدوياً
            </div>
            <AddPrinterForm
              onAdd={p => handleSavePrinters([...printers, p])}
            />
          </div>
        </div>
      )}

      {/* ══ TAB: DOCUMENTS ══ */}
      {activeTab === 'documents' && (
        <div className="ps-content">
          {loadingConfigs && (
            <div className="ps-loading">
              <i className="ti ti-loader-2 spin" /> جاري تحميل الإعدادات...
            </div>
          )}
          <div className="ps-doc-grid">
            {docConfigs.map(doc => (
              <DocConfigCard
                key={doc.docTypeCode}
                doc={doc}
                printers={printers}
                onUpdate={(patch) => updateDoc(doc.docTypeCode, patch)}
                onEditTemplate={() => {
                  setSelectedDoc(doc.docTypeCode);
                  setActiveTab('templates');
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ══ TAB: TEMPLATES ══ */}
      {activeTab === 'templates' && (
        <div className="ps-template-layout">

          {/* اختيار المستند */}
          <div className="ps-tpl-doc-select">
            <span className="ps-tpl-doc-label">المستند:</span>
            {docConfigs
              .filter(d => d.enabled && d.paperSize === '80mm')
              .map(d => (
                <button
                  key={d.docTypeCode}
                  className={`ps-tpl-doc-pill ${selectedDoc === d.docTypeCode ? 'on' : ''}`}
                  onClick={() => setSelectedDoc(d.docTypeCode)}
                  type="button"
                >
                  <span className="ps-tpl-pill-code">{d.docTypeCode}</span>
                  <span className="ps-tpl-pill-name">{d.docTypeName}</span>
                  {/* علامة: تم تخصيصه */}
                  {/* سنُضيفها لاحقاً بمقارنة مع defaultTemplate */}
                </button>
              ))}
            {docConfigs.filter(d => d.enabled && d.paperSize === '80mm').length === 0 && (
              <div className="ps-tpl-no-docs">
                لا توجد مستندات 80mm مُفعَّلة —{' '}
                <button
                  className="ps-link"
                  onClick={() => setActiveTab('documents')}
                  type="button"
                >
                  اذهب لإعدادات المستندات
                </button>
              </div>
            )}
          </div>

          <div className="ps-tpl-cols">

            {/* ── Controls ── */}
            <div className="ps-tpl-controls">
              {/* Quick nav */}
              <div className="ps-tpl-quicknav">
                {[
                  { label: 'الرأس',       id: 'sec-header'  },
                  { label: 'المستند',     id: 'sec-doc'     },
                  { label: 'البنود',      id: 'sec-items'   },
                  { label: 'الإجماليات', id: 'sec-totals'  },
                  { label: 'التذييل',    id: 'sec-footer'  },
                  { label: 'التنسيق',    id: 'sec-format'  },
                ].map(item => (
                  <button
                    key={item.id}
                    className="ps-tpl-quicknav-btn"
                    type="button"
                    onClick={() =>
                      document.getElementById(item.id)?.scrollIntoView({
                        behavior: 'smooth', block: 'start',
                      })
                    }
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {loadingTpl ? (
                <div className="ps-loading" style={{ padding: 40 }}>
                  <i className="ti ti-loader-2 spin" /> جاري تحميل القالب...
                </div>
              ) : (
                <>
                  <div id="sec-header">
                    <HeaderSectionControls tpl={tpl} update={updateTpl} company={companyPreviewData} />
                  </div>
                  <div id="sec-doc">
                    <DocumentSectionControls tpl={tpl} update={updateTpl} />
                  </div>
                  <div id="sec-items">
                    <ItemsSectionControls tpl={tpl} update={updateTpl} />
                  </div>
                  <div id="sec-totals">
                    <TotalsSectionControls tpl={tpl} update={updateTpl} />
                  </div>
                  <div id="sec-footer">
                    <FooterSectionControls tpl={tpl} update={updateTpl} />
                  </div>
                  <div id="sec-format">
                    <FormattingSectionControls tpl={tpl} update={updateTpl} />
                  </div>
                </>
              )}
            </div>

            {/* ── Preview ── */}
            <div className="ps-tpl-preview-col">
              <div className="ps-preview-source-info">
                <i className="ti ti-building-store" />
                <span>
                  {companyPreviewData
                    ? `البيانات: ${companyPreviewData.name}`
                    : 'بيانات تجريبية'}
                </span>
                <span className="ps-preview-doc-badge">
                  {selectedDoc} — {tpl.paperWidth}mm
                </span>
              </div>

              <div className="ps-preview-header">
                <span className="ps-preview-title">
                  <i className="ti ti-eye" /> معاينة فورية
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="ps-btn ps-btn--ghost ps-btn--sm"
                    onClick={handleResetTemplate}
                    type="button"
                    title="استعادة الافتراضي"
                  >
                    <i className="ti ti-refresh" />
                  </button>
                  <button
                    className="ps-btn ps-btn--ghost ps-btn--sm"
                    onClick={handleTestPrint}
                    type="button"
                  >
                    <i className="ti ti-printer" /> طباعة تجريبية
                  </button>
                </div>
              </div>

              {/* مسطرة */}
              <div className="ps-preview-ruler">
                {[0, 25, 50, 75, 100].map(pct => (
                  <span key={pct}>{Math.round(tpl.paperWidth * pct / 100)}mm</span>
                ))}
              </div>

              <div className="ps-preview-container">
                <div className="ps-preview-paper">
                  <ReceiptPreview tpl={tpl} company={companyPreviewData} />
                </div>
              </div>

              <div className="ps-preview-size-badge">
                {tpl.paperWidth}mm × طول تلقائي
              </div>

              <button
                className="ps-btn ps-btn--primary"
                style={{ width: '100%', marginTop: 12 }}
                onClick={handleSaveTemplate}
                disabled={isSaving}
                type="button"
              >
                <i className={`ti ${isSaving ? 'ti-loader-2 spin' : 'ti-device-floppy'}`} />
                {isSaving ? 'جاري الحفظ في DB...' : 'حفظ القالب في قاعدة البيانات'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PrinterCard({ printer: p, onSetDefault, onRename, onRemove }: {
  printer: DetectedPrinter;
  onSetDefault: (id: string) => void;
  onRename:     (id: string, name: string) => void;
  onRemove:     (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name,    setName]    = useState(p.name);

  return (
    <div className={`ps-printer-card ${p.isDefault ? 'ps-printer-card--default' : ''}`}>
      <div className="ps-printer-icon">
        <i className="ti ti-printer" />
        <span className={`ps-printer-dot ps-printer-dot--${p.status}`} />
      </div>
      <div className="ps-printer-info">
        {editing ? (
          <input
            className="ps-input ps-printer-name-input"
            value={name}
            autoFocus
            onBlur={() => { onRename(p.id, name.trim() || p.name); setEditing(false); }}
            onKeyDown={e => {
              if (e.key === 'Enter') { onRename(p.id, name.trim() || p.name); setEditing(false); }
              if (e.key === 'Escape') setEditing(false);
            }}
            onChange={e => setName(e.target.value)}
          />
        ) : (
          <div
            className="ps-printer-name"
            onClick={() => { setName(p.name); setEditing(true); }}
            style={{ cursor: 'pointer' }}
          >
            {p.name} <i className="ti ti-pencil" style={{ fontSize: 10, opacity: .4 }} />
          </div>
        )}
        <div className="ps-printer-meta">
          <span className={`ps-printer-status ps-printer-status--${p.status}`}>
            {p.status === 'ready' ? 'جاهزة' : p.status === 'offline' ? 'غير متصلة' : 'غير معروف'}
          </span>
          {p.source === 'usb'  && <span className="ps-printer-source-tag ps-printer-source-tag--usb">USB</span>}
          {p.source === 'demo' && <span className="ps-printer-source-tag ps-printer-source-tag--demo">نموذج</span>}
          {p.isDefault         && <span className="ps-printer-default-tag">افتراضية</span>}
        </div>
      </div>
      <div className="ps-printer-actions">
        {!p.isDefault && (
          <button className="ps-btn-xs" onClick={() => onSetDefault(p.id)} type="button">
            تعيين افتراضي
          </button>
        )}
        <button
          className="ps-btn-xs ps-btn-xs--ghost"
          onClick={() => onRemove(p.id)}
          type="button"
          title="حذف"
        >
          <i className="ti ti-trash" />
        </button>
      </div>
    </div>
  );
}

function DocConfigCard({ doc, printers, onUpdate, onEditTemplate }: {
  doc:            DocumentPrintConfig;
  printers:       DetectedPrinter[];
  onUpdate:       (patch: Partial<DocumentPrintConfig>) => void;
  onEditTemplate: () => void;
}) {
  return (
    <div className={`ps-doc-card ${!doc.enabled ? 'ps-doc-card--disabled' : ''}`}>
      <div className="ps-doc-card-top">
        <div className="ps-doc-code">{doc.docTypeCode}</div>
        <div className="ps-doc-name">{doc.docTypeName}</div>
        <div
          className={`ps-toggle-track ${doc.enabled ? 'on' : ''}`}
          onClick={() => onUpdate({ enabled: !doc.enabled })}
        >
          <div className="ps-toggle-thumb" />
        </div>
      </div>

      {doc.enabled && (
        <div className="ps-doc-card-body">
          {/* حجم الورق */}
          <div className="ps-field">
            <label className="ps-field-label">حجم الورق</label>
            <div className="ps-paper-pills">
              {(['none', '80mm', 'A5', 'A4'] as PaperSize[])
                .filter(s => s === 'none' || doc.templates.includes(s))
                .map(s => (
                  <button
                    key={s}
                    className={`ps-paper-pill ${doc.paperSize === s ? 'on' : ''}`}
                    onClick={() => onUpdate({ paperSize: s })}
                    type="button"
                  >
                    {s === 'none' ? 'لا تطبع' : s}
                  </button>
                ))}
            </div>
          </div>

          {doc.paperSize !== 'none' && (
            <>
              {/* الطابعة */}
              <div className="ps-field">
                <label className="ps-field-label">الطابعة</label>
                <select
                  className="ps-select"
                  value={doc.printerId ?? ''}
                  onChange={e => onUpdate({ printerId: e.target.value || null })}
                >
                  <option value="">الافتراضية</option>
                  {printers.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* عدد النسخ */}
              <div className="ps-field ps-field--row">
                <label className="ps-field-label">عدد النسخ</label>
                <div className="ps-counter">
                  <button
                    type="button"
                    onClick={() => onUpdate({ copies: Math.max(1, doc.copies - 1) })}
                  >−</button>
                  <span>{doc.copies}</span>
                  <button
                    type="button"
                    onClick={() => onUpdate({ copies: Math.min(5, doc.copies + 1) })}
                  >+</button>
                </div>
              </div>

              {/* خيارات */}
              <div className="ps-field-checks">
                <label className="ps-check">
                  <input
                    type="checkbox"
                    checked={doc.autoPrint}
                    onChange={e => onUpdate({ autoPrint: e.target.checked })}
                  />
                  <span>طباعة تلقائية</span>
                </label>
                <label className="ps-check">
                  <input
                    type="checkbox"
                    checked={doc.showPreview}
                    onChange={e => onUpdate({ showPreview: e.target.checked })}
                  />
                  <span>معاينة قبل الطباعة</span>
                </label>
              </div>

              {/* زر تعديل القالب */}
              {doc.paperSize === '80mm' && (
                <button
                  className="ps-edit-tpl-btn"
                  onClick={onEditTemplate}
                  type="button"
                >
                  <i className="ti ti-layout" /> تخصيص قالب 80mm
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** قائمة نسخ القالب إلى مستند آخر */
function CopyTemplateMenu({ docConfigs, currentCode, onCopy, isSaving }: {
  docConfigs:  DocumentPrintConfig[];
  currentCode: string;
  onCopy:      (targetCode: string) => void;
  isSaving:    boolean;
}) {
  const [open, setOpen] = useState(false);
  const targets         = docConfigs.filter(d => d.docTypeCode !== currentCode && d.enabled && d.paperSize === '80mm');

  if (targets.length === 0) return null;

  return (
    <div style={{ position: 'relative' }}>
      <button
        className="ps-btn ps-btn--ghost"
        onClick={() => setOpen(o => !o)}
        disabled={isSaving}
        type="button"
      >
        <i className="ti ti-copy" /> نسخ إلى...
      </button>
      {open && (
        <div className="ps-copy-menu" style={{
          position: 'absolute', top: '100%', left: 0,
          background: 'var(--bg2)', border: '1px solid var(--b2)',
          borderRadius: 'var(--r2)', boxShadow: 'var(--shadow2)',
          zIndex: 100, minWidth: 180, padding: '4px 0',
        }}>
          {targets.map(d => (
            <button
              key={d.docTypeCode}
              className="ps-copy-menu-item"
              style={{
                display: 'block', width: '100%', textAlign: 'right',
                padding: '8px 14px', border: 'none', background: 'none',
                cursor: 'pointer', fontSize: 13, color: 'var(--t1)',
                fontFamily: 'Tajawal, sans-serif',
              }}
              onClick={() => { onCopy(d.docTypeCode); setOpen(false); }}
              type="button"
            >
              {d.docTypeCode} — {d.docTypeName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AddPrinterForm({ onAdd }: { onAdd: (p: DetectedPrinter) => void }) {
  const [name, setName] = useState('');
  return (
    <div className="ps-add-printer-form">
      <input
        className="ps-input"
        placeholder="اسم الطابعة..."
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && name.trim()) {
            onAdd({ id: `manual-${Date.now()}`, name: name.trim(), isDefault: false, status: 'unknown' });
            setName('');
          }
        }}
      />
      <button
        className="ps-btn ps-btn--primary"
        disabled={!name.trim()}
        type="button"
        onClick={() => {
          if (!name.trim()) return;
          onAdd({ id: `manual-${Date.now()}`, name: name.trim(), isDefault: false, status: 'unknown' });
          setName('');
        }}
      >
        <i className="ti ti-plus" /> إضافة
      </button>
    </div>
  );
}
