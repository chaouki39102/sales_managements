import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { DocumentDataBuilder } from '../types/data';
import type { UniversalDocumentData, CompanyInfo } from '../types/data';
import type { PipelineSource } from './UniversalPrintPipeline';
import type { PrintTemplate } from '@/pages/settings/print-settings/types';
import type { CompanyData } from '@/pages/settings/print-settings/components/preview/shared';

export function buildData(source: PipelineSource, company: CompanyInfo | null): UniversalDocumentData {
  switch (source.type) {
    case 'prebuilt':       return source.data;
    case 'api-document':   return DocumentDataBuilder.fromApiDocument(source.doc, company ?? {} as CompanyInfo, source.options);
    case 'pos-snapshot':   return DocumentDataBuilder.fromPOSSnapshot(source.snapshot, company ?? {} as CompanyInfo);
    case 'session-report': return DocumentDataBuilder.fromSessionReport(source.session, company ?? {} as CompanyInfo);
    default:               return DocumentDataBuilder.empty();
  }
}

export async function renderPreviewToHtml(input: {
  template: PrintTemplate;
  company: CompanyData | null;
  source: PipelineSource;
}): Promise<string> {
  const { template, company, source } = input;

  const data = buildData(source, company);
  const UniversalPreview = (await import('../components/preview/UniversalPreview')).default;

  const element = React.createElement(UniversalPreview, {
    tpl: template,
    data,
  });

  const html = ReactDOMServer.renderToStaticMarkup(element);
  return resolveQrPlaceholders(html);
}

/**
 * Static markup never runs effects, so the fiscal QR (generated client-side in
 * FiscalQR's effect) stayed an empty grey placeholder box on every receipt
 * printed from the POS screens and the silent Windows path. Replace each
 * `[data-qr-content]` placeholder with the real QR image.
 */
async function resolveQrPlaceholders(html: string): Promise<string> {
  if (!html.includes('data-qr-content') || typeof DOMParser === 'undefined') return html;
  try {
    const QRCode = (await import('qrcode')).default;
    const doc = new DOMParser().parseFromString(`<div id="__qr_root">${html}</div>`, 'text/html');
    const root = doc.getElementById('__qr_root');
    if (!root) return html;
    const slots = Array.from(root.querySelectorAll<HTMLElement>('[data-qr-content]'));
    for (const slot of slots) {
      const content = slot.getAttribute('data-qr-content') || '';
      if (!content) continue;
      const size = parseInt(slot.style.width, 10) || 48;
      const url = await QRCode.toDataURL(content, {
        width: size * 2, margin: 0, errorCorrectionLevel: 'M',
        color: { dark: '#111111', light: '#ffffff' },
      });
      const img = doc.createElement('img');
      img.setAttribute('src', url);
      img.setAttribute('width', String(size));
      img.setAttribute('height', String(size));
      img.setAttribute('alt', 'QR');
      img.setAttribute('style', 'image-rendering:pixelated;display:block;margin:0 auto');
      slot.replaceWith(img);
    }
    return root.innerHTML;
  } catch {
    return html;
  }
}
