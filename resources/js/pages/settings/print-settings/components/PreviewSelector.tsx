import React, { Suspense } from 'react';
import type { PrintTemplate, CompanyData } from '../types';
import type { UniversalDocumentData } from '../types/data';

const UniversalPreview = React.lazy(() => import('./preview/UniversalPreview'));

const FALLBACK = (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: 400, color: '#999', fontSize: 14, fontFamily: 'sans-serif',
    border: '1px dashed #ddd', borderRadius: 8, margin: 16,
  }}>
    Loading preview…
  </div>
);

interface Props {
  tpl:   PrintTemplate;
  company?: CompanyData | null;
  data?:    UniversalDocumentData | null;
}

export default function PreviewSelector({ tpl, company, data }: Props) {
  return (
    <Suspense fallback={FALLBACK}>
      <UniversalPreview tpl={tpl} data={data ?? null} company={company ?? null} />
    </Suspense>
  );
}
