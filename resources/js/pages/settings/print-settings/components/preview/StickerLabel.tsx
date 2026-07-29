import React from 'react';
import type { PrintTemplate } from '../../types';
import type { UniversalDocumentData } from '../../types/data';
import { printFieldResolver } from '../../services';
import { fontFamily, borderStyle } from './shared';
import { renderLogo } from './LogoRenderer';

// ─── Code 39 ────────────────────────────────────────────────────────────────

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

// ─── EAN-13 ─────────────────────────────────────────────────────────────────

const EAN_LPARITY: Record<string, string[]> = {
  '0': ['AAAAAA','ABABAB','ABBAAB','ABBBAA','BAABAB','BABAAB','BABBAA','ABABBA','ABBABA','ABBBAA'],
};
const EAN_A: Record<string, string> = {
  '0':'0001101','1':'0011001','2':'0010011','3':'0111101','4':'0100011',
  '5':'0110001','6':'0101111','7':'0111011','8':'0110111','9':'0001011',
};
const EAN_B: Record<string, string> = {
  '0':'0100111','1':'0110011','2':'0011011','3':'0100001','4':'0011101',
  '5':'0111001','6':'0000101','7':'0010001','8':'0001001','9':'0010111',
};
const EAN_C: Record<string, string> = {
  '0':'1110010','1':'1100110','2':'1101100','3':'1000010','4':'1011100',
  '5':'1001110','6':'1010000','7':'1000100','8':'1001000','9':'1110100',
};

function encodeEAN13(raw: string): string {
  const digits = String(raw ?? '').replace(/\D/g, '').slice(0, 13);
  if (digits.length < 13) return '';
  const first = digits[0];
  const left = digits.slice(1, 7);
  const right = digits.slice(7, 13);
  const parity = EAN_LPARITY['0']?.[Number(first)] ?? 'AAAAAA';
  let pattern = '101';
  for (let i = 0; i < 6; i++) {
    const table = parity[i] === 'A' ? EAN_A : EAN_B;
    pattern += table[left[i]] ?? '0001101';
  }
  pattern += '01010';
  for (let i = 0; i < 6; i++) {
    pattern += EAN_C[right[i]] ?? '1110010';
  }
  pattern += '101';
  return pattern;
}

// ─── Code 128B ──────────────────────────────────────────────────────────────

const C128_VALUES: Record<string, number> = {
  ' ':0,'!':1,'"':2,'#':3,'$':4,'%':5,'&':6,'\'':7,'(':8,')':9,'*':10,'+':11,',':12,'-':13,'.':14,'/':15,
  '0':16,'1':17,'2':18,'3':19,'4':20,'5':21,'6':22,'7':23,'8':24,'9':25,':':26,';':27,'<':28,'=':29,'>':30,'?':31,
  '@':32,'A':33,'B':34,'C':35,'D':36,'E':37,'F':38,'G':39,'H':40,'I':41,'J':42,'K':43,'L':44,'M':45,'N':46,'O':47,
  'P':48,'Q':49,'R':50,'S':51,'T':52,'U':53,'V':54,'W':55,'X':56,'Y':57,'Z':58,'[':59,'\\':60,']':61,'^':62,'_':63,
  '`':64,'a':65,'b':66,'c':67,'d':68,'e':69,'f':70,'g':71,'h':72,'i':73,'j':74,'k':75,'l':76,'m':77,'n':78,'o':79,
  'p':80,'q':81,'r':82,'s':83,'t':84,'u':85,'v':86,'w':87,'x':88,'y':89,'z':90,'{':91,'|':92,'}':93,'~':94,
};

const C128_PATTERNS = [
  '11011001100','11001101100','11001100110','10010011000','10010001100','10001001100','10011001000','10011000100',
  '10001100100','11001001000','11001000100','11000100100','10110011100','10011011100','10011001110','10111001100',
  '10011101100','10011100110','11001110010','11001011100','11001001110','11011100100','11001110100','11101101110',
  '11101001100','11100101100','11100100110','11101100100','11100110100','11100110010','11011011000','11011000110',
  '11000110110','10100011000','10001011000','10001000110','10110001000','10001101000','10001100010','11010001000',
  '11000101000','11000100010','10110111000','10110001110','10001101110','10111011000','10111000110','10001110110',
  '11101110110','11010001110','11000101110','11011101000','11011100010','11011101110','11101011000','11101000110',
  '11100010110','11101101000','11101100010','11100011010','11101111010','11001000010','11110001010','10100110000',
  '10100001100','10010110000','10010000110','10000101100','10000100110','10110010000','10110000100','10011010000',
  '10011000010','10000110100','10000110010','11000010010','11001010000','11110111010','11000010100','10001111010',
  '10100111100','10010111100','10010011110','10111100100','10011110100','10011110010','11110100100','11110010100',
  '11110010010','11011011110','11011110110','11110110110','10101111000','10100011110','10001011110','10111101000',
  '10111100010','11110101000','11110100010','10111011110','10111101110','11101011110','11110101110','11010000100',
  '11010010000','11010011100','1100011101011',
];

function encodeCode128(raw: string): string {
  const code = String(raw ?? '');
  if (!code) return '';
  let sum = 104;
  const bits: string[] = [C128_PATTERNS[104]];
  for (let i = 0; i < code.length; i++) {
    const v = C128_VALUES[code[i]];
    if (v === undefined) return '';
    sum += v * (i + 1);
    bits.push(C128_PATTERNS[v]);
  }
  bits.push(C128_PATTERNS[sum % 103]);
  bits.push(C128_PATTERNS[106]);
  return bits.join('');
}

// ─── Barcode builder dispatch ───────────────────────────────────────────────

interface BarcodeBar { x: number; width: number; }

function buildBarcode(value: string, format: string): { bars: BarcodeBar[]; totalWidth: number } | null {
  if (!value) return null;
  let pattern = '';
  if (format === 'ean13') {
    pattern = encodeEAN13(value);
  } else if (format === 'code128') {
    pattern = encodeCode128(value);
  } else {
    pattern = encodeCode39(value);
  }
  if (!pattern) return null;
  const bars: BarcodeBar[] = [];
  let x = 0;
  let i = 0;
  while (i < pattern.length) {
    const bit = pattern[i];
    const start = i;
    while (i < pattern.length && pattern[i] === bit) i++;
    const width = (i - start) * 0.25;
    if (bit === '1') bars.push({ x, width });
    x += width;
  }
  return { bars, totalWidth: x };
}

// ─── Dimensions ─────────────────────────────────────────────────────────────

const LABEL_MM = 40;
const LABEL_MM_H = 20;
const LABEL_PX = 320;
const LABEL_PX_H = 160;

// ─── Main Component ─────────────────────────────────────────────────────────

function StickerLabel({ tpl, data }: { tpl: PrintTemplate; data: UniversalDocumentData }) {
  const product = data.lines[0] || {};
  const companyName = tpl.company_name_text || (printFieldResolver.resolve('company.name', data, tpl) as string) || '';
  const productName = (product.name || '') as string;
  const barcodeValue = (product.barcode || '') as string;
  const price = product.unitPriceTtc ?? product.unitPriceHt ?? 0;
  const ref = (product.ref || '') as string;
  const brandName = (product.brand || '') as string;
  const imageUrl = (product.imageUrl || '') as string;
  const pricePrefix = tpl.label_price_prefix || '';
  const priceText = tpl.label_price_text || 'DA';
  const isNumber = typeof price === 'number' && Number.isFinite(price);
  const displayPrice = isNumber ? price.toFixed(2) : String(price ?? '0.00');
  const barcodeFormat = tpl.label_barcode_format || 'code39';
  const barcode = tpl.show_label_barcode && barcodeValue ? buildBarcode(barcodeValue, barcodeFormat) : null;
  const isSideBySide = tpl.label_layout === 'side-by-side';
  const hideCurrency = !!tpl.label_hide_currency;

  const pad = (tpl.margin_sides ?? 8);
  const padT = (tpl.margin_top ?? 6);
  const padB = (tpl.margin_bottom ?? 6);
  const ff = fontFamily(tpl.font_family);

  const bs = tpl.label_border_style || 'solid';
  const bw = tpl.label_border_width ?? 1;
  const bc = tpl.label_border_color || '#333';
  const br = tpl.label_border_radius ?? 4;

  const innerW = LABEL_PX - pad * 2;
  const innerH = LABEL_PX_H - padT - padB;

  const imgSize = tpl.label_product_image_size ?? 40;
  const showImg = tpl.show_label_product_image && imageUrl;

  const contentArea = (
    <>
      {/* Brand */}
      {tpl.show_label_brand && brandName && (
        <div style={{
          fontSize: tpl.label_brand_size ?? 7,
          color: tpl.label_brand_color || '#888',
          lineHeight: 1.1,
        }}>
          {brandName}
        </div>
      )}

      {/* Product Name */}
      {tpl.show_label_product_name && productName && (
        <div style={{
          fontSize: tpl.label_product_name_size ?? 16,
          fontWeight: tpl.label_product_name_bold ? 700 : 400,
          color: tpl.label_product_name_color || '#111',
          lineHeight: 1.25,
          padding: '0 10px',
          maxHeight: Math.max(20, innerH * 0.2),
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

      {/* Price */}
      {tpl.show_label_price && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
          {pricePrefix && (
            <span style={{
              fontSize: Math.max(10, (tpl.label_price_size ?? 24) * 0.45),
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
          {!hideCurrency && (
            <span style={{
              fontSize: Math.max(10, (tpl.label_price_size ?? 24) * 0.45),
              color: tpl.label_price_color || '#c0392b',
              fontWeight: 600,
            }}>
              {priceText}
            </span>
          )}
        </div>
      )}
    </>
  );

  return (
    <div style={{
      width: innerW,
      height: innerH,
      direction: 'rtl',
      fontFamily: ff,
      fontSize: tpl.base_font_size ?? 12,
      padding: `${padT}px ${pad}px ${padB}px`,
      border: bw > 0 ? `${bw}px ${borderStyle(bs)} ${bc}` : 'none',
      borderRadius: br,
      display: 'flex',
      flexDirection: isSideBySide ? 'row' : 'column',
      justifyContent: 'center',
      alignItems: 'center',
      gap: isSideBySide ? 4 : 4,
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
          margin: '1px 0',
        }} />
      )}

      {isSideBySide && showImg ? (
        <div style={{ display: 'flex', flexDirection: 'row', gap: 4, alignItems: 'center', width: '100%', flex: 1 }}>
          <img src={imageUrl} alt=""
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            style={{
              width: imgSize, height: imgSize, objectFit: 'contain',
              borderRadius: 2, flexShrink: 0,
            }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, alignItems: 'center' }}>
            {contentArea}
          </div>
        </div>
      ) : (
        <>
          {showImg && (
            <img src={imageUrl} alt=""
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              style={{
                width: imgSize, height: imgSize, objectFit: 'contain',
                borderRadius: 2,
              }} />
          )}
          {contentArea}
        </>
      )}

      {/* Barcode */}
      {barcode && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
          margin: '1px 0',
        }}>
          <svg
            width={`${barcode.totalWidth.toFixed(2)}px`}
            height={tpl.label_barcode_height ?? 20}
            viewBox={`0 0 ${barcode.totalWidth.toFixed(2)} ${tpl.label_barcode_height ?? 20}`}
            style={{ direction: 'ltr', display: 'block' }}
          >
            {barcode.bars.map((bar, i) => (
              <rect key={i} x={bar.x} y={0} width={bar.width} height={tpl.label_barcode_height ?? 20} fill="#111" />
            ))}
          </svg>
          <div style={{
            fontFamily: "'Courier New', monospace",
            fontSize: 8, letterSpacing: 1, color: '#666', direction: 'ltr',
          }}>
            {barcodeValue}
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(StickerLabel);
