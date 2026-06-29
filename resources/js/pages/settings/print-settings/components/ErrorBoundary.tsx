import React from 'react';

interface Props { children: React.ReactNode; fallback?: React.ReactNode; }
interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{
          padding: 24, textAlign: 'center', color: 'var(--t4)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 28, color: 'var(--red)', opacity: 0.6 }} />
          <span style={{ fontSize: 13 }}>تعذر عرض المعاينة</span>
          <button onClick={() => this.setState({ hasError: false })} style={{
            padding: '6px 14px', border: '1px solid var(--b2)', borderRadius: 6,
            background: 'var(--bg2)', cursor: 'pointer', fontSize: 12, color: 'var(--t2)',
          }} type="button">إعادة المحاولة</button>
        </div>
      );
    }
    return this.props.children;
  }
}
