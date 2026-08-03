// DataTable/__tests__/utils.spec.ts  —  v10.3
// ✅ اختبارات وحدة لدوال DataTable النقية (بدون DOM — بيئة node كباقي الاختبارات)
import { describe, it, expect } from 'vitest';
import type { Column, SortState, MultiSortState, AggregateType } from '../types';
import {
  getRawValue,
  getStringValue,
  encodeRange,
  decodeRange,
  applyClientFilter,
  applyGlobalSearch,
  applyClientSort,
  applyMultiSort,
  applyConditionalFormat,
  computeAggregate,
  buildPageNumbers,
  getTextAlign,
  formatDateShort,
  parseTSV,
} from '../utils';

type Row = { id: number; name: string; qty: number; price: number; active: boolean; address?: { city: string } };

const makeCols = (): Column<Row>[] => [
  { key: 'id', header: 'ID' },
  { key: 'name', header: 'الاسم', filter: { type: 'text' } },
  { key: 'qty', header: 'الكمية', filter: { type: 'number' } },
  { key: 'active', header: 'نشط', filter: { type: 'select', options: [{ value: 'true', label: 'نعم' }, { value: 'false', label: 'لا' }] } },
];

const rows: Row[] = [
  { id: 1, name: 'أحمد', qty: 10, price: 100, active: true, address: { city: 'الجزائر' } },
  { id: 2, name: 'محمد', qty: 25, price: 200, active: false, address: { city: 'وهران' } },
  { id: 3, name: 'سارة', qty: 5, price: 50, active: true, address: { city: 'الجزائر' } },
];

// ═══════════ getRawValue / getStringValue ═══════════
describe('getRawValue', () => {
  it('يعيد قيمة المفتاح المباشر', () => {
    const col: Column<Row> = { key: 'name', header: 'الاسم' };
    expect(getRawValue(rows[0], col)).toBe('أحمد');
  });

  it('يدعم accessor function', () => {
    const col: Column<Row> = { key: 'total', header: 'المجموع', accessor: r => r.qty * r.price };
    expect(getRawValue(rows[0], col)).toBe(1000);
  });

  it('يدعم dot-notation للمفاتيح المتداخلة', () => {
    const col: Column<Row> = { key: 'address.city', header: 'المدينة' };
    expect(getRawValue(rows[0], col)).toBe('الجزائر');
    expect(getRawValue({ id: 9, name: 'x', qty: 1, price: 1, active: false } as Row, col)).toBeUndefined();
  });

  it('يعيد undefined للمفتاح الغائب', () => {
    const col: Column<Row> = { key: 'missing', header: 'غائب' };
    expect(getRawValue(rows[0], col)).toBeUndefined();
  });
});

describe('getStringValue', () => {
  it('يحوّل القيمة إلى حروف صغيرة', () => {
    const col: Column<Row> = { key: 'name', header: 'الاسم' };
    expect(getStringValue(rows[0], col)).toBe('أحمد');
  });

  it('يعيد سلسلة فارغة للقيم null/undefined', () => {
    const col: Column<Row> = { key: 'missing', header: 'غائب' };
    expect(getStringValue(rows[0], col)).toBe('');
  });
});

// ═══════════ encodeRange / decodeRange ═══════════
describe('encodeRange / decodeRange', () => {
  it('يُرمِّز ويُفكِّك نطاق min|max', () => {
    expect(decodeRange(encodeRange('10', '50'))).toEqual({ min: '10', max: '50' });
  });

  it('يكتشف النطاق بدون فاصل |', () => {
    expect(decodeRange('30')).toEqual({ min: '30', max: '' });
  });
});

// ═══════════ applyClientSort ═══════════
describe('applyClientSort', () => {
  it('يعيد نفس المصفوفة عند غياب المفتاح/الاتجاه', () => {
    const empty: SortState = { key: null, dir: null };
    expect(applyClientSort(rows, empty, makeCols())).toEqual(rows);
  });

  it('يرتّب رقمياً تصاعدياً وتنازلياً', () => {
    const asc: SortState = { key: 'qty', dir: 'asc' };
    const desc: SortState = { key: 'qty', dir: 'desc' };
    expect(applyClientSort(rows, asc, makeCols()).map(r => r.qty)).toEqual([5, 10, 25]);
    expect(applyClientSort(rows, desc, makeCols()).map(r => r.qty)).toEqual([25, 10, 5]);
  });

  it('يرتّب نصياً بدون تعديل المصفوفة الأصلية', () => {
    const sort: SortState = { key: 'name', dir: 'asc' };
    const out = applyClientSort(rows, sort, makeCols());
    expect(out).not.toBe(rows);
    expect(out.length).toBe(3);
  });
});

// ═══════════ applyMultiSort ═══════════
describe('applyMultiSort', () => {
  it('فرز متعدد مع فرز ثانوي تنازلي', () => {
    const data: Row[] = [
      { id: 1, name: 'أ', qty: 5, price: 10, active: true },
      { id: 2, name: 'ب', qty: 5, price: 30, active: true },
      { id: 3, name: 'ج', qty: 2, price: 20, active: true },
    ];
    const cols: Column<Row>[] = [
      { key: 'qty', header: 'الكمية' },
      { key: 'price', header: 'السعر' },
    ];
    const sorts: MultiSortState = [
      { key: 'qty', dir: 'asc' },
      { key: 'price', dir: 'desc' },
    ];
    const out = applyMultiSort(data, sorts, cols);
    expect(out.map(r => r.id)).toEqual([3, 2, 1]);
  });

  it('يعيد المصفوفة كما هي عند عدم وجود فرز', () => {
    expect(applyMultiSort(rows, [], makeCols())).toEqual(rows);
  });
});

// ═══════════ applyClientFilter ═══════════
describe('applyClientFilter', () => {
  it('لا يفلتر بدون فلاتر نشطة', () => {
    expect(applyClientFilter(rows, {}, makeCols())).toEqual(rows);
  });

  it('فلتر text مع مشغّل contains', () => {
    const out = applyClientFilter(rows, { name: 'contains:أحم' }, makeCols());
    expect(out.map(r => r.id)).toEqual([1]);
  });

  it('فلتر select بالمطابقة التامة', () => {
    const out = applyClientFilter(rows, { active: 'false' }, makeCols());
    expect(out.map(r => r.id)).toEqual([2]);
  });

  it('فلتر number بنطاق min|max', () => {
    const out = applyClientFilter(rows, { qty: '6|20' }, makeCols());
    expect(out.map(r => r.id)).toEqual([1]);
  });

  it('فلتر number بنطاق يشمل الحواف', () => {
    const out = applyClientFilter(rows, { qty: '5|25' }, makeCols());
    expect(out.map(r => r.id)).toEqual([1, 2, 3]);
  });

  it('فلتر number بمشغّل gt من SmartFilter', () => {
    const out = applyClientFilter(rows, { qty: 'gt:9' }, makeCols());
    expect(out.map(r => r.id)).toEqual([1, 2]);
  });

  it('فلتر date بنطاق', () => {
    type DateRow = { id: number; d: string };
    const dateRows: DateRow[] = [
      { id: 1, d: '2026-06-10' },
      { id: 2, d: '2026-07-15' },
      { id: 3, d: '2026-08-20' },
    ];
    const cols: Column<DateRow>[] = [
      { key: 'id', header: 'ID' },
      { key: 'd', header: 'التاريخ', filter: { type: 'date' } },
    ];
    const out = applyClientFilter(dateRows, { d: '2026-06-01|2026-07-31' }, cols);
    expect(out.map(r => r.id)).toEqual([1, 2]);
  });

  it('يدعم حقلاً غير موجود كعمود عبر dot-notation', () => {
    const out = applyClientFilter(rows, { 'address.city': 'contains:الجزائر' }, makeCols());
    expect(out.map(r => r.id)).toEqual([1, 3]);
  });

  it('يدعم مشغّلي eq/neq/starts/ends', () => {
    expect(applyClientFilter(rows, { name: 'eq:محمد' }, makeCols()).map(r => r.id)).toEqual([2]);
    expect(applyClientFilter(rows, { name: 'neq:محمد' }, makeCols()).map(r => r.id)).toEqual([1, 3]);
    expect(applyClientFilter(rows, { name: 'starts:س' }, makeCols()).map(r => r.id)).toEqual([3]);
    expect(applyClientFilter(rows, { name: 'ends:حمد' }, makeCols()).map(r => r.id)).toEqual([1, 2]);
  });
});

// ═══════════ applyGlobalSearch ═══════════
describe('applyGlobalSearch', () => {
  it('يبحث عبر كل الأعمدة القابلة للبحث', () => {
    expect(applyGlobalSearch(rows, 'محمد', makeCols()).map(r => r.id)).toEqual([2]);
  });

  it('يتجاهل استعلاماً فارغاً أو مسافات', () => {
    expect(applyGlobalSearch(rows, '   ', makeCols())).toEqual(rows);
  });

  it('يستبعد الأعمدة بـ searchable:false', () => {
    const cols: Column<Row>[] = [
      { key: 'id', header: 'ID', searchable: false },
      { key: 'name', header: 'الاسم' },
    ];
    // id لا يُبحث — '2' لا يطابق أي اسم
    expect(applyGlobalSearch(rows, '2', cols).length).toBe(0);
  });
});

// ═══════════ applyConditionalFormat ═══════════
describe('applyConditionalFormat', () => {
  it('يطبّق التنسيق عند تحقّق الشرط وعدم تطابقه عند عدم تحققه', () => {
    const low = applyConditionalFormat(5, rows[2], 'qty', [
      { colKey: 'qty', condition: v => (v as number) < 10, className: 'low', style: { color: 'red' } },
    ]);
    expect(low.className).toBe('low');
    expect(low.style.color).toBe('red');

    const high = applyConditionalFormat(25, rows[1], 'qty', [
      { colKey: 'qty', condition: v => (v as number) < 10, className: 'low' },
    ]);
    expect(high.className).toBe('');
  });

  it('يدعم colKey عام "*" لجميع الأعمدة', () => {
    const out = applyConditionalFormat(25, rows[1], 'qty', [
      { colKey: '*', condition: () => true, className: 'all' },
    ]);
    expect(out.className).toBe('all');
  });

  it('يدمج الأنماط من عدة تنسيقات', () => {
    const out = applyConditionalFormat(5, rows[2], 'qty', [
      { colKey: 'qty', condition: () => true, style: { color: 'red' } },
      { colKey: 'qty', condition: () => true, style: { fontWeight: 'bold' } },
    ]);
    expect(out.style).toMatchObject({ color: 'red', fontWeight: 'bold' });
  });
});

// ═══════════ computeAggregate ═══════════
describe('computeAggregate', () => {
  const qtyCol: Column<Row> = { key: 'qty', header: 'q' };
  const types: AggregateType[] = ['sum', 'avg', 'min', 'max', 'count'];

  it('يحسب sum/avg/min/max/count', () => {
    const nums = rows.map(r => r.qty);
    expect(computeAggregate(rows, qtyCol, 'sum')).toBe(nums.reduce((a, b) => a + b, 0));
    expect(computeAggregate(rows, qtyCol, 'avg')).toBe((10 + 25 + 5) / 3);
    expect(computeAggregate(rows, qtyCol, 'min')).toBe(5);
    expect(computeAggregate(rows, qtyCol, 'max')).toBe(25);
    expect(computeAggregate(rows, qtyCol, 'count')).toBe(3);
  });

  it('يعيد null عند عدم وجود قيم رقمية', () => {
    const empty: Row[] = [];
    for (const t of types) expect(computeAggregate(empty, qtyCol, t)).toBeNull();
  });
});

// ═══════════ buildPageNumbers ═══════════
describe('buildPageNumbers', () => {
  it('يعيد كل الصفحات عندما تكون ≤ 7', () => {
    expect(buildPageNumbers(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('يعيد نقاط الحذف في المنتصف', () => {
    expect(buildPageNumbers(5, 10)).toEqual([1, '…', 4, 5, 6, '…', 10]);
  });

  it('يتعامل مع صفحة واحدة', () => {
    expect(buildPageNumbers(1, 1)).toEqual([1]);
  });
});

// ═══════════ getTextAlign ═══════════
describe('getTextAlign', () => {
  it('يعكس المحاذاة لـ RTL', () => {
    expect(getTextAlign('start')).toBe('right');
    expect(getTextAlign('center')).toBe('center');
    expect(getTextAlign('end')).toBe('left');
    expect(getTextAlign(undefined)).toBe('right');
  });
});

// ═══════════ formatDateShort ═══════════
describe('formatDateShort', () => {
  it('يحوّل ISO إلى صيغة YYYY-MM-DD', () => {
    expect(formatDateShort('2026-06-07T23:00:00.000000Z')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('يتعامل مع null/undefined/فارغ', () => {
    expect(formatDateShort(null)).toBe('');
    expect(formatDateShort(undefined)).toBe('');
  });

  it('يعيد القيمة الخام إذا لم تكن تاريخاً صالحاً', () => {
    expect(formatDateShort('not-a-date')).toBe('not-a-date');
  });
});

// ═══════════ parseTSV ═══════════
describe('parseTSV', () => {
  it('يفسّر الصفوف المفصولة بتبويب', () => {
    expect(parseTSV('a\tb\tc\n1\t2\t3')).toEqual([['a', 'b', 'c'], ['1', '2', '3']]);
  });

  it('يفسّر CSV مع علامات اقتباس واقتباس مهرّب', () => {
    expect(parseTSV('"الاسم","الملاحظة"\n"أحمد","قال ""مرحباً"""')).toEqual([
      ['الاسم', 'الملاحظة'],
      ['أحمد', 'قال "مرحباً"'],
    ]);
  });

  it('يتجاهل الأسطر الفارغة', () => {
    expect(parseTSV('a\tb\n\n\nc\td')).toEqual([['a', 'b'], ['c', 'd']]);
  });
});
