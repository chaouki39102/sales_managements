// resources/js/pos/hooks/useReceiptRenderer.ts
// يبني HTML الإيصال بدون render DOM مرئي — يستخدم ReactDOMServer.renderToStaticMarkup

import { useCallback } from 'react';
import ReactDOMServer from 'react-dom/server.browser';
import React from 'react';
import { PreviewSelector } from '@/reporting';
import type { ReceiptTemplate80mm, CompanyPreviewData, ReceiptLiveData } from '@/reporting';

export function useReceiptRenderer() {
  const buildHtml = useCallback((input: {
    template: ReceiptTemplate80mm;
    company: CompanyPreviewData | null;
    liveData: ReceiptLiveData;
  }): string => {
    const { template, company, liveData } = input;

    const element = React.createElement(PreviewSelector, {
      tpl: template,
      company,
      liveData,
    });

    return ReactDOMServer.renderToStaticMarkup(element);
  }, []);

  return { buildHtml };
}
