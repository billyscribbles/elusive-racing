import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Percent, AlertTriangle } from 'lucide-react';
import { adminFetch, clearAdminAuth, useAdminTheme } from '../../lib/adminAuth';
import AdminHeader from '../../components/admin/AdminHeader';
import './AdminWholesaleTiers.css';

export default function AdminWholesaleTiers() {
  const navigate = useNavigate();
  const { theme, toggle: toggleTheme } = useAdminTheme();

  const [tiers, setTiers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState(null);

  useEffect(() => {
    adminFetch('/api/admin/wholesale-tiers')
      .then(r => { if (r.status === 401) { clearAdminAuth(); navigate('/admin'); } return r.json(); })
      .then(data => setTiers(data?.tiers || []))
      .catch(() => showToast('Failed to load tiers', true))
      .finally(() => setLoading(false));
  }, [navigate]);

  function updateTier(index, field, value) {
    setTiers(list => list.map((t, i) => i === index ? { ...t, [field]: value } : t));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = tiers.map(t => ({
        role: t.role,
        label: t.label,
        discount: Number(t.discount),
      }));
      const res = await adminFetch('/api/admin/wholesale-tiers', {
        method: 'PUT',
        body: JSON.stringify({ tiers: payload }),
      });
      if (res.status === 401) { clearAdminAuth(); navigate('/admin'); return; }
      const data = await res.json();
      if (!res.ok) { showToast(data.error || 'Save failed', true); return; }
      setTiers(data.tiers || []);
      showToast('Tiers saved');
    } catch {
      showToast('Save failed', true);
    } finally {
      setSaving(false);
    }
  }

  function showToast(msg, error = false) {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div className="awt-page" data-admin-theme={theme}>
      <AdminHeader theme={theme} onToggleTheme={toggleTheme} />

      {toast && (
        <div className={`awt-toast${toast.error ? ' awt-toast--error' : ''}`}>
          {toast.msg}
        </div>
      )}

      <main className="awt-main">
        <div className="awt-toolbar">
          <h1 className="awt-page-title">Wholesale Tiers</h1>
          <button className="awt-save-btn" onClick={handleSave} disabled={saving || loading}>
            <Save size={15} />
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>

        <div className="awt-warning">
          <AlertTriangle size={16} />
          <div>
            <strong>Role keys and WooCommerce meta keys are fixed.</strong> You can rename
            each tier and change its discount percentage. Adding or removing tiers requires
            matching WooCommerce user roles — contact your developer for that.
          </div>
        </div>

        {loading ? (
          <div className="awt-loading">Loading…</div>
        ) : (
          <div className="awt-card">
            <div className="awt-card-header">5 Tier Slots</div>
            <div className="awt-rows">
              {tiers.map((t, i) => (
                <div className="awt-row" key={t.role}>
                  <div className="awt-role-col">
                    <div className="awt-role-label">Role key</div>
                    <code className="awt-role-code">{t.role}</code>
                  </div>

                  <div className="awt-field-col">
                    <label className="awt-label">Display label</label>
                    <input
                      className="awt-input"
                      type="text"
                      value={t.label}
                      onChange={e => updateTier(i, 'label', e.target.value)}
                      placeholder="e.g. Silver Tier"
                    />
                  </div>

                  <div className="awt-discount-col">
                    <label className="awt-label">Discount</label>
                    <div className="awt-discount-wrap">
                      <input
                        className="awt-input awt-input--num"
                        type="number"
                        min="0"
                        max="99"
                        step="1"
                        value={t.discount}
                        onChange={e => updateTier(i, 'discount', e.target.value)}
                      />
                      <Percent size={14} className="awt-percent-icon" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
