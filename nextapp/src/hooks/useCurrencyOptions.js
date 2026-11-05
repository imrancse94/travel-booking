'use client';

import { useEffect, useState } from 'react';
import * as settingsService from '../services/settingsService.js';

// Only used if the settings fetch itself fails -- once it succeeds, the list
// (and default) are always whatever Settings > Currency & Tax actually holds,
// even if that ends up empty.
const FALLBACK_CURRENCIES = ['USD'];
const FALLBACK_DEFAULT = 'USD';

/**
 * The currency codes an admin can pick from -- managed on the Settings page
 * (`available_currencies`), not hard-coded per form -- plus the agency-wide
 * default (`currency`). Every place that records a price in its own currency
 * (room rates, tour packages) reads both: the default is what they show and
 * submit, so a change in Settings takes effect everywhere without editing
 * each form.
 */
export function useCurrencyOptions() {
  const [currencies, setCurrencies] = useState(FALLBACK_CURRENCIES);
  const [defaultCurrency, setDefaultCurrency] = useState(FALLBACK_DEFAULT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    settingsService
      .getSettings()
      .then((res) => {
        if (cancelled) return;
        const list = res.data?.available_currencies;
        if (Array.isArray(list) && list.length) setCurrencies(list);
        if (res.data?.currency) setDefaultCurrency(res.data.currency);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return { options: currencies.map((code) => ({ value: code, label: code })), defaultCurrency, loading };
}

export default useCurrencyOptions;
