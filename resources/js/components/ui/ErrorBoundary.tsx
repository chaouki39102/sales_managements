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
        <div className="err-bd">
          <i className="ti ti-alert-triangle err-bd-ic" />
          <span className="err-bd-msg">حدث خطأ غير متوقع</span>
          <button className="err-bd-btn" onClick={() => this.setState({ hasError: false })} type="button">إعادة المحاولة</button>
        </div>
      );
    }
    return this.props.children;
  }
}
