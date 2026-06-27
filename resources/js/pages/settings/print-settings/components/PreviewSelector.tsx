import React, { useMemo } from 'react';
import type { PrintTemplate, CompanyData, ReceiptLiveData } from '../types';
import UniversalPreview from '@/reporting/components/preview/UniversalPreview';
import { DocumentDataBuilder, emptyDocumentData } from '@/reporting';
import type { UniversalDocumentData } from '@/reporting';

interface Props {
  tpl:       PrintTemplate;
  company?:  CompanyData | null;
  liveData?: ReceiptLiveData | null;
}

export default function PreviewSelector({ tpl, company, liveData }: Props) {
  const data: UniversalDocumentData = useMemo(() => {
    if (!liveData) return emptyDocumentData();
    // Phase 2: convert legacy shape to UniversalDocumentData.
    // The company param is omitted — getCompany() inside UniversalPreview
    // handles template overrides.
    return DocumentDataBuilder.fromLegacy(liveData);
  }, [liveData]);

  return <UniversalPreview tpl={tpl} data={data} company={company ?? null} />;
}
