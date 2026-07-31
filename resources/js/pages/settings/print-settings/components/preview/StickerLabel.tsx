import React from 'react';
import type { CSSProperties } from 'react';
import type { PrintTemplate, StickerElementGeometry } from '../../types';
import type { UniversalDocumentData } from '../../types/data';
import { printFieldResolver } from '../../services';
import { fontFamily, borderStyle } from './shared';
import { renderLogo } from './LogoRenderer';
import { buildBarcode } from '@/lib/barcodeRenderer';

// ─── Dimensions ─────────────────────────────────────────────────────────────

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
  const bcHeight = tpl.label_barcode_height ?? 50;
  const bcBarWidth = tpl.label_barcode_bar_width ?? 1.0;
  const bcData = barcodeFormat !== 'code128' ? buildBarcode(barcodeValue, barcodeFormat, bcBarWidth) : null;
  const showBarcode = tpl.show_label_barcode && barcodeValue;
  const eanText = barcodeFormat === 'ean13' && barcodeValue.length >= 13
    ? `${barcodeValue[0]} ${barcodeValue.slice(1, 7)} ${barcodeValue.slice(7, 13)}`
    : null;
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

  // ─── Element builders (shared by flow + absolute layouts) ────────────────

  const renderBrand = () => tpl.show_label_brand && brandName ? (
    <div style={{
      fontSize: tpl.label_brand_size ?? 7,
      color: tpl.label_brand_color || '#888',
      lineHeight: 1.1,
    }}>
      {brandName}
    </div>
  ) : null;

  const renderProductName = () => tpl.show_label_product_name && productName ? (
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
  ) : null;

  const renderRef = () => tpl.show_label_ref && ref ? (
    <div style={{
      fontSize: tpl.label_ref_size ?? 9,
      color: tpl.label_ref_color || '#666',
    }}>
      {ref}
    </div>
  ) : null;

  const renderPrice = () => tpl.show_label_price ? (
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
  ) : null;

  const renderLogoEl = () => tpl.show_logo ? renderLogo(tpl, data) : null;

  const renderCompany = () => tpl.show_company_name && companyName ? (
    <div style={{
      fontSize: tpl.company_name_size ?? 14,
      fontWeight: tpl.company_name_bold ? 700 : 400,
      color: tpl.company_name_color || '#111',
      lineHeight: 1.2,
    }}>
      {companyName}
    </div>
  ) : null;

  const renderImage = () => showImg ? (
    <img src={imageUrl} alt=""
      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
      style={{
        width: imgSize, height: imgSize, objectFit: 'contain',
        borderRadius: 2, flexShrink: 0,
      }} />
  ) : null;

  const renderBarcode = () => showBarcode && barcodeFormat === 'code128' ? (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, margin: '1px 0' }}>
      <div style={{
        fontFamily: "'Libre Barcode 128'", fontSize: Math.max(bcHeight, 30),
        lineHeight: 1, color: '#111', direction: 'ltr',
      }}>
        {barcodeValue}
      </div>
      {tpl.label_barcode_show_text !== false && (
        <div style={{
          fontFamily: "'Courier New', monospace",
          fontSize: 8, letterSpacing: 1, color: '#666', direction: 'ltr',
        }}>
          {eanText || barcodeValue}
        </div>
      )}
    </div>
  ) : showBarcode && bcData ? (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, margin: '1px 0' }}>
      <svg width={`${bcData.totalWidth.toFixed(2)}px`} height={bcHeight}
        viewBox={`0 0 ${bcData.totalWidth.toFixed(2)} ${bcHeight}`}
        style={{ direction: 'ltr', display: 'block' }}>
        {bcData.bars.map((bar, i) => (
          <rect key={i} x={bar.x} y={0} width={bar.width} height={bcHeight} fill="#111" />
        ))}
      </svg>
      {tpl.label_barcode_show_text !== false && (
        <div style={{
          fontFamily: "'Courier New', monospace",
          fontSize: 8, letterSpacing: 1, color: '#666', direction: 'ltr',
        }}>
          {eanText || barcodeValue}
        </div>
      )}
    </div>
  ) : null;

  // ─── Absolute layout (respects the designer's saved label_positions) ─────

  const positions = tpl.label_positions ?? {};
  const hasCustomPos = Object.keys(positions).length > 0;

  if (hasCustomPos) {
    const absBox = (p: StickerElementGeometry): CSSProperties => {
      const s: CSSProperties = {
        position: 'absolute',
        left: p.x, top: p.y,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', boxSizing: 'border-box',
      };
      if (p.width !== undefined) s.width = p.width;
      if (p.height !== undefined) s.height = p.height;
      if (p.rotate) s.transform = `rotate(${p.rotate}deg)`;
      return s;
    };
    const scaled = (scale: number | undefined, node: React.ReactNode) => (
      <div style={{
        transform: scale && scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: 'center',
      }}>
        {node}
      </div>
    );
    const el = (id: string, node: React.ReactNode) => {
      const p = positions[id];
      if (!p || !node) return null;
      return (
        <div key={id} style={absBox(p)}>
          {scaled(p.scale, node)}
        </div>
      );
    };

    return (
      <div style={{
        width: LABEL_PX, height: LABEL_PX_H,
        direction: 'rtl',
        fontFamily: ff,
        fontSize: tpl.base_font_size ?? 12,
        position: 'relative', boxSizing: 'border-box',
        border: bw > 0 ? `${bw}px ${borderStyle(bs)} ${bc}` : 'none',
        borderRadius: br,
        background: '#fff', overflow: 'hidden',
      }}>
        {el('logo', renderLogoEl())}
        {el('company', renderCompany())}
        {el('brand', renderBrand())}
        {el('product_name', renderProductName())}
        {el('ref', renderRef())}
        {el('price', renderPrice())}
        {el('barcode', renderBarcode())}
        {el('image', renderImage())}
      </div>
    );
  }

  // ─── Flow layout (fallback for templates without saved positions) ────────

  const contentArea = (
    <>
      {renderBrand()}
      {renderProductName()}
      {renderRef()}
      {renderPrice()}
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
      {renderLogoEl()}
      {renderCompany()}

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
          {renderImage()}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, alignItems: 'center' }}>
            {contentArea}
          </div>
        </div>
      ) : (
        <>
          {renderImage()}
          {contentArea}
        </>
      )}

      {renderBarcode()}
    </div>
  );
}

export default React.memo(StickerLabel);
