// resources/js/pages/settings/PrintSettingsPage.tsx
// نظام إعدادات الطباعة الكامل — اكتشاف الطابعات + نماذج المستندات + تصميم القوالب
import React, { useState, useEffect, useCallback } from 'react';
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
  DetectedPrinter,
  DocumentPrintConfig,
  ReceiptTemplate80mm,
  PaperSize,
  CompanyPreviewData,
} from './print-settings/types';
import { defaultTemplate } from './print-settings/types';
import { useCurrentCompany } from '../../lib/api/endpoints/companies';
import { useSettingsByGroup } from '../../lib/api/endpoints/settings';

// ─── Document types ──────────────────────────────────────────────────────────
const DOC_TYPES: Omit<DocumentPrintConfig, 'printerId'>[] = [
  { docTypeCode: 'FV', docTypeName: 'فاتورة المبيعات',    enabled: true,  paperSize: '80mm', copies: 1, autoPrint: false, showPreview: true,  templates: ['80mm','A4','A5'] },
  { docTypeCode: 'BL', docTypeName: 'وصل التسليم',        enabled: true,  paperSize: '80mm', copies: 1, autoPrint: false, showPreview: false, templates: ['80mm','A4'] },
  { docTypeCode: 'FA', docTypeName: 'فاتورة الشراء',      enabled: false, paperSize: 'A4',   copies: 1, autoPrint: false, showPreview: true,  templates: ['A4','A5'] },
  { docTypeCode: 'BR', docTypeName: 'وصل الاستلام',       enabled: false, paperSize: 'A4',   copies: 1, autoPrint: false, showPreview: false, templates: ['A4'] },
  { docTypeCode: 'AV', docTypeName: 'أمر الشراء',         enabled: false, paperSize: 'A4',   copies: 1, autoPrint: false, showPreview: true,  templates: ['A4'] },
  { docTypeCode: 'DEV', docTypeName: 'عرض السعر',         enabled: true,  paperSize: 'A4',   copies: 1, autoPrint: false, showPreview: true,  templates: ['A4','A5'] },
  { docTypeCode: 'BCC', docTypeName: 'طلب الشراء',        enabled: false, paperSize: 'none', copies: 1, autoPrint: false, showPreview: false, templates: ['A4'] },
  { docTypeCode: 'DDP', docTypeName: 'إذن التسليم',       enabled: true,  paperSize: 'A4',   copies: 2, autoPrint: false, showPreview: false, templates: ['A4','A5'] },
  { docTypeCode: 'BCF', docTypeName: 'طلب العميل',        enabled: false, paperSize: 'none', copies: 1, autoPrint: false, showPreview: false, templates: ['A4'] },
  { docTypeCode: 'AA',  docTypeName: 'مرتجع المبيعات',   enabled: true,  paperSize: '80mm', copies: 1, autoPrint: false, showPreview: true,  templates: ['80mm','A4'] },
  { docTypeCode: 'BT',  docTypeName: 'تحويل المخزون',    enabled: false, paperSize: 'A4',   copies: 1, autoPrint: false, showPreview: false, templates: ['A4'] },
];

// ─── Main Component ──────────────────────────────────────────────────────────
export default function PrintSettingsPage() {
  const [activeTab,    setActiveTab]    = useState<'printers' | 'documents' | 'templates'>('printers');
  const [printers,     setPrinters]     = useState<DetectedPrinter[]>([]);
  const [scanning,     setScanning]     = useState(false);
  const [docConfigs,   setDocConfigs]   = useState<DocumentPrintConfig[]>(
    DOC_TYPES.map(d => ({ ...d, printerId: null })),
  );
  const [selectedDoc,  setSelectedDoc]  = useState<string>('FV');
  const [tpl,          setTpl]          = useState<ReceiptTemplate80mm>(defaultTemplate);
  const [saved,        setSaved]        = useState(false);

  const { data: apiCompany } = useCurrentCompany();
  const { data: rawPrintSettings = [] } = useSettingsByGroup('print');

  const companyPreviewData: CompanyPreviewData | null = apiCompany ? {
    name:     apiCompany.name || '',
    address:  apiCompany.address || '',
    phone:    apiCompany.phone || '',
    nif:      apiCompany.nif || '',
    rc:       apiCompany.rc || '',
    nis:      apiCompany.nis || '',
    ice:      '',
    article:  apiCompany.ai || '',
    logoUrl:  apiCompany.avatar || null,
  } : null;

  // ── اكتشاف الطابعات (WebUSB + localStorage) ────────────────────────────────
  const detectPrinters = useCallback(async () => {
    setScanning(true);
    try {
      const detected: DetectedPrinter[] = [];

      // 1. WebUSB — الطابعات الحرارية المتصلة سابقاً
      if (typeof navigator !== 'undefined' && 'usb' in navigator) {
        try {
          const usbDevices = await (navigator as any).usb.getDevices();
          usbDevices.forEach((dev: any, i: number) => {
            const name = dev.productName || dev.manufacturerName || `طابعة USB`;
            detected.push({
              id:        `usb-${dev.serialNumber ?? i}`,
              name,
              isDefault: detected.length === 0,
              status:    'ready',
              source:    'usb',
            });
          });
        } catch { /* ignore */ }
      }

      // 2. localStorage cache
      if (detected.length === 0) {
        const saved = localStorage.getItem('erp_printers');
        if (saved) {
          detected.push(...JSON.parse(saved));
        }
      }

      // 3. Fallback — نموذجان فقط للعرض
      if (detected.length === 0) {
        detected.push(
          { id: 'thermal-1', name: 'طابعة حرارية 80mm',   isDefault: true,  status: 'ready',   source: 'demo' },
          { id: 'pdf-1',     name: 'Microsoft Print to PDF', isDefault: false, status: 'ready', source: 'demo' },
        );
      }

      await new Promise(r => setTimeout(r, 800));
      setPrinters(detected);
      localStorage.setItem('erp_printers', JSON.stringify(detected));
    } finally {
      setScanning(false);
    }
  }, []);

  // ── طباعة اختبار حراري ESC/POS عبر أول طابعة USB ─────────────────────────
  const handleThermalTest = useCallback(async () => {
    const usb = (navigator as any).usb;
    if (!usb) { alert('WebUSB غير مدعوم — استخدم Chrome أو Edge'); return; }
    try {
      const devices = await usb.getDevices();
      const device = devices[0] ?? await usb.requestDevice({ filters: [] });
      if (!device) return;
      await device.open();
      if (device.configuration === null) await device.selectConfiguration(1);
      const config = device.configuration;
      let ifNum = -1, epNum = -1;
      for (let i = 0; i < (config?.interfaces?.length ?? 0); i++) {
        const iface = config.interfaces[i];
        const alt = iface.alternates?.[0];
        if (!alt || alt.interfaceClass === 2) continue;
        const ep = alt.endpoints?.find((e: any) => e.direction === 'out');
        if (ep) { ifNum = iface.interfaceNumber; epNum = ep.endpointNumber; break; }
      }
      if (ifNum === -1) { await device.close(); alert('لم يُعثَر على منفذ كتابة في الطابعة'); return; }
      await device.claimInterface(ifNum);
      const ESC = 0x1B, GS = 0x1D, LF = 0x0A;
      const enc = (s: string) => { const r: number[] = []; for (const c of s) { const cp = c.codePointAt(0) ?? 63; r.push(cp < 128 ? cp : 63); } return r; };
      const buf: number[] = [ESC, 0x40, ESC, 0x74, 0x10, ESC, 0x61, 1, ESC, 0x45, 1, ...enc(companyPreviewData?.name || 'طابعة 80mm'), LF, ESC, 0x45, 0, ...enc('طباعة اختبارية'), LF, ...enc('تم الاتصال بنجاح!'), LF, LF, GS, 0x56, 0];
      await device.transferOut(epNum, new Uint8Array(buf));
      await device.releaseInterface(ifNum);
      await device.close();
      alert('✅ تمت الطباعة الحرارية بنجاح!');
    } catch (err: any) {
      alert('❌ فشلت الطباعة الحرارية: ' + (err.message || 'خطأ غير معروف'));
    }
  }, [companyPreviewData]);

  // ── إقران طابعة USB جديدة عبر WebUSB ──────────────────────────────────────
  const handlePairUsb = useCallback(async () => {
    if (typeof navigator === 'undefined' || !('usb' in navigator)) {
      alert('متصفحك لا يدعم WebUSB. استخدم Chrome أو Edge.');
      return;
    }
    try {
      const device = await (navigator as any).usb.requestDevice({ filters: [] });
      const name = device.productName || device.manufacturerName || 'طابعة حرارية USB';
      const newPrinter: DetectedPrinter = {
        id:        `usb-${device.serialNumber ?? Date.now()}`,
        name,
        isDefault: printers.length === 0,
        status:    'ready',
        source:    'usb',
      };
      setPrinters(prev => {
        const updated = [...prev, newPrinter];
        localStorage.setItem('erp_printers', JSON.stringify(updated));
        return updated;
      });
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        alert('تعذر الاتصال بالطابعة: ' + err.message);
      }
    }
  }, [printers]);

  useEffect(() => {
    const cached = localStorage.getItem('erp_printers');
    if (cached) setPrinters(JSON.parse(cached));
    const savedTpl = localStorage.getItem('erp_print_tpl_FV_80mm');
    if (savedTpl) setTpl(prev => ({ ...prev, ...JSON.parse(savedTpl) }));
    const savedDocs = localStorage.getItem('erp_doc_print_configs');
    if (savedDocs) setDocConfigs(JSON.parse(savedDocs));
  }, []);

  const updateDoc = (code: string, patch: Partial<DocumentPrintConfig>) => {
    setDocConfigs(prev => prev.map(d => d.docTypeCode === code ? { ...d, ...patch } : d));
  };

  const updateTpl = <K extends keyof ReceiptTemplate80mm>(
    key: K, val: ReceiptTemplate80mm[K],
  ) => setTpl(prev => ({ ...prev, [key]: val }));

  const handleSave = () => {
    localStorage.setItem('erp_print_tpl_FV_80mm', JSON.stringify(tpl));
    localStorage.setItem('erp_doc_print_configs', JSON.stringify(docConfigs));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setTpl(defaultTemplate());
  };

  const handleTestPrint = () => {
    const paper = document.querySelector('.ps-preview-paper') as HTMLElement | null;
    if (paper) {
      const printWin = window.open('', '_blank');
      if (printWin) {
        printWin.document.write(
          '<html><head>' +
          '<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;600;700;900&display=swap" rel="stylesheet"/>' +
          '<style>' +
          'body { margin: 0; padding: 10px; display: flex; justify-content: center; background: #fff; font-family: "Tajawal", sans-serif; }' +
          '@page { margin: 0; }' +
          '</style></head><body>' +
          paper.outerHTML +
          '</body></html>'
        );
        printWin.document.close();
        setTimeout(() => printWin.print(), 300);
      } else {
        window.print();
      }
    } else {
      window.print();
    }
  };

  const selectedDocConfig = docConfigs.find(d => d.docTypeCode === selectedDoc);

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
            <p className="ps-header-sub">إدارة الطابعات · نماذج المستندات · تخصيص القوالب</p>
          </div>
        </div>
        <div className="ps-header-actions">
          <button className="ps-btn ps-btn--ghost" onClick={handleReset}>
            <i className="ti ti-refresh" /> استعادة الافتراضي
          </button>
          <button className={`ps-btn ps-btn--primary ${saved ? 'ps-btn--saved' : ''}`} onClick={handleSave}>
            <i className={`ti ${saved ? 'ti-check' : 'ti-device-floppy'}`} />
            {saved ? 'تم الحفظ!' : 'حفظ الإعدادات'}
          </button>
        </div>
      </div>

      {/* ══ TABS ══ */}
      <div className="ps-tabs">
        {[
          { key: 'printers',  label: 'الطابعات',      icon: 'ti-printer'       },
          { key: 'documents', label: 'إعدادات المستندات', icon: 'ti-file-text' },
          { key: 'templates', label: 'تصميم القوالب',  icon: 'ti-layout'        },
        ].map(t => (
          <button
            key={t.key}
            className={`ps-tab ${activeTab === t.key ? 'on' : ''}`}
            onClick={() => setActiveTab(t.key as any)}
          >
            <i className={`ti ${t.icon}`} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════
          TAB 1: PRINTERS
      ══════════════════════════════════════════ */}
      {activeTab === 'printers' && (
        <div className="ps-content">
          <div className="ps-printers-header">
            <div>
              <div className="ps-section-title">الطابعات المتاحة</div>
              <div className="ps-section-sub">
                يتم اكتشاف الطابعات المثبتة على الجهاز تلقائياً
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className={`ps-btn ps-btn--primary ${scanning ? 'ps-btn--loading' : ''}`}
                onClick={detectPrinters}
                disabled={scanning}
              >
                <i className={`ti ${scanning ? 'ti-loader-2 spin' : 'ti-refresh'}`} />
                {scanning ? 'جاري الاكتشاف...' : 'اكتشاف الطابعات'}
              </button>
              <button className="ps-btn ps-btn--ghost" onClick={handleThermalTest}>
                <i className="ti ti-printer" /> طباعة اختبار حراري
              </button>
            </div>
          </div>

          {printers.length === 0 ? (
            <div className="ps-no-printers">
              <i className="ti ti-printer-off" />
              <p>لم يتم اكتشاف أي طابعة</p>
              <span>انقر على "اكتشاف الطابعات" للبحث عن الطابعات المتاحة</span>
            </div>
          ) : (
            <div className="ps-printers-grid">
              {printers.map(p => (
                <div key={p.id} className={`ps-printer-card ${p.isDefault ? 'ps-printer-card--default' : ''}`}>
                  <div className="ps-printer-icon">
                    <i className="ti ti-printer" />
                    {p.status === 'ready' && <span className="ps-printer-dot ps-printer-dot--ready" />}
                    {p.status === 'offline' && <span className="ps-printer-dot ps-printer-dot--off" />}
                    {p.status === 'unknown' && <span className="ps-printer-dot ps-printer-dot--unk" />}
                  </div>
                  <div className="ps-printer-info">
                    <EditablePrinterName
                      name={p.name}
                      onSave={v => {
                        setPrinters(prev => {
                          const next = prev.map(x => x.id === p.id ? { ...x, name: v } : x);
                          localStorage.setItem('erp_printers', JSON.stringify(next));
                          return next;
                        });
                      }}
                    />
                    <div className="ps-printer-meta">
                      <span className={`ps-printer-status ps-printer-status--${p.status}`}>
                        {p.status === 'ready' ? 'جاهزة' : p.status === 'offline' ? 'غير متصلة' : 'غير معروف'}
                      </span>
                      {p.source === 'usb' && <span className="ps-printer-source-tag ps-printer-source-tag--usb">USB</span>}
                      {p.source === 'demo' && <span className="ps-printer-source-tag ps-printer-source-tag--demo">نموذج</span>}
                      {p.isDefault && <span className="ps-printer-default-tag">افتراضية</span>}
                    </div>
                  </div>
                  <div className="ps-printer-actions">
                    {!p.isDefault && (
                      <button
                        className="ps-btn-xs"
                        onClick={() => setPrinters(prev =>
                          prev.map(x => ({ ...x, isDefault: x.id === p.id }))
                        )}
                      >
                        تعيين افتراضي
                      </button>
                    )}
                    <button
                      className="ps-btn-xs ps-btn-xs--ghost"
                      onClick={() => setPrinters(prev => prev.filter(x => x.id !== p.id))}
                    >
                      <i className="ti ti-trash" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="ps-usb-section">
            <div className="ps-section-title" style={{ marginBottom: 12 }}>ربط طابعة حرارية عبر USB</div>
            <p className="ps-usb-info">
              <i className="ti ti-info-circle" />
              استخدم زر "ربط طابعة USB" لربط طابعة حرارية عبر منفذ USB.
              تعمل هذه الخاصية على متصفح Chrome أو Edge فقط.
            </p>
            <button className="ps-btn ps-btn--primary" onClick={handlePairUsb}>
              <i className="ti ti-plug-connected" /> ربط طابعة USB
            </button>
          </div>

          <div className="ps-add-printer">
            <div className="ps-section-title" style={{ marginBottom: 12 }}>إضافة طابعة يدوياً</div>
            <AddPrinterForm onAdd={p => setPrinters(prev => [...prev, p])} />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          TAB 2: DOCUMENTS
      ══════════════════════════════════════════ */}
      {activeTab === 'documents' && (
        <div className="ps-content">
          <div className="ps-doc-grid">
            {docConfigs.map(doc => (
              <div key={doc.docTypeCode} className={`ps-doc-card ${!doc.enabled ? 'ps-doc-card--disabled' : ''}`}>
                <div className="ps-doc-card-top">
                  <div className="ps-doc-code">{doc.docTypeCode}</div>
                  <div className="ps-doc-name">{doc.docTypeName}</div>
                  <div className="ps-doc-toggle-wrap">
                    <div
                      className={`ps-toggle-track ${doc.enabled ? 'on' : ''}`}
                      onClick={() => updateDoc(doc.docTypeCode, { enabled: !doc.enabled })}
                    >
                      <div className="ps-toggle-thumb" />
                    </div>
                  </div>
                </div>

                {doc.enabled && (
                  <div className="ps-doc-card-body">
                    <div className="ps-field">
                      <label className="ps-field-label">حجم الورق</label>
                      <div className="ps-paper-pills">
                        {(['none', '80mm', 'A5', 'A4'] as PaperSize[])
                          .filter(s => s === 'none' || doc.templates.includes(s))
                          .map(s => (
                            <button
                              key={s}
                              className={`ps-paper-pill ${doc.paperSize === s ? 'on' : ''}`}
                              onClick={() => updateDoc(doc.docTypeCode, { paperSize: s })}
                            >
                              {s === 'none' ? 'لا تطبع' : s}
                            </button>
                          ))}
                      </div>
                    </div>

                    {doc.paperSize !== 'none' && (
                      <>
                        <div className="ps-field">
                          <label className="ps-field-label">الطابعة</label>
                          <select
                            className="ps-select"
                            value={doc.printerId ?? ''}
                            onChange={e => updateDoc(doc.docTypeCode, { printerId: e.target.value || null })}
                          >
                            <option value="">الافتراضية</option>
                            {printers.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="ps-field ps-field--row">
                          <label className="ps-field-label">عدد النسخ</label>
                          <div className="ps-counter">
                            <button onClick={() => updateDoc(doc.docTypeCode, { copies: Math.max(1, doc.copies - 1) })}>−</button>
                            <span>{doc.copies}</span>
                            <button onClick={() => updateDoc(doc.docTypeCode, { copies: Math.min(5, doc.copies + 1) })}>+</button>
                          </div>
                        </div>

                        <div className="ps-field-checks">
                          <label className="ps-check">
                            <input type="checkbox" checked={doc.autoPrint}
                              onChange={e => updateDoc(doc.docTypeCode, { autoPrint: e.target.checked })} />
                            <span>طباعة تلقائية</span>
                          </label>
                          <label className="ps-check">
                            <input type="checkbox" checked={doc.showPreview}
                              onChange={e => updateDoc(doc.docTypeCode, { showPreview: e.target.checked })} />
                            <span>معاينة قبل الطباعة</span>
                          </label>
                        </div>

                        {doc.paperSize === '80mm' && (
                          <button
                            className="ps-edit-tpl-btn"
                            onClick={() => { setSelectedDoc(doc.docTypeCode); setActiveTab('templates'); }}
                          >
                            <i className="ti ti-layout" /> تخصيص قالب 80mm
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          TAB 3: TEMPLATES (80mm designer)
      ══════════════════════════════════════════ */}
      {activeTab === 'templates' && (
        <div className="ps-template-layout">

          {/* ── Document selector ── */}
          <div className="ps-tpl-doc-select">
            <span className="ps-tpl-doc-label">المستند:</span>
            {docConfigs.filter(d => d.paperSize === '80mm' && d.enabled).map(d => (
              <button
                key={d.docTypeCode}
                className={`ps-tpl-doc-pill ${selectedDoc === d.docTypeCode ? 'on' : ''}`}
                onClick={() => setSelectedDoc(d.docTypeCode)}
              >
                {d.docTypeCode} — {d.docTypeName}
              </button>
            ))}
          </div>

          <div className="ps-tpl-cols">

            {/* ── Controls (Right column) ── */}
            <div className="ps-tpl-controls">
              <div className="ps-tpl-quicknav">
                {[
                  { label: 'الرأس',      id: 'sec-header' },
                  { label: 'المستند',    id: 'sec-doc' },
                  { label: 'البنود',     id: 'sec-items' },
                  { label: 'الإجماليات', id: 'sec-totals' },
                  { label: 'التذييل',   id: 'sec-footer' },
                  { label: 'التنسيق',   id: 'sec-format' },
                ].map(item => (
                  <button key={item.id} className="ps-tpl-quicknav-btn"
                    onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                    {item.label}
                  </button>
                ))}
              </div>

              <div id="sec-header"><HeaderSectionControls tpl={tpl} update={updateTpl} company={companyPreviewData} /></div>
              <div id="sec-doc"><DocumentSectionControls tpl={tpl} update={updateTpl} /></div>
              <div id="sec-items"><ItemsSectionControls tpl={tpl} update={updateTpl} /></div>
              <div id="sec-totals"><TotalsSectionControls tpl={tpl} update={updateTpl} /></div>
              <div id="sec-footer"><FooterSectionControls tpl={tpl} update={updateTpl} /></div>
              <div id="sec-format"><FormattingSectionControls tpl={tpl} update={updateTpl} /></div>
            </div>

            {/* ── Preview (Left column) ── */}
            <div className="ps-tpl-preview-col">
              {/* مصدر البيانات */}
              <div className="ps-preview-source-info">
                <i className="ti ti-info-circle" />
                <span>
                  {companyPreviewData
                    ? `البيانات من: ${companyPreviewData.name}`
                    : 'بيانات تجريبية — لم يتم تحميل بيانات الشركة'}
                </span>
              </div>

              <div className="ps-preview-header">
                <span className="ps-preview-title">
                  <i className="ti ti-eye" /> معاينة — {tpl.paperWidth}mm
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="ps-btn ps-btn--ghost ps-btn--sm" onClick={handleReset}>
                    <i className="ti ti-refresh" />
                  </button>
                  <button className="ps-btn ps-btn--ghost ps-btn--sm" onClick={handleTestPrint}>
                    <i className="ti ti-printer" /> طباعة تجريبية
                  </button>
                </div>
              </div>

              <div className="ps-preview-container">
                <div className="ps-preview-ruler">
                  <span>0</span><span>{Math.round(tpl.paperWidth * 0.25)}mm</span>
                  <span>{Math.round(tpl.paperWidth * 0.5)}mm</span>
                  <span>{Math.round(tpl.paperWidth * 0.75)}mm</span>
                  <span>{tpl.paperWidth}mm</span>
                </div>
                <div className="ps-preview-paper">
                  <ReceiptPreview tpl={tpl} company={companyPreviewData} />
                </div>
                <div className="ps-preview-size-badge">{tpl.paperWidth}mm × طول تلقائي</div>
              </div>

              <button
                className={`ps-btn ps-btn--primary ${saved ? 'ps-btn--saved' : ''}`}
                style={{ width: '100%' }}
                onClick={handleSave}
              >
                <i className={`ti ${saved ? 'ti-check' : 'ti-device-floppy'}`} />
                {saved ? 'تم الحفظ!' : 'حفظ القالب'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

// ─── Add Printer Form ─────────────────────────────────────────────────────────
function AddPrinterForm({ onAdd }: { onAdd: (p: DetectedPrinter) => void }) {
  const [name, setName] = useState('');
  return (
    <div className="ps-add-printer-form">
      <input
        className="ps-input"
        placeholder="اسم الطابعة..."
        value={name}
        onChange={e => setName(e.target.value)}
      />
      <button
        className="ps-btn ps-btn--primary"
        disabled={!name.trim()}
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

function EditablePrinterName({ name, onSave }: { name: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(name);
  return editing ? (
    <input
      className="ps-input ps-printer-name-input"
      value={val}
      autoFocus
      onBlur={() => { onSave(val.trim() || name); setEditing(false); }}
      onKeyDown={e => { if (e.key === 'Enter') { onSave(val.trim() || name); setEditing(false); } }}
      onChange={e => setVal(e.target.value)}
      onClick={e => e.stopPropagation()}
    />
  ) : (
    <div className="ps-printer-name" onClick={() => setVal(name) || setEditing(true)} style={{ cursor: 'pointer' }}>
      {name} <i className="ti ti-pencil" style={{ fontSize: 10, opacity: .4 }} />
    </div>
  );
}
