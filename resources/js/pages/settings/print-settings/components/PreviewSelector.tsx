import React, { useMemo } from 'react';
import type { PrintTemplate, CompanyData, ReceiptLiveData } from '../types';
import { UniversalPreview } from '@/reporting';
import { DocumentDataBuilder, emptyDocumentData } from '@/reporting';
import type { UniversalDocumentData } from '@/reporting';
import A4Preview from '../A4Preview';
import A5Preview from '../A5Preview';
import ReceiptPreview from './ReceiptPreview';

interface Props {
  tpl:          PrintTemplate;
  company?:     CompanyData | null;
  liveData?:    ReceiptLiveData | null;
  overrideData?: UniversalDocumentData | null;
  useLegacy?:   boolean;
}

export default function PreviewSelector({ tpl, company, liveData, overrideData, useLegacy = false }: Props) {
  if (useLegacy) {
    if (tpl.paper_size === 'A4') return <A4Preview tpl={tpl} company={company} liveData={liveData} />;
    if (tpl.paper_size === 'A5') return <A5Preview tpl={tpl} company={company} liveData={liveData} />;
    return <ReceiptPreview tpl={tpl} company={company} live={liveData} />;
  }

  const data: UniversalDocumentData = useMemo(() => {
    if (overrideData) return overrideData;
    if (!liveData) return emptyDocumentData();
    return DocumentDataBuilder.fromLegacy(liveData);
  }, [liveData, overrideData]);

  return <UniversalPreview tpl={tpl} data={data} company={company ?? null} />;
}
