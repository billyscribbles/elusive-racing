import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Home, Search, ArrowRight } from 'lucide-react';

export default function NotFoundPage() {
  useEffect(() => {
    // Hint to prerender services (react-snap, prerender.io) that this is a 404
    const meta = document.createElement('meta');
    meta.name = 'prerender-status-code';
    meta.content = '404';
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, []);

  return (
    <div className="nf-page">
      <Helmet>
        <title>Page Not Found — Elusive Racing</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="nf-container">
        <div className="nf-code">404</div>
        <h1 className="nf-title">Page Not Found</h1>
        <p className="nf-subtitle">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="nf-actions">
          <Link to="/" className="nf-btn nf-btn--primary">
            <Home size={16} /> Back to Home
          </Link>
          <Link to="/shop" className="nf-btn nf-btn--secondary">
            <Search size={16} /> Browse Shop <ArrowRight size={16} />
          </Link>
        </div>
      </div>
      <style>{`
        .nf-page {
          min-height: 60vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 80px 20px;
          background: var(--color-bg, #fff);
        }
        .nf-container { text-align: center; max-width: 520px; }
        .nf-code {
          font-family: var(--font-primary, 'Montserrat', sans-serif);
          font-size: 96px;
          font-weight: 900;
          color: var(--color-red, #d94040);
          line-height: 1;
          margin-bottom: 12px;
        }
        .nf-title {
          font-family: var(--font-primary, 'Montserrat', sans-serif);
          font-size: 28px;
          font-weight: 800;
          color: var(--color-dark, #1a1a1a);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
        }
        .nf-subtitle {
          font-size: 15px;
          color: #666;
          margin-bottom: 28px;
          line-height: 1.6;
        }
        .nf-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .nf-btn {
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
          transition: all 0.2s;
        }
        .nf-btn--primary {
          background: var(--color-red, #d94040);
          color: #fff;
        }
        .nf-btn--primary:hover { background: var(--color-red-hover, #c03333); }
        .nf-btn--secondary {
          background: transparent;
          color: var(--color-dark, #1a1a1a);
          border: 1px solid #ddd;
        }
        .nf-btn--secondary:hover { border-color: var(--color-dark, #1a1a1a); }
      `}</style>
    </div>
  );
}
