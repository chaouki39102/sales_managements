// DataTable/parts/DataTableErrorBoundary.tsx — keeps a failing column from crashing the page

import React from 'react';

// ════════════════════════════════════════════════════════════════════════════
// DataTableErrorBoundary — يمنع خطأ في عمود واحد من إسقاط الصفحة كاملاً
// ════════════════════════════════════════════════════════════════════════════

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class DataTableErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[DataTable] خطأ في التصيير:', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          role="alert"
          style={{
            padding: '24px',
            background: 'var(--bg2, #fff8f8)',
            border: '1px solid var(--red2, #fca5a5)',
            borderRadius: '8px',
            textAlign: 'center',
            direction: 'rtl',
            fontFamily: 'inherit',
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
          <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--t1, #111)' }}>
            حدث خطأ في عرض الجدول
          </div>
          <div style={{ fontSize: 13, color: 'var(--t3, #666)', marginBottom: 16 }}>
            {this.state.error?.message ?? 'خطأ غير متوقع'}
          </div>
          <button
            onClick={this.handleRetry}
            style={{
              padding: '6px 18px',
              background: 'var(--primary, #2563eb)',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            إعادة المحاولة
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default DataTableErrorBoundary;
