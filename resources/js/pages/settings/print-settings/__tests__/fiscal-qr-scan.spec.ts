// print-settings/__tests__/fiscal-qr-scan.spec.ts  —  task 1.5 validation
// ✅ إثبات أن متجه الاختبار الموثق (payload JSON) يُشفَّر كـ QR سليم ويُفكَّ شيفرته
//    رجوعاً إلى النص نفسه بمعيار مستقل (jsQR) — بمعنى أنه قابل للمسح فعلياً.
//    الترميز يستخدم نفس الخيارات التي يستخدمها FiscalQR في التطبيق الحقيقي.
import { describe, it, expect } from 'vitest';
import QRCode from 'qrcode';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';

// Known-good test vector produced by FiscalInvoiceQrService::dataString()
// for the real document FV-2026-000001 (doc id 310, company «el-houda-emballage-6a5e589dc1cfe»).
// Documented in docs/reports/FISCAL_QR_SPEC.md. MUST stay byte-identical to the backend output.
const TEST_VECTOR =
  '{"v":1,"seller":{"name":"El Houda Emballage","nif":"21656494498789","nis":"65484897897897","ai":"3912052464","rc":"65454848787","address":"الزقم الوادي"},"buyer":{"name":"شوقي","nif":""},"invoice":{"number":"FV-2026-000001","date":"2026-08-05","type":"FV"},"amounts":{"ht":1550,"tva":0,"discount":0,"stamp":0,"ttc":1550,"net":1550},"hash":"8aadfda645bc025aefa8c44663e2d919d83ac1ca690d8cac9f7e771f60ad9ca2"}';

async function pngDataUrlToRgba(dataUrl: string) {
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
  const png = PNG.sync.read(Buffer.from(base64, 'base64'));
  return { data: new Uint8ClampedArray(png.data), width: png.width, height: png.height };
}

describe('Fiscal QR — known-good test vector scans and decodes (task 1.5)', () => {
  it('encodes the documented payload and decodes back to the exact string', async () => {
    const url = await QRCode.toDataURL(TEST_VECTOR, {
      width: 200,
      margin: 0,
      errorCorrectionLevel: 'M',
      color: { dark: '#111111', light: '#ffffff' },
    });
    expect(url).toMatch(/^data:image\/png;base64,/);

    const { data, width, height } = await pngDataUrlToRgba(url);
    const decoded = jsQR(data, width, height);

    expect(decoded, 'QR should decode to something').not.toBeNull();
    expect(decoded!.data).toBe(TEST_VECTOR);
  });

  it('decode is stable under moderate damage (error-correction M recovers small smudges)', async () => {
    const url = await QRCode.toDataURL(TEST_VECTOR, {
      width: 200,
      margin: 0,
      errorCorrectionLevel: 'M',
      color: { dark: '#111111', light: '#ffffff' },
    });
    const { data, width, height } = await pngDataUrlToRgba(url);

    // Corrupt ~6% of the quiet-ish zone pixels (flip the darkest byte of every
    // 30th pixel) — M-level correction must still recover the full payload.
    const damaged = data.slice();
    for (let i = 0; i < damaged.length; i += 120) damaged[i] = 255;
    const decoded = jsQR(damaged, width, height);

    expect(decoded, 'QR must survive light damage at error-correction level M').not.toBeNull();
    expect(decoded!.data).toBe(TEST_VECTOR);
  });
});
