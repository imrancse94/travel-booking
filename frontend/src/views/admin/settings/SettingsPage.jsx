'use client';

import { useEffect, useState } from 'react';
import { Button, Card, FileUploadField, Input, Loader, Select, TrashIcon, useToast } from '../../../components/ui/index.js';
import { usePermission } from '../../../hooks/usePermission.js';
import { useBranding } from '../../../contexts/BrandingContext.jsx';
import * as settingsService from '../../../services/settingsService.js';
import * as uploadService from '../../../services/uploadService.js';

// Known keys per instructions.md section 59 / settingsService.js. Any extra
// keys the live GET /settings returns are still preserved on save even though
// they don't have a dedicated field (spread into the payload untouched).
const TIMEZONE_OPTIONS = ['UTC', 'Asia/Dhaka', 'Asia/Kolkata', 'Europe/London', 'America/New_York'].map((tz) => ({
  value: tz,
  label: tz,
}));

const FIELDS = [
  { key: 'agency_name', label: 'Agency Name', type: 'text' },
  // Set by uploading a file rather than typing a URL; rendered separately below.
  { key: 'agency_logo_url', label: 'Agency Logo', type: 'upload' },
  { key: 'agency_favicon_url', label: 'Favicon', type: 'upload' },
  // The list itself is managed in its own section below; this only marks the
  // key as "known" so it doesn't fall into the generic "Other" bucket.
  { key: 'available_currencies', label: 'Available Currencies', type: 'currencies' },
  { key: 'currency', label: 'Default Currency', type: 'select' },
  { key: 'timezone', label: 'Timezone', type: 'select', options: TIMEZONE_OPTIONS },
  { key: 'tax_rate_percent', label: 'Tax Rate (%)', type: 'number' },
  { key: 'default_commission_percent', label: 'Default Commission (%)', type: 'number' },
  { key: 'cancellation_free_days', label: 'Free Cancellation (days before check-in)', type: 'number' },
  { key: 'cancellation_partial_days', label: 'Partial-Charge Window (days before check-in)', type: 'number' },
  { key: 'cancellation_partial_percent', label: 'Partial Cancellation Charge (%)', type: 'number' },
  { key: 'cancellation_full_within_hours', label: 'Full Charge Within (hours before check-in)', type: 'number' },
];

/** Agency-wide settings: currency, timezone, tax/commission defaults and cancellation policy thresholds. */
export function SettingsPage() {
  const { show } = useToast();
  const { applyBranding } = useBranding();
  const canUpdate = usePermission('settings.update');

  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newCurrency, setNewCurrency] = useState('');
  const [currencyError, setCurrencyError] = useState('');

  useEffect(() => {
    settingsService
      .getSettings()
      .then((res) => setSettings(res.data || {}))
      .catch((err) => show(err.message, 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setField(key, value) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  const availableCurrencies = settings.available_currencies || [];

  function addCurrency(e) {
    e.preventDefault();
    const code = newCurrency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(code)) {
      setCurrencyError('Enter a 3-letter currency code, e.g. USD.');
      return;
    }
    if (availableCurrencies.includes(code)) {
      setCurrencyError(`${code} is already in the list.`);
      return;
    }
    setField('available_currencies', [...availableCurrencies, code]);
    setNewCurrency('');
    setCurrencyError('');
  }

  function removeCurrency(code) {
    if (code === settings.currency) {
      show(`${code} is the default currency -- choose a different default before removing it.`, 'error');
      return;
    }
    if (availableCurrencies.length <= 1) {
      show('At least one currency must remain available.', 'error');
      return;
    }
    setField(
      'available_currencies',
      availableCurrencies.filter((c) => c !== code)
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    const payload = { ...settings };
    FIELDS.forEach((field) => {
      if (field.type === 'number' && payload[field.key] !== '' && payload[field.key] != null) {
        payload[field.key] = Number(payload[field.key]);
      }
    });
    try {
      const res = await settingsService.updateSettings(payload);
      const saved = res.data || payload;
      setSettings(saved);
      // Re-brand the running app immediately -- header, sidebar and footer all
      // read from this context, so the new name/logo appear without a reload.
      applyBranding({
        agency_name: saved.agency_name,
        agency_logo_url: saved.agency_logo_url,
        agency_favicon_url: saved.agency_favicon_url,
      });
      show('Settings saved', 'success');
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loader label="Loading settings..." />;

  const knownKeys = new Set(FIELDS.map((f) => f.key));
  const extraKeys = Object.keys(settings).filter((k) => !knownKeys.has(k));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Agency-wide configuration: currency, tax, commission and cancellation policy.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <div className="form-section">
            <h3 className="form-section__title">Agency</h3>
            <div className="form-grid">
              {FIELDS.filter((f) => f.key.startsWith('agency_') && f.type !== 'upload').map((field) => (
                <Input
                  key={field.key}
                  label={field.label}
                  value={settings[field.key] ?? ''}
                  disabled={!canUpdate}
                  onChange={(e) => setField(field.key, e.target.value)}
                />
              ))}
            </div>

            <FileUploadField
              label="Agency Logo"
              value={settings.agency_logo_url || ''}
              onChange={(url) => setField('agency_logo_url', url)}
              onUpload={(file) => uploadService.upload('branding', file)}
              disabled={!canUpdate}
              previewShape="circle"
              alt="Agency logo"
              hint="PNG, JPEG or WebP, up to 5MB. Shown, cropped to a circle, in the app header and on outgoing emails."
            />

            <FileUploadField
              label="Favicon"
              value={settings.agency_favicon_url || ''}
              onChange={(url) => setField('agency_favicon_url', url)}
              onUpload={(file) => uploadService.upload('favicon', file)}
              disabled={!canUpdate}
              previewShape="circle"
              alt="Favicon"
              hint="PNG, JPEG or WebP, up to 5MB. Automatically cropped to a circle for the browser tab icon."
            />
          </div>

          <div className="form-section">
            <h3 className="form-section__title">Currency &amp; Tax</h3>

            <div className="currency-field">
              <span className="form-field__label">Available Currencies</span>
              <div className="currency-field__chips">
                {availableCurrencies.map((code) => (
                  <span key={code} className="currency-chip">
                    {code}
                    {canUpdate && (
                      <button
                        type="button"
                        className="currency-chip__remove"
                        aria-label={`Remove ${code}`}
                        onClick={() => removeCurrency(code)}
                      >
                        <TrashIcon width="12" height="12" />
                      </button>
                    )}
                  </span>
                ))}
                {availableCurrencies.length === 0 && <span className="text-muted">No currencies configured yet.</span>}
              </div>
              {canUpdate && (
                <div className="currency-field__add">
                  <Input
                    containerClassName="mt-0"
                    placeholder="e.g. CAD"
                    value={newCurrency}
                    maxLength={3}
                    error={currencyError}
                    onChange={(e) => {
                      setNewCurrency(e.target.value);
                      setCurrencyError('');
                    }}
                  />
                  <Button variant="success" onClick={addCurrency}>
                    Add Currency
                  </Button>
                </div>
              )}
            </div>

            <div className="form-grid">
              <Select
                label="Default Currency"
                value={settings.currency ?? ''}
                disabled={!canUpdate}
                onChange={(e) => setField('currency', e.target.value)}
                options={availableCurrencies.map((code) => ({ value: code, label: code }))}
              />
              <Select
                label="Timezone"
                value={settings.timezone ?? ''}
                disabled={!canUpdate}
                onChange={(e) => setField('timezone', e.target.value)}
                options={TIMEZONE_OPTIONS}
              />
              <Input
                label="Tax Rate (%)"
                type="number"
                step="0.01"
                min="0"
                value={settings.tax_rate_percent ?? ''}
                disabled={!canUpdate}
                onChange={(e) => setField('tax_rate_percent', e.target.value)}
              />
              <Input
                label="Default Commission (%)"
                type="number"
                step="0.01"
                min="0"
                value={settings.default_commission_percent ?? ''}
                disabled={!canUpdate}
                onChange={(e) => setField('default_commission_percent', e.target.value)}
              />
            </div>
          </div>

          <div className="form-section">
            <h3 className="form-section__title">Cancellation Policy</h3>
            <div className="form-grid">
              <Input
                label="Free Cancellation (days before check-in)"
                type="number"
                min="0"
                value={settings.cancellation_free_days ?? ''}
                disabled={!canUpdate}
                onChange={(e) => setField('cancellation_free_days', e.target.value)}
              />
              <Input
                label="Partial-Charge Window (days before check-in)"
                type="number"
                min="0"
                value={settings.cancellation_partial_days ?? ''}
                disabled={!canUpdate}
                onChange={(e) => setField('cancellation_partial_days', e.target.value)}
              />
              <Input
                label="Partial Cancellation Charge (%)"
                type="number"
                min="0"
                max="100"
                value={settings.cancellation_partial_percent ?? ''}
                disabled={!canUpdate}
                onChange={(e) => setField('cancellation_partial_percent', e.target.value)}
              />
              <Input
                label="Full Charge Within (hours before check-in)"
                type="number"
                min="0"
                value={settings.cancellation_full_within_hours ?? ''}
                disabled={!canUpdate}
                onChange={(e) => setField('cancellation_full_within_hours', e.target.value)}
              />
            </div>
          </div>

          {extraKeys.length > 0 && (
            <div className="form-section">
              <h3 className="form-section__title">Other</h3>
              <div className="form-grid">
                {extraKeys.map((key) => (
                  <Input
                    key={key}
                    label={key}
                    value={settings[key] ?? ''}
                    disabled={!canUpdate}
                    onChange={(e) => setField(key, e.target.value)}
                  />
                ))}
              </div>
            </div>
          )}

          {canUpdate && (
            <div className="form-actions">
              <Button type="submit" loading={saving}>
                Save Settings
              </Button>
            </div>
          )}
        </Card>
      </form>
    </div>
  );
}

export default SettingsPage;
