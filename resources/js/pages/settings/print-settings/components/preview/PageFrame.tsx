import React from 'react';
import type { PrintTemplate, PageFrameConfig } from '../../types';
import { borderStyle } from './shared';

interface Props {
  config: PageFrameConfig;
  tpl: PrintTemplate;
  children: React.ReactNode;
}

function PageFrameFn({ config, _tpl, children }: Props): JSX.Element {
  if (!config.enabled) return <>{children}</>;

  const bs = config.borderStyle ?? 'solid';
  const bw = config.borderWidth ?? 1;
  const bc = config.borderColor ?? '#111';
  const br = config.borderRadius ?? 0;
  const margin = config.margin ?? 8;

  return (
    <div style={{
      border: `${bw}px ${borderStyle(bs)} ${bc}`,
      borderRadius: br,
      padding: margin,
      margin: `${margin}px 0`,
    }}>
      {children}
    </div>
  );
}

export const PageFrame = React.memo(PageFrameFn);
