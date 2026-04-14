import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useAdminTheme } from '../../lib/adminAuth';
import AdminHeader from '../../components/admin/AdminHeader';
import './AdminDeveloper.css';

export default function AdminDeveloper() {
  const { theme, toggle: toggleTheme } = useAdminTheme();
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState(null);

  async function handleSync() {
    setSyncing(true);
    setResult(null);
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setResult({ ok: true, message: data?.message || `Sync complete — ${data?.indexed ?? '?'} products indexed` });
      } else {
        setResult({ ok: false, message: data?.error || `Sync failed (${res.status})` });
      }
    } catch (err) {
      setResult({ ok: false, message: err.message });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="adev-page" data-admin-theme={theme}>
      <AdminHeader theme={theme} onToggleTheme={toggleTheme} />
      <main className="adev-main">
        <h1 className="adev-title">Developer</h1>

        <section className="adev-section">
          <h2 className="adev-section-title">Meilisearch</h2>
          <p className="adev-section-desc">
            Trigger a full product sync from WooCommerce into the Meilisearch index.
            This runs automatically on deploy and every hour.
          </p>
          <button className="adev-btn" onClick={handleSync} disabled={syncing}>
            <RefreshCw size={15} className={syncing ? 'adev-spin' : ''} />
            {syncing ? 'Syncing…' : 'Run Sync'}
          </button>
          {result && (
            <p className={`adev-result ${result.ok ? 'adev-result--ok' : 'adev-result--err'}`}>
              {result.message}
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
