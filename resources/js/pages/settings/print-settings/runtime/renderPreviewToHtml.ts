import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { DocumentDataBuilder } from '../types/data';
import type { UniversalDocumentData, CompanyInfo } from '../types/data';
import type { PipelineSource } from './UniversalPrintPipeline';
import type { PrintTemplate } from '@/pages/settings/print-settings/types';
import type { CompanyData } from '@/pages/settings/print-settings/components/preview/shared';

function buildData(source: PipelineSource, company: CompanyInfo | null): UniversalDocumentData {
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

  return ReactDOMServer.renderToStaticMarkup(element);
}
