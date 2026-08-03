// DataTable/__tests__/Sparkline.spec.ts  —  v10.4
// ✅ اختبارات لمكوّن Sparkline (SVG مصغّر) عبر renderToStaticMarkup — بدون DOM
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Sparkline } from '../Sparkline';

describe('Sparkline', () => {
  it('يعيد null عند بيانات فارغة', () => {
    const html = renderToStaticMarkup(<Sparkline data={[]} />);
    expect(html).toBe('');
  });

  it('يعيد polyline لنوع line', () => {
    const html = renderToStaticMarkup(<Sparkline data={[1, 5, 3, 8, 2]} type="line" />);
    expect(html).toContain('<polyline');
    expect(html).toContain('points=');
    expect(html).toContain('role="img"');
  });

  it('يعيد polygon + polyline لنوع area (بمعاملات default)', () => {
    const html = renderToStaticMarkup(<Sparkline data={[1, 5, 3, 8, 2]} type="area" />);
    expect(html).toContain('<polygon');
    expect(html).toContain('<polyline');
    expect(html).toContain('<linearGradient');
  });

  it('يعيد rect لكل قيمة لنوع bar', () => {
    const data = [3, 6, 2, 9];
    const html = renderToStaticMarkup(<Sparkline data={data} type="bar" />);
    const rectCount = (html.match(/<rect/g) ?? []).length;
    expect(rectCount).toBe(data.length);
  });

  it('لا ينقسم عند min === max (نطاق صفري)', () => {
    const html = renderToStaticMarkup(<Sparkline data={[7, 7, 7]} type="line" />);
    expect(html).toContain('<polyline');
  });

  it('يعمل بقيمة واحدة (بلا تقسيم على صفر)', () => {
    const html = renderToStaticMarkup(<Sparkline data={[4]} type="line" />);
    expect(html).toContain('<polyline');
  });

  it('يحترم min/max صريحين', () => {
    const html = renderToStaticMarkup(
      <Sparkline data={[10, 20, 30]} min={0} max={100} width={50} height={20} />,
    );
    expect(html).toContain('width="50"');
    expect(html).toContain('height="20"');
  });

  it('يحترم الألوان المخصصة', () => {
    const html = renderToStaticMarkup(
      <Sparkline data={[1, 2, 3]} type="area" stroke="rgb(10,20,30)" fill="#ff0000" />,
    );
    expect(html).toContain('stroke="rgb(10,20,30)"');
    expect(html).toContain('stop-color="#ff0000"');
  });
});
