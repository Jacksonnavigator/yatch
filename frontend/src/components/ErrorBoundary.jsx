import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Keep console logging for debugging; UI stays friendly.
    // eslint-disable-next-line no-console
    console.error('UI crashed:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page-wrap" style={{ paddingTop: 120 }}>
          <div className="page-header">
            <h1 className="page-title">Something <em>Went Wrong</em></h1>
            <p className="page-sub">Try refreshing. If this keeps happening, contact support.</p>
            <div className="gold-line" />
          </div>

          <div className="card" style={{ maxWidth: 720 }}>
            <p className="text-muted" style={{ fontSize: 13, lineHeight: 1.8 }}>
              The page encountered an unexpected error.
            </p>
            <div className="mt-24 flex gap-12">
              <button className="btn-gold" onClick={() => window.location.reload()}>Refresh</button>
              <button className="btn-outline" onClick={() => this.setState({ hasError: false, error: null })}>Try again</button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

