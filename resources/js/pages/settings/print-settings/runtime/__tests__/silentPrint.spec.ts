// ════════════════════════════════════════════════════════════════════════════
// silentPrint.spec.ts — اختبارات trySilentPrintDocument (مسار الطباعة الصامتة
// A4/A5 على ويندوز). جميع الاعتماديات مقلَّدة: اختيار الطابعة، توليد HTML،
// و POST /system/printers/html — فلا يوجد localStorage ولا شيفرة ثقيلة.
// ════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PrintTemplate } from '@/pages/settings/print-settings/types';
import { trySilentPrintDocument } from '../silentPrint';
import type { PipelineSource } from '../UniversalPrintPipeline';

const mocks = vi.hoisted(() => ({
  resolveWindowsTarget: vi.fn(),
  writeRememberedTarget: vi.fn(),
  utf8Base64: vi.fn((s: string) => `b64:${s}`),
  html: vi.fn(),
  renderPreviewToHtml: vi.fn(),
}));

vi.mock('@/lib/api/endpoints/windowsPrintTarget', () => ({
  resolveWindowsTarget: mocks.resolveWindowsTarget,
  writeRememberedTarget: mocks.writeRememberedTarget,
  utf8Base64: mocks.utf8Base64,
}));

vi.mock('@/lib/api/endpoints/systemPrinters', () => ({
  systemPrintersApi: { html: mocks.html },
}));

vi.mock('../renderPreviewToHtml', () => ({
  renderPreviewToHtml: mocks.renderPreviewToHtml,
}));

const tpl = (paper_size: string): PrintTemplate =>
  ({ paper_size } as unknown as PrintTemplate);

const source = {} as unknown as PipelineSource;

describe('trySilentPrintDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.renderPreviewToHtml.mockResolvedValue('<html>ok</html>');
    mocks.html.mockResolvedValue({ printed: true });
  });

  it('rejects non-physical paper (80mm) without touching target/html', async () => {
    const res = await trySilentPrintDocument({
      template: tpl('80mm'),
      company: null,
      source,
      slug: 'company-a',
    });
    expect(res).toEqual({
      ok: false,
      reason: 'unsupported-paper',
      message: 'الطباعة الصامتة مدعومة فقط لأحجام A4/A5',
    });
    expect(mocks.resolveWindowsTarget).not.toHaveBeenCalled();
    expect(mocks.renderPreviewToHtml).not.toHaveBeenCalled();
    expect(mocks.html).not.toHaveBeenCalled();
    expect(mocks.writeRememberedTarget).not.toHaveBeenCalled();
  });

  it('rejects sticker paper (STK) as unsupported', async () => {
    const res = await trySilentPrintDocument({
      template: tpl('STK'),
      company: null,
      source,
      slug: 'company-a',
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe('unsupported-paper');
  });

  it('returns a no-target message when no Windows printer resolves', async () => {
    mocks.resolveWindowsTarget.mockResolvedValue(null);
    const res = await trySilentPrintDocument({
      template: tpl('A4'),
      company: null,
      source,
      slug: 'company-a',
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe('no-target');
      expect(res.message).toContain('لا توجد طابعة ويندوز');
    }
    expect(mocks.html).not.toHaveBeenCalled();
    expect(mocks.writeRememberedTarget).not.toHaveBeenCalled();
  });

  it('renders html, POSTs base64 with copies, and remembers the target', async () => {
    mocks.resolveWindowsTarget.mockResolvedValue('Canon MF3010 (Copie 1)');
    const res = await trySilentPrintDocument({
      template: tpl('A4'),
      company: null,
      source,
      slug: 'company-a',
      copies: 2,
    });
    expect(res).toEqual({ ok: true, printer: 'Canon MF3010 (Copie 1)' });
    expect(mocks.renderPreviewToHtml).toHaveBeenCalledWith({
      template: expect.objectContaining({ paper_size: 'A4' }),
      company: null,
      source,
    });
    expect(mocks.html).toHaveBeenCalledWith(
      'Canon MF3010 (Copie 1)',
      'b64:<html>ok</html>',
      2,
    );
    expect(mocks.writeRememberedTarget).toHaveBeenCalledWith(
      'company-a',
      'Canon MF3010 (Copie 1)',
    );
  });

  it('defaults copies to 1 (A5 is supported)', async () => {
    mocks.resolveWindowsTarget.mockResolvedValue('Canon MF3010 (Copie 1)');
    await trySilentPrintDocument({
      template: tpl('A5'),
      company: null,
      source,
      slug: 'company-a',
    });
    expect(mocks.html).toHaveBeenCalledWith(
      'Canon MF3010 (Copie 1)',
      'b64:<html>ok</html>',
      1,
    );
  });

  it('surfaces the server error message and does not remember on failure', async () => {
    mocks.resolveWindowsTarget.mockResolvedValue('Canon MF3010 (Copie 1)');
    mocks.html.mockRejectedValue({
      response: {
        data: { message: 'الطابعة غير موجودة في قائمة طابعات النظام.' },
      },
    });
    const res = await trySilentPrintDocument({
      template: tpl('A4'),
      company: null,
      source,
      slug: 'company-a',
    });
    expect(res).toEqual({
      ok: false,
      reason: 'error',
      message: 'الطابعة غير موجودة في قائمة طابعات النظام.',
    });
    expect(mocks.writeRememberedTarget).not.toHaveBeenCalled();
  });

  it('falls back to err.message when there is no response payload', async () => {
    mocks.resolveWindowsTarget.mockResolvedValue('Canon MF3010 (Copie 1)');
    mocks.html.mockRejectedValue(new Error('boom'));
    const res = await trySilentPrintDocument({
      template: tpl('A4'),
      company: null,
      source,
      slug: 'company-a',
    });
    expect(res).toEqual({ ok: false, reason: 'error', message: 'boom' });
  });
});