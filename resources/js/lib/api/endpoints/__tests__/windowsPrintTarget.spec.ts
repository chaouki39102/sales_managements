// ════════════════════════════════════════════════════════════════════════════
// windowsPrintTarget.spec.ts — اختبارات resolveWindowsTarget والمساعدة للطابعة
// (حلقة: مُتذكَّر ← طابعة مُسجَّلة ← قائمة النظام ← thermal ← الافتراضي ← أول).
// plugin النظام systemPrintersApi.list مقلَّد فقط؛ وحدة windowsPrintTarget الحقيقية
// تعمل مع طبقة localStorage مقلَّدة (بيئة vitest node لا توفرها).
// ════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  resolveWindowsTarget,
  readRememberedTarget,
  writeRememberedTarget,
  clearRememberedTarget,
  bytesToBase64,
  utf8Base64,
  THERMAL_RE,
} from '../windowsPrintTarget';

const listMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api/endpoints/systemPrinters', () => ({
  systemPrintersApi: { list: listMock },
}));

const ls = new Map<string, string>();
const fakeStorage: Storage = {
  getItem: (k: string) => (ls.has(k) ? ls.get(k)! : null),
  setItem: (k: string, v: string) => {
    ls.set(k, String(v));
  },
  removeItem: (k: string) => {
    ls.delete(k);
  },
  clear: () => ls.clear(),
  key: (i: number) => Array.from(ls.keys())[i] ?? null,
  get length() {
    return ls.size;
  },
} as unknown as Storage;
(globalThis as any).localStorage = fakeStorage;

const A4 = 'Canon MF3010 (Copie 1)';
const THERMAL = 'EPSON TM-T20';

function list(...printers: Array<{ name: string; is_default?: boolean }>): void {
  listMock.mockResolvedValue({ printers, platform: 'win32', error: null });
}

describe('resolveWindowsTarget', () => {
  beforeEach(() => {
    ls.clear();
    listMock.mockClear();
    listMock.mockResolvedValue({ printers: [], platform: 'win32', error: null });
  });

  it('remembered target wins and no system call happens', async () => {
    writeRememberedTarget('company-a', A4);
    expect(await resolveWindowsTarget('company-a')).toBe(A4);
    expect(listMock).not.toHaveBeenCalled();
  });

  it('a slug-less call skips remembered/saved and uses the live list', async () => {
    list({ name: A4 });
    expect(await resolveWindowsTarget(null)).toBe(A4);
  });

  it('a registered system printer (device store) is used before the live list', async () => {
    ls.set(
      'print:printers:company-a',
      JSON.stringify([{ id: 's1', name: A4, isDefault: true, source: 'system' }]),
    );
    expect(await resolveWindowsTarget('company-a')).toBe(A4);
    expect(listMock).not.toHaveBeenCalled();
  });

  it('a thermal-looking name beats the Windows default', async () => {
    list({ name: A4, is_default: true }, { name: THERMAL });
    expect(await resolveWindowsTarget('company-a')).toBe(THERMAL);
  });

  it('falls back to the Windows default when nothing looks thermal', async () => {
    list({ name: 'Microsoft Print to PDF', is_default: false }, { name: A4, is_default: true });
    expect(await resolveWindowsTarget('company-a')).toBe(A4);
  });

  it('falls back to the first printer when no default exists', async () => {
    list({ name: A4 }, { name: 'Microsoft Print to PDF' });
    expect(await resolveWindowsTarget('company-a')).toBe(A4);
  });

  it('returns null for an empty printer list', async () => {
    expect(await resolveWindowsTarget('company-a')).toBeNull();
  });

  it('returns null when the live list call fails', async () => {
    listMock.mockRejectedValue(new Error('down'));
    expect(await resolveWindowsTarget('company-a')).toBeNull();
  });

  it('ignores corrupted localStorage without throwing', async () => {
    ls.set('print:win-target:company-a', '');
    ls.set('print:printers:company-a', '{not json');
    list({ name: A4 });
    expect(await resolveWindowsTarget('company-a')).toBe(A4);
  });

  it('EMPTY remembered name falls through to the saved/list targets', async () => {
    ls.set('print:win-target:company-a', '');
    list({ name: A4 });
    expect(await resolveWindowsTarget('company-a')).toBe(A4);
  });
});

describe('remembered target helpers', () => {
  it('readRememberedTarget requires a slug', () => {
    expect(readRememberedTarget(null)).toBeNull();
    expect(readRememberedTarget(undefined)).toBeNull();
  });

  it('clearRememberedTarget removes only that slug key', () => {
    writeRememberedTarget('company-a', A4);
    writeRememberedTarget('company-b', THERMAL);
    clearRememberedTarget('company-a');
    expect(readRememberedTarget('company-a')).toBeNull();
    expect(readRememberedTarget('company-b')).toBe(THERMAL);
  });
});

describe('base64 / regex helpers', () => {
  it('utf8Base64 round-trips UTF-8 (Arabic)', () => {
    const s = 'مرحبا بالعالم';
    expect(utf8Base64(s)).toBe(Buffer.from(s, 'utf8').toString('base64'));
  });

  it('bytesToBase64 round-trips binary', () => {
    const bytes = new Uint8Array([0x1b, 0x40, 0xff, 0x00, 0x12]);
    expect(bytesToBase64(bytes)).toBe(Buffer.from(bytes).toString('base64'));
  });

  it('THERMAL_RE matches receipt-printer names but not an A4 laser', () => {
    expect(THERMAL_RE.test(THERMAL)).toBe(true);
    expect(THERMAL_RE.test('POS-80 thermal printer')).toBe(true);
    expect(THERMAL_RE.test(A4)).toBe(false);
  });
});