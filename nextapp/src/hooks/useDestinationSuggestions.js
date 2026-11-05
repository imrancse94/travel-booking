'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as destinationService from '../services/destinationService.js';
import { useDebounce } from './useDebounce.js';

const CATALOG_LIMIT = 100;
const MIN_REMOTE_QUERY = 2;
const MAX_SUGGESTIONS = 6;

/*
 * Typeahead data for the destination field, built so that typing costs nothing.
 *
 * The destination catalogue is small and changes rarely, so it is fetched ONCE
 * per session -- shared by every mount through this module-level promise -- and
 * filtered in memory as the user types. The common case is therefore one
 * request for the whole session rather than one per keystroke.
 *
 * A server round-trip only happens if that cached page came back full, which is
 * the only situation where the in-memory list might be missing a match. Even
 * then it is debounced, deduplicated per query, and superseded requests are
 * aborted.
 */
let catalogPromise = null;

function loadCatalog() {
  if (!catalogPromise) {
    catalogPromise = destinationService
      .list({ status: 'active', limit: CATALOG_LIMIT })
      .then((res) => res.data || [])
      .catch(() => {
        // Clear the cache so a later mount can retry rather than being stuck
        // with an empty catalogue for the rest of the session.
        catalogPromise = null;
        return [];
      });
  }
  return catalogPromise;
}

/** Results per query string, so re-typing or backspacing never refetches. */
const remoteCache = new Map();

export function useDestinationSuggestions(query) {
  const [catalog, setCatalog] = useState([]);
  const [remote, setRemote] = useState(null);
  const [loading, setLoading] = useState(false);
  const debounced = useDebounce(query, 250);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadCatalog().then((rows) => {
      if (!cancelled) setCatalog(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const trimmed = query.trim().toLowerCase();

  const local = useMemo(() => {
    if (!trimmed) return catalog.slice(0, MAX_SUGGESTIONS);
    return catalog
      .filter((d) => `${d.name} ${d.country || ''}`.toLowerCase().includes(trimmed))
      .slice(0, MAX_SUGGESTIONS);
  }, [catalog, trimmed]);

  // A full page back means the catalogue may hold more than we cached, so a
  // local miss is not proof there is no match. That is the only case worth a
  // network call.
  const catalogMayBeTruncated = catalog.length >= CATALOG_LIMIT;
  const remoteQuery = debounced.trim().toLowerCase();
  const needsRemote = catalogMayBeTruncated && remoteQuery.length >= MIN_REMOTE_QUERY;

  useEffect(() => {
    if (!needsRemote) {
      setRemote(null);
      return undefined;
    }
    if (remoteCache.has(remoteQuery)) {
      setRemote(remoteCache.get(remoteQuery));
      return undefined;
    }

    const controller = new AbortController();
    setLoading(true);
    destinationService
      .list({ status: 'active', limit: MAX_SUGGESTIONS, search: remoteQuery }, { signal: controller.signal })
      .then((res) => {
        const rows = res.data || [];
        remoteCache.set(remoteQuery, rows);
        if (mounted.current) setRemote(rows);
      })
      .catch(() => {
        // Aborted or failed: fall back to whatever the local filter produced.
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });

    return () => controller.abort();
  }, [needsRemote, remoteQuery]);

  return { suggestions: remote ?? local, loading };
}

export default useDestinationSuggestions;
