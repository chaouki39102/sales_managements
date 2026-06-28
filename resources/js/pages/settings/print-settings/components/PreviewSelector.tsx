import React, { useMemo } from 'react';
import type { PrintTemplate, CompanyData, ReceiptLiveData } from '../types';
import { UniversalPreview } from '@/reporting';
import { DocumentDataBuilder, emptyDocumentData } from '@/reporting';
import type { UniversalDocumentData } from '@/reporting';

interface Props {
  tpl:          PrintTemplate;
  company?:     CompanyData | null;
  liveData?:    ReceiptLiveData | null;
  overrideData?: UniversalDocumentData | null;
}

export default function PreviewSelector({ tpl, company, liveData, overrideData }: Props) {
  const data: UniversalDocumentData = useMemo(() => {
    if (overrideData) return overrideData;
    if (!liveData) return emptyDocumentData();
    return DocumentDataBuilder.fromLegacy(liveData);
  }, [liveData, overrideData]);

  return <UniversalPreview tpl={tpl} data={data} company={company ?? null} />;
}
