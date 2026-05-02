import { Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import * as Sentry from '@sentry/react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, errorInfo);
    Sentry.captureException(error, { contexts: { react: errorInfo } });
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="eb-page">
        <div className="eb-container">
          <AlertTriangle size={48} className="eb-icon" />
          <h1 className="eb-title">Something went wrong</h1>
          <p className="eb-subtitle">
            We hit an unexpected error loading this page. Your cart and account are safe.
            Try reloading, or head back to the homepage.
          </p>
          <div className="eb-actions">
            <button onClick={this.handleReload} className="eb-btn eb-btn--primary">
              <RefreshCw size={16} /> Reload Page
            </button>
            <a href="/" className="eb-btn eb-btn--secondary">
              <Home size={16} /> Back to Home
            </a>
          </div>
          {import.meta.env.DEV && this.state.error && (
            <pre className="eb-dev-trace">{String(this.state.error?.stack || this.state.error)}</pre>
          )}
        </div>
        <style>{`
          .eb-page {
            min-height: 60vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 80px 20px;
            background: var(--color-bg, #fff);
          }
          .eb-container { text-align: center; max-width: 560px; }
          .eb-icon { color: #f97316; margin-bottom: 16px; }
          .eb-title {
            font-family: var(--font-primary, 'Montserrat', sans-serif);
            font-size: 26px;
            font-weight: 800;
            color: var(--color-dark, #1a1a1a);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 12px;
          }
          .eb-subtitle { font-size: 15px; color: #666; margin-bottom: 24px; line-height: 1.6; }
          .eb-actions {
            display: flex;
            gap: 12px;
            justify-content: center;
            flex-wrap: wrap;
          }
          .eb-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 12px 20px;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            text-decoration: none;
            border: none;
            cursor: pointer;
            transition: all 0.2s;
          }
          .eb-btn--primary { background: var(--color-red, #d94040); color: #fff; }
          .eb-btn--primary:hover { background: var(--color-red-hover, #c03333); }
          .eb-btn--secondary {
            background: transparent;
            color: var(--color-dark, #1a1a1a);
            border: 1px solid #ddd;
          }
          .eb-btn--secondary:hover { border-color: var(--color-dark, #1a1a1a); }
          .eb-dev-trace {
            margin-top: 32px;
            padding: 16px;
            background: #1a1a1a;
            color: #f5a97f;
            font-size: 11px;
            text-align: left;
            border-radius: 4px;
            overflow: auto;
            max-height: 280px;
            white-space: pre-wrap;
          }
        `}</style>
      </div>
    );
  }
}
