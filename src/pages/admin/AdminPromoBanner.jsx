import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImagePlus, Save, Eye, EyeOff, CalendarDays, X } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { format, parseISO } from 'date-fns';
import 'react-day-picker/style.css';
import { adminFetch, clearAdminAuth, useAdminTheme } from '../../lib/adminAuth';
import AdminHeader from '../../components/admin/AdminHeader';
import './AdminPromoBanner.css';

const DEFAULTS = {
  visible: true,
  title: 'Performance Parts',
  subtitle: '10% off all in stock products',
  subtext: "Don't miss out on our best deals of the season!",
  image: '/promo-banner.jpg',
  ctaLabel: 'Shop Sale Now',
  ctaUrl: '/shop?sale=1',
};

export default function AdminPromoBanner() {
  const navigate = useNavigate();
  const { theme, toggle: toggleTheme } = useAdminTheme();
  const fileRef    = useRef(null);
  const calendarRef = useRef(null);

  const [form, setForm]           = useState(DEFAULTS);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview]     = useState(null);
  const [toast, setToast]         = useState(null);
  const [calOpen, setCalOpen]     = useState(false);

  useEffect(() => {
    adminFetch('/api/admin/promo-banner')
      .then(r => { if (r.status === 401) { clearAdminAuth(); navigate('/admin'); } return r.json(); })
      .then(data => setForm({ ...DEFAULTS, ...data }))
      .catch(() => setForm(DEFAULTS))
      .finally(() => setLoading(false));
  }, [navigate]);

  // Close calendar on outside click
  useEffect(() => {
    if (!calOpen) return;
    function handler(e) {
      if (calendarRef.current && !calendarRef.current.contains(e.target)) setCalOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [calOpen]);

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function handleDaySelect(day) {
    set('expiresAt', day ? format(day, 'yyyy-MM-dd') : '');
    setCalOpen(false);
  }

  const selectedDate = form.expiresAt ? parseISO(form.expiresAt) : undefined;

  async function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const base64 = await toBase64(file);
      const res = await adminFetch('/api/admin/promo-banner/image', {
        method: 'POST',
        body: JSON.stringify({ imageBase64: base64.split(',')[1], mimeType: file.type }),
      });
      if (res.status === 401) { clearAdminAuth(); navigate('/admin'); return; }
      const { url } = await res.json();
      set('image', url + '?t=' + Date.now());
      showToast('Image uploaded');
    } catch {
      showToast('Image upload failed', true);
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await adminFetch('/api/admin/promo-banner', {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      if (res.status === 401) { clearAdminAuth(); navigate('/admin'); return; }
      await res.json();
      showToast('Saved successfully');
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

  function toBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  return (
    <div className="apb-page" data-admin-theme={theme}>
      <AdminHeader theme={theme} onToggleTheme={toggleTheme} />

      {toast && (
        <div className={`apb-toast${toast.error ? ' apb-toast--error' : ''}`}>
          {toast.msg}
        </div>
      )}

      <main className="apb-main">
        <div className="apb-toolbar">
          <div className="apb-toolbar-left">
            <h1 className="apb-page-title">Promo Banner</h1>
          </div>
          <div className="apb-toolbar-right">
            <a href="/" target="_blank" rel="noreferrer" className="apb-preview-link">
              Preview site ↗
            </a>
            <button className="apb-save-btn" onClick={handleSave} disabled={saving || loading}>
              <Save size={15} />
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="apb-loading">Loading…</div>
        ) : (
          <div className="apb-layout">

            {/* ── Left: form ── */}
            <div className="apb-form-col">

              {/* Visibility */}
              <div className="apb-card">
                <div className="apb-card-header">Visibility</div>

                <div className="apb-field">
                  <label className="apb-toggle-row" onClick={() => set('visible', !form.visible)}>
                    <div className={`apb-toggle${form.visible ? ' apb-toggle--on' : ''}`}>
                      <div className="apb-toggle-thumb" />
                    </div>
                    <span className="apb-toggle-label">
                      {form.visible
                        ? <><Eye size={14} /> Banner is visible on homepage</>
                        : <><EyeOff size={14} /> Banner is hidden</>
                      }
                    </span>
                  </label>
                </div>

                <div className="apb-field">
                  <label className="apb-label">
                    Auto-hide after date <span className="apb-hint">(optional)</span>
                  </label>

                  <div className="apb-datepicker-wrap" ref={calendarRef}>
                    <button
                      type="button"
                      className={`apb-datepicker-trigger${calOpen ? ' apb-datepicker-trigger--open' : ''}`}
                      onClick={() => setCalOpen(o => !o)}
                    >
                      <CalendarDays size={15} />
                      <span>
                        {selectedDate
                          ? format(selectedDate, 'dd MMM yyyy')
                          : 'Pick an expiry date…'
                        }
                      </span>
                      {selectedDate && (
                        <span
                          className="apb-datepicker-clear"
                          role="button"
                          tabIndex={0}
                          onClick={e => { e.stopPropagation(); handleDaySelect(null); }}
                          onKeyDown={e => e.key === 'Enter' && handleDaySelect(null)}
                          aria-label="Clear date"
                        >
                          <X size={13} />
                        </span>
                      )}
                    </button>

                    {calOpen && (
                      <div className={`apb-calendar-popover${theme === 'light' ? ' apb-calendar-popover--light' : ''}`}>
                        <DayPicker
                          mode="single"
                          selected={selectedDate}
                          onSelect={handleDaySelect}
                          disabled={{ before: new Date() }}
                          showOutsideDays
                        />
                      </div>
                    )}
                  </div>

                  {selectedDate && (
                    <p className="apb-expiry-note">
                      Banner will auto-hide after <strong>{format(selectedDate, 'EEEE d MMMM yyyy')}</strong>
                    </p>
                  )}
                </div>
              </div>

              {/* Text content */}
              <div className="apb-card">
                <div className="apb-card-header">Content</div>

                <div className="apb-field">
                  <label className="apb-label">Title</label>
                  <input
                    className="apb-input"
                    value={form.title}
                    onChange={e => set('title', e.target.value)}
                    placeholder="Performance Parts"
                  />
                </div>

                <div className="apb-field">
                  <label className="apb-label">Subtitle <span className="apb-hint">(shown in red below title)</span></label>
                  <input
                    className="apb-input"
                    value={form.subtitle}
                    onChange={e => set('subtitle', e.target.value)}
                    placeholder="10% off all in stock products"
                  />
                </div>

                <div className="apb-field">
                  <label className="apb-label">Body text</label>
                  <textarea
                    className="apb-textarea"
                    value={form.subtext}
                    onChange={e => set('subtext', e.target.value)}
                    rows={3}
                    placeholder="Don't miss out on our best deals of the season!"
                  />
                </div>
              </div>

              {/* CTA */}
              <div className="apb-card">
                <div className="apb-card-header">Call to Action Button</div>

                <div className="apb-field">
                  <label className="apb-label">Button label</label>
                  <input
                    className="apb-input"
                    value={form.ctaLabel}
                    onChange={e => set('ctaLabel', e.target.value)}
                    placeholder="Shop Sale Now"
                  />
                </div>

                <div className="apb-field">
                  <label className="apb-label">Button URL</label>
                  <input
                    className="apb-input"
                    value={form.ctaUrl}
                    onChange={e => set('ctaUrl', e.target.value)}
                    placeholder="/shop?sale=1"
                  />
                </div>
              </div>
            </div>

            {/* ── Right: image upload ── */}
            <div className="apb-image-col">
              <div className="apb-card">
                <div className="apb-card-header">Banner Image</div>

                <div
                  className="apb-image-drop"
                  onClick={() => fileRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && fileRef.current?.click()}
                >
                  {(preview || form.image) ? (
                    <img
                      src={preview || form.image}
                      alt="Promo banner preview"
                      className="apb-image-preview"
                    />
                  ) : (
                    <div className="apb-image-placeholder">
                      <ImagePlus size={32} />
                      <span>Click to upload image</span>
                    </div>
                  )}
                  {uploading && <div className="apb-image-uploading">Uploading…</div>}
                </div>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="apb-file-input"
                  onChange={handleImageChange}
                />

                <p className="apb-image-hint">
                  Recommended: landscape image, 1920×900px or wider. JPG or PNG.
                </p>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
