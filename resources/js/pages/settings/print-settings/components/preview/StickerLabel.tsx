import React from 'react';
import type { PrintTemplate } from '../../types';
import type { UniversalDocumentData } from '../../types/data';
import { printFieldResolver } from '../../services';
import { fontFamily, borderStyle } from './shared';
import { renderLogo } from './LogoRenderer';

const CODE39_REF = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%'.split('');
const CODE39_PATTERNS = [
  '101000111011101','111010001010111','101110001010111','111011100010101',
  '101000111010111','111010001110101','101110001110101','101000101110111',
  '111010001011101','101110001011101','111010100010111','101110100010111',
  '111011101000101','101011100010111','111010111000101','101110111000101',
  '101010001110111','111010100011101','101110100011101','101011100011101',
  '111010101000111','101110101000111','111011101010001','101011101000111',
  '111010111010001','101110111010001','101010111000111','111010101110001',
  '101110101110001','101011101110001','111000101010111','100011101010111',
  '111000111010101','100010111010111','111000101110101','100011101110101',
  '100010101110111','111000101011101','100011101011101','100010001000101',
  '100010001010001','100010100010001','101000100010001',
];
const CODE39_EDGE = '100010111011101';
const CODE39_MAP: Record<string, string> = {};
CODE39_REF.forEach((ch, i) => { CODE39_MAP[ch] = CODE39_PATTERNS[i]; });

function encodeCode39(raw: string): string {
  const code = String(raw ?? '').toUpperCase();
  const parts: string[] = [CODE39_EDGE];
  for (const ch of code) {
    if (CODE39_MAP[ch]) parts.push(CODE39_MAP[ch]);
  }
  parts.push(CODE39_EDGE);
  return parts.join('0');
}

interface BarcodeBar { x: number; width: number; }

function buildBarcodeBars(value: string): { bars: BarcodeBar[]; totalWidth: number } {
  const pattern = encodeCode39(value);
  const bars: BarcodeBar[] = [];
  let x = 0;
  let i = 0;
  while (i < pattern.length) {
    const bit = pattern[i];
    const start = i;
    while (i < pattern.length && pattern[i] === bit) i++;
    const width = (i - start) * 0.3;
    if (bit === '1') bars.push({ x, width });
    x += width;
  }
  return { bars, totalWidth: x };
}

const LABEL_MM = 400;
const LABEL_MM_H = 200;
const LABEL_PX = 1512;
const LABEL_PX_H = 756;

function StickerLabel({ tpl, data }: { tpl: PrintTemplate; data: UniversalDocumentData }) {
  const product = data.lines[0] || {};
  const companyName = tpl.company_name_text || (printFieldResolver.resolve('company.name', data, tpl) as string) || '';
  const productName = (product.name || '') as string;
  const barcodeValue = (product.barcode || '') as string;
  const price = product.unitPriceTtc ?? product.unitPriceHt ?? 0;
  const ref = (product.ref || '') as string;
  const pricePrefix = tpl.label_price_prefix || '';
  const priceText = tpl.label_price_text || 'DA';
  const isNumber = typeof price === 'number' && Number.isFinite(price);
  const displayPrice = isNumber ? price.toFixed(2) : String(price ?? '0.00');

  const barcode = tpl.show_label_barcode && barcodeValue ? buildBarcodeBars(barcodeValue) : null;

  const pad = (tpl.margin_sides ?? 8);
  const padT = (tpl.margin_top ?? 6);
  const padB = (tpl.margin_bottom ?? 6);
  const ff = fontFamily(tpl.font_family);

  const bs = tpl.label_border_style || 'solid';
  const bw = tpl.label_border_width ?? 1;
  const bc = tpl.label_border_color || '#333';
  const br = tpl.label_border_radius ?? 4;

  return (
    <div style={{
      width: LABEL_PX - pad * 2,
      height: LABEL_PX_H - padT - padB,
      direction: 'rtl',
      fontFamily: ff,
      fontSize: tpl.base_font_size ?? 12,
      padding: `${padT}px ${pad}px ${padB}px`,
      border: bw > 0 ? `${bw}px ${borderStyle(bs)} ${bc}` : 'none',
      borderRadius: br,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
      textAlign: 'center',
      boxSizing: 'border-box',
      overflow: 'hidden',
    }}>
      {/* Logo */}
      {tpl.show_logo && renderLogo(tpl, data)}

      {/* Company Name */}
      {tpl.show_company_name && companyName && (
        <div style={{
          fontSize: tpl.company_name_size ?? 14,
          fontWeight: tpl.company_name_bold ? 700 : 400,
          color: tpl.company_name_color || '#111',
          lineHeight: 1.2,
        }}>
          {companyName}
        </div>
      )}

      {/* Separator */}
      {tpl.header_separator !== 'none' && (
        <div style={{
          width: '60%', height: 1,
          background: tpl.header_separator === 'dashed' ? 'transparent' : '#ccc',
          borderTop: tpl.header_separator === 'dashed' ? '1px dashed #ccc' : 'none',
          margin: '2px 0',
        }} />
      )}

      {/* Product Name */}
      {tpl.show_label_product_name && productName && (
        <div style={{
          fontSize: tpl.label_product_name_size ?? 16,
          fontWeight: tpl.label_product_name_bold ? 700 : 400,
          color: tpl.label_product_name_color || '#111',
          lineHeight: 1.25,
          padding: '0 10px',
          maxHeight: 60,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {productName}
        </div>
      )}

      {/* Reference */}
      {tpl.show_label_ref && ref && (
        <div style={{
          fontSize: tpl.label_ref_size ?? 9,
          color: tpl.label_ref_color || '#666',
        }}>
          {ref}
        </div>
      )}

      {/* Barcode */}
      {barcode && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          margin: '3px 0',
        }}>
          <svg
            width={`${barcode.totalWidth.toFixed(2)}px`}
            height={tpl.label_barcode_height ?? 40}
            viewBox={`0 0 ${barcode.totalWidth.toFixed(2)} ${tpl.label_barcode_height ?? 40}`}
            style={{ direction: 'ltr', display: 'block' }}
          >
            {barcode.bars.map((bar, i) => (
              <rect key={i} x={bar.x} y={0} width={bar.width} height={tpl.label_barcode_height ?? 40} fill="#111" />
            ))}
          </svg>
          <div style={{
            fontFamily: "'Courier New', monospace",
            fontSize: 10, letterSpacing: 1.5, color: '#666', direction: 'ltr',
          }}>
            {barcodeValue}
          </div>
        </div>
      )}

      {/* Price */}
      {tpl.show_label_price && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          {pricePrefix && (
            <span style={{
              fontSize: Math.max(12, (tpl.label_price_size ?? 24) * 0.5),
              color: tpl.label_price_color || '#c0392b',
            }}>
              {pricePrefix}
            </span>
          )}
          <span style={{
            fontSize: tpl.label_price_size ?? 24,
            fontWeight: tpl.label_price_bold ? 800 : 500,
            color: tpl.label_price_color || '#c0392b',
            lineHeight: 1.1,
            direction: 'ltr',
          }}>
            {displayPrice}
          </span>
          <span style={{
            fontSize: Math.max(10, (tpl.label_price_size ?? 24) * 0.45),
            color: tpl.label_price_color || '#c0392b',
            fontWeight: 600,
          }}>
            {priceText}
          </span>
        </div>
      )}
    </div>
  );
}

export default React.memo(StickerLabel);
