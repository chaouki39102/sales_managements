// resources/js/pages/finance/components/Th.tsx
import type React from 'react';

export default function Th({ children, width }: { children?: React.ReactNode; width?: string }) {
    return <th style={{
        padding: '10px 12px', textAlign: 'right', fontWeight: 700,
        fontSize: 11, color: 'var(--t3)', whiteSpace: 'nowrap', width,
    }}>{children}</th>;
}
