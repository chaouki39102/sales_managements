// pages/settings/SettingsPage.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader  from '@/components/ui/PageHeader';
import Card        from '@/components/ui/Card';
import Button      from '@/components/ui/Button';
import Switch      from '@/components/ui/Switch';
import apiClient   from '@/lib/api/client';
import type { Setting } from '@/types';

// ── Tab definitions ───────────────────────────────
const TABS = [
  { id: 'company',   label: 'المؤسسة',         icon: 'ti-building'          },
  { id: 'fiscal',    label: 'الجبائي والضرائب', icon: 'ti-calculator'        },
  { id: 'docs',      label: 'المستندات',         icon: 'ti-file-description'  },
  { id: 'numbering', label: 'الترقيم',           icon: 'ti-list-numbers'      },
  { id: 'print',     label: 'الطباعة',           icon: 'ti-printer'           },
  { id: 'backup',    label: 'البيانات',           icon: 'ti-database'          },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('company');

  return (
    <div className="page on" id="p-settings">
      <PageHeader title="الإعدادات" subtitle="إعدادات النظام والمؤسسة" />

      {/* Tab nav */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--b2)', marginBottom: 18, overflowX: 'auto' }}>
        {TABS.map(t => (
          <div
            key={t.id}
            className={`stab ${activeTab === t.id ? 'on' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            <span className="ic ic-xs"><i className={`ti ${t.icon}`}/></span>
            {t.label}
          </div>
        ))}
      </div>

      {/* Panels */}
      {activeTab === 'company'   && <CompanyPanel   />}
      {activeTab === 'fiscal'    && <FiscalPanel    />}
      {activeTab === 'docs'      && <DocsPanel      />}
      {activeTab === 'numbering' && <NumberingPanel />}
      {activeTab === 'print'     && <PrintPanel     />}
      {activeTab === 'backup'    && <BackupPanel    />}
    </div>
  );
}

// ── Save button with feedback ─────────────────────
function SaveBtn({ onClick, loading }: { onClick: () => void; loading?: boolean }) {
  const [saved, setSaved] = useState(false);

  const handle = async () => {
    await onClick();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <Button variant="primary" icon={saved ? <i className="ti ti-check"/> : <i className="ti ti-device-floppy"/>}
      onClick={handle} disabled={loading}
      style={saved ? { background: 'var(--em)' } : {}}>
      {saved ? 'تم الحفظ!' : loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
    </Button>
  );
}

// ── Company Panel ─────────────────────────────────
function CompanyPanel() {
  const [form, setForm] = useState({
    name:      'مؤسسة النور للتجارة العامة',
    legal:     'EURL',
    sector:    'تجارة التجزئة',
    address:   'حي النصر، طريق غرداية، ورقلة 30000',
    phone1:    '029 71 23 45',
    phone2:    '',
    fax:       '029 71 23 46',
    email:     'info@alnour-dz.com',
    website:   '',
    nif:       '001234567890123',
    nis:       '245103002000012',
    ai:        '29202400012',
    rc:        '29/00-0012345B05',
    rib:       '',
    bank:      'BNA — بنك الجزائر',
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="g65">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Card title={<><span className="ic ic-sm" style={{ color: 'var(--em)' }}><i className="ti ti-building"/></span> البيانات الرسمية للمؤسسة</>}>
          <div className="fgrid c3" style={{ gap: 12 }}>
            <div className="fg s3">
              <label className="req">اسم المؤسسة / الشركة</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div className="fg">
              <label>الشكل القانوني</label>
              <select value={form.legal} onChange={e => set('legal', e.target.value)}>
                {['SARL', 'EURL', 'SPA', 'SNC', 'Entreprise individuelle', 'Auto-entrepreneur'].map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label>قطاع النشاط</label>
              <select value={form.sector} onChange={e => set('sector', e.target.value)}>
                {['تجارة التجزئة', 'تجارة الجملة', 'الصناعة والتصنيع', 'الخدمات', 'البناء والأشغال', 'الفلاحة', 'النقل'].map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div className="fg s3">
              <label>العنوان الكامل</label>
              <input value={form.address} onChange={e => set('address', e.target.value)} />
            </div>
            <div className="fg"><label>الهاتف 1</label><input value={form.phone1} onChange={e => set('phone1', e.target.value)} /></div>
            <div className="fg"><label>الهاتف 2</label><input value={form.phone2} onChange={e => set('phone2', e.target.value)} placeholder="اختياري" /></div>
            <div className="fg"><label>الفاكس</label><input value={form.fax} onChange={e => set('fax', e.target.value)} /></div>
            <div className="fg"><label>البريد الإلكتروني</label><input type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
            <div className="fg"><label>الموقع الإلكتروني</label><input value={form.website} onChange={e => set('website', e.target.value)} placeholder="www.example.com" /></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
            <SaveBtn onClick={() => {}} />
          </div>
        </Card>

        <Card title={<><span className="ic ic-sm" style={{ color: 'var(--blue)' }}><i className="ti ti-id-badge"/></span> المعرّفات الجبائية والتجارية</>}
          subtitle="مطابقة للقانون الجبائي الجزائري">
          <div className="fgrid c3" style={{ gap: 12 }}>
            {[
              { key: 'nif', label: 'NIF — رقم التعريف الجبائي', hint: '15 خانة رقمية', maxLen: 15 },
              { key: 'nis', label: 'NIS — الرقم الإحصائي',       hint: 'مركز الإحصاء الوطني', maxLen: 15 },
              { key: 'ai',  label: 'AI — رقم المادة الجبائية',   hint: 'مديرية الضرائب' },
            ].map(({ key, label, hint, maxLen }) => (
              <div className="fg" key={key}>
                <label className="req">{label}</label>
                <input
                  value={(form as Record<string, string>)[key]}
                  onChange={e => set(key, e.target.value)}
                  style={{ fontFamily: 'monospace' }}
                  maxLength={maxLen}
                />
                <span style={{ fontSize: 10, color: 'var(--t4)' }}>{hint}</span>
              </div>
            ))}
            <div className="fg s2">
              <label className="req">RC — السجل التجاري</label>
              <input value={form.rc} onChange={e => set('rc', e.target.value)} style={{ fontFamily: 'monospace' }} />
              <span style={{ fontSize: 10, color: 'var(--t4)' }}>المركز الوطني للسجل التجاري CNRC</span>
            </div>
            <div className="fg">
              <label>البنك الرئيسي</label>
              <select value={form.bank} onChange={e => set('bank', e.target.value)}>
                {['BNA', 'BEA', 'CPA', 'BADR', 'BDL', 'CNEP', 'AGB', 'ABC', 'Société Générale'].map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div className="fg s3">
              <label>رقم الحساب البنكي RIB/IBAN</label>
              <input value={form.rib} onChange={e => set('rib', e.target.value)} placeholder="00799999000XXXXXXXX00" style={{ fontFamily: 'monospace' }} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
            <SaveBtn onClick={() => {}} />
          </div>
        </Card>
      </div>

      {/* Right column — Logo & preview */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Card title={<><span className="ic ic-sm" style={{ color: 'var(--purple)' }}><i className="ti ti-photo"/></span> الشعار والهوية</>}>
          <div style={{ border: '2px dashed var(--b3)', borderRadius: 'var(--r3)', padding: 24, textAlign: 'center', cursor: 'pointer', transition: '.2s', marginBottom: 12 }}
            onClick={() => document.getElementById('logo-upload')?.click()}>
            <div style={{ fontSize: 36, opacity: 0.2, marginBottom: 8 }}><i className="ti ti-photo"/></div>
            <div style={{ fontSize: 13, color: 'var(--t4)', fontWeight: 600 }}>اضغط لرفع الشعار</div>
            <div style={{ fontSize: 11, color: 'var(--t4)' }}>PNG, SVG — 400×400 بكسل</div>
            <input id="logo-upload" type="file" accept="image/*" style={{ display: 'none' }} />
          </div>
          <Button size="sm" fullWidth icon={<i className="ti ti-upload"/>}>رفع الشعار</Button>
        </Card>

        <Card title="معاينة رأس الفاتورة" noHeader={false}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, fontFamily: 'serif' }}>
            <div style={{ fontWeight: 900, fontSize: 16, color: '#0a8a5c', marginBottom: 4 }}>{form.name}</div>
            <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
              <div style={{ fontFamily: 'monospace' }}>NIF: {form.nif} | RC: {form.rc}</div>
              <div>{form.address}</div>
              <div>{form.phone1}{form.phone2 ? ` — ${form.phone2}` : ''}</div>
              {form.email && <div>{form.email}</div>}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── Fiscal Panel ──────────────────────────────────
function FiscalPanel() {
  const [priceMode, setPriceMode] = useState<'ht' | 'ttc'>('ttc');
  const [fiscalStamp, setFiscalStamp] = useState(true);
  const [autoG50, setAutoG50] = useState(true);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card title={<><span className="ic ic-sm" style={{ color: 'var(--gold)' }}><i className="ti ti-calculator"/></span> إعدادات TVA والأسعار</>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Price mode */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', display: 'block', marginBottom: 8 }}>
              وضع الأسعار الافتراضي
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                id="price-ht"
                className={`btn ${priceMode === 'ht' ? 'btn-p' : ''}`}
                onClick={() => setPriceMode('ht')}
              >
                HT — بدون TVA
              </button>
              <button
                id="price-ttc"
                className={`btn ${priceMode === 'ttc' ? 'btn-p' : ''}`}
                onClick={() => setPriceMode('ttc')}
              >
                TTC — شامل TVA
              </button>
            </div>
            <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 6 }}>
              يؤثر على طريقة إدخال وعرض الأسعار في جميع الصفحات
            </div>
          </div>

          {/* Fiscal stamp toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--bg3)', borderRadius: 'var(--r2)', border: '1px solid var(--b2)' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>الطابع الجبائي (Timbre Fiscal)</div>
              <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>تطبيق تلقائي وفق LF 2024 — 1% فوق 30,000 دج</div>
            </div>
            <Switch checked={fiscalStamp} onChange={setFiscalStamp} />
          </div>

          {/* Auto G50 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--bg3)', borderRadius: 'var(--r2)', border: '1px solid var(--b2)' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>الإقرار التلقائي G50</div>
              <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>حساب TVA الشهري تلقائياً وتنبيه قبل الاستحقاق</div>
            </div>
            <Switch checked={autoG50} onChange={setAutoG50} />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
          <SaveBtn onClick={() => {}} />
        </div>
      </Card>

      {/* TVA rates table */}
      <Card title={<><span className="ic ic-sm" style={{ color: 'var(--blue)' }}><i className="ti ti-percentage"/></span> معدلات TVA المطبّقة</>}>
        <div className="tw">
          <table>
            <thead><tr><th>الاسم</th><th>المعدل</th><th>الوضع الافتراضي</th><th>الحالة</th></tr></thead>
            <tbody>
              {[{ name: 'TVA 19%', rate: '19%', isDefault: true, active: true },
                { name: 'TVA 9%',  rate: '9%',  isDefault: false, active: true },
                { name: 'TVA 0%',  rate: '0%',  isDefault: false, active: true }].map(t => (
                <tr key={t.name}>
                  <td className="s">{t.name}</td>
                  <td className="m">{t.rate}</td>
                  <td>{t.isDefault ? <span style={{ color: 'var(--em)', fontSize: 13 }}><i className="ti ti-circle-check"/></span> : '—'}</td>
                  <td><span className="bx be">نشط</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ── Docs Panel ────────────────────────────────────
function DocsPanel() {
  return (
    <Card title={<><span className="ic ic-sm" style={{ color: 'var(--purple)' }}><i className="ti ti-file-description"/></span> أسماء ونماذج المستندات</>}>
      <div className="fgrid c2" style={{ gap: 12 }}>
        {[
          { label: 'فاتورة البيع',       code: 'FAC', id: 'doc-s1' },
          { label: 'عرض السعر',          code: 'DEV', id: 'doc-s2' },
          { label: 'وصل التسليم BL',     code: 'BL',  id: 'doc-s3' },
          { label: 'طلب شراء',           code: 'BC',  id: 'doc-s4' },
          { label: 'إشعار الإرجاع',      code: 'AV',  id: 'doc-s5' },
        ].map(({ label, code, id }) => (
          <div className="fg" key={id}>
            <label>{label} <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--t4)' }}>({code})</span></label>
            <input id={id} defaultValue={label} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
        <SaveBtn onClick={() => {}} />
      </div>
    </Card>
  );
}

// ── Numbering Panel ───────────────────────────────
function NumberingPanel() {
  return (
    <Card title={<><span className="ic ic-sm" style={{ color: 'var(--teal)' }}><i className="ti ti-list-numbers"/></span> سلاسل الترقيم التلقائي</>}>
      <div className="tw">
        <table>
          <thead><tr><th>المستند</th><th>البادئة</th><th>الصيغة</th><th>آخر رقم</th><th>السنة</th><th></th></tr></thead>
          <tbody>
            {[
              { doc: 'فاتورة البيع', prefix: 'INV', format: '{PREFIX}-{YYYY}-{NUMBER:6}', last: '342', year: '2024' },
              { doc: 'عرض السعر',   prefix: 'DEV', format: '{PREFIX}-{YYYY}-{NUMBER:6}', last: '28',  year: '2024' },
              { doc: 'وصل التسليم', prefix: 'BL',  format: '{PREFIX}-{YYYY}-{NUMBER:6}', last: '156', year: '2024' },
            ].map(r => (
              <tr key={r.doc}>
                <td className="s">{r.doc}</td>
                <td><span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: 'var(--em)' }}>{r.prefix}</span></td>
                <td className="m" style={{ fontSize: 11 }}>{r.format}</td>
                <td className="m">{r.last}</td>
                <td className="m">{r.year}</td>
                <td><Button size="xs" icon={<i className="ti ti-pencil"/>} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ── Print Panel ───────────────────────────────────
function PrintPanel() {
  const [showLogo, setShowLogo] = useState(true);
  const [showStamp, setShowStamp] = useState(true);
  const [showSign, setShowSign]   = useState(true);
  const [paperSize, setPaperSize] = useState('A4');

  return (
    <Card title={<><span className="ic ic-sm" style={{ color: 'var(--blue)' }}><i className="ti ti-printer"/></span> خيارات الطباعة</>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[
          { label: 'إظهار الشعار في المطبوعات',    checked: showLogo,   set: setShowLogo  },
          { label: 'إظهار خانة الختم والإمضاء',    checked: showStamp,  set: setShowStamp },
          { label: 'إظهار توقيع رقمي',              checked: showSign,   set: setShowSign  },
        ].map(({ label, checked, set }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg3)', borderRadius: 'var(--r2)', border: '1px solid var(--b2)' }}>
            <span style={{ fontSize: 13, color: 'var(--t2)' }}>{label}</span>
            <Switch checked={checked} onChange={set} />
          </div>
        ))}
        <div className="fg">
          <label>حجم الورق</label>
          <select value={paperSize} onChange={e => setPaperSize(e.target.value)} style={{ width: 140 }}>
            <option value="A4">A4</option>
            <option value="A5">A5</option>
            <option value="thermal">حراري 80mm</option>
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
        <SaveBtn onClick={() => {}} />
      </div>
    </Card>
  );
}

// ── Backup Panel ──────────────────────────────────
function BackupPanel() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card title={<><span className="ic ic-sm" style={{ color: 'var(--em)' }}><i className="ti ti-database-export"/></span> النسخ الاحتياطي</>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: 'تصدير قاعدة البيانات كاملة',   icon: 'ti-database', variant: 'primary' as const },
            { label: 'تصدير المنتجات (Excel)',        icon: 'ti-table',    variant: 'default' as const },
            { label: 'تصدير الفواتير (Excel/PDF)',   icon: 'ti-file-zip', variant: 'default' as const },
            { label: 'تصدير العملاء والموردين',      icon: 'ti-users',    variant: 'default' as const },
          ].map(({ label, icon, variant }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg3)', borderRadius: 'var(--r2)', border: '1px solid var(--b2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="ic ic-sm" style={{ color: 'var(--t3)' }}><i className={`ti ${icon}`}/></span>
                <span style={{ fontSize: 13, color: 'var(--t2)' }}>{label}</span>
              </div>
              <Button size="xs" variant={variant} icon={<i className="ti ti-download"/>}>تصدير</Button>
            </div>
          ))}
        </div>
      </Card>

      <Card title={<><span className="ic ic-sm" style={{ color: 'var(--gold)' }}><i className="ti ti-database-import"/></span> استيراد البيانات</>}>
        <div style={{ border: '2px dashed var(--b3)', borderRadius: 'var(--r3)', padding: 32, textAlign: 'center', cursor: 'pointer' }}>
          <div style={{ fontSize: 36, opacity: 0.15, marginBottom: 8 }}><i className="ti ti-cloud-upload"/></div>
          <div style={{ fontSize: 13, color: 'var(--t4)', fontWeight: 600 }}>اسحب ملف Excel أو اضغط لاستيراد</div>
          <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 4 }}>xlsx, csv</div>
        </div>
      </Card>
    </div>
  );
}
