import React from 'react';
import ReactDOMServer from 'react-dom/server.browser';
import UniversalPrintPipeline from './UniversalPrintPipeline';
import type { PipelineSource } from './UniversalPrintPipeline';
import type { PrintTemplate } from '@/pages/settings/print-settings/types';
import type { CompanyData } from '@/pages/settings/print-settings/components/preview/shared';

export function renderPreviewToHtml(input: {
  template: PrintTemplate;
  company: CompanyData | null;
  source: PipelineSource;
}): string {
  const { template, company, source } = input;

  const element = React.createElement(UniversalPrintPipeline, {
    source,
    template,
    company,
  });

  return ReactDOMServer.renderToStaticMarkup(element);
}
