'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, Input, Loader, Modal, Pagination, Select, StatusBadge, Table, useToast } from '../../../components/ui/index.js';
import * as activityLogService from '../../../services/activityLogService.js';
import { useDebounce } from '../../../hooks/useDebounce.js';
import { toastFromApiError } from '../../../utils/formErrors.js';

const OUTCOME_OPTIONS = [
  { value: 'success', label: 'Success' },
  { value: 'failure', label: 'Failure' },
];

const METHOD_OPTIONS = ['POST', 'PUT', 'PATCH', 'DELETE'].map((m) => ({ value: m, label: m }));

const LIMIT = 25;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Reads the backend's day-wise activity log (logs/YYYY-MM-DD-activity.log).
 *
 * These are files on the server, not database rows, so the date picker chooses
 * which file to read and every filter is applied server-side while streaming
 * it -- the browser never receives the whole day.
 */
export function ActivityLogList() {
  const { show } = useToast();

  const [dates, setDates] = useState([]);
  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');
  const [outcome, setOutcome] = useState('');
  const [method, setMethod] = useState('');
  const [page, setPage] = useState(1);

  const [entries, setEntries] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const debouncedSearch = useDebounce(search, 350);

  useEffect(() => {
    activityLogService
      .listDates()
      .then((res) => {
        const available = res.data || [];
        setDates(available);
        // Default to the most recent day that actually has a log rather than
        // today, which may not exist yet on a quiet morning.
        setDate((current) => current || available[0] || todayISO());
      })
      .catch((err) => show(toastFromApiError(err, 'Could not load the log dates'), 'error'));
  }, [show]);

  const load = useCallback(async () => {
    if (!date) return;
    setLoading(true);
    try {
      const res = await activityLogService.list({
        date,
        search: debouncedSearch || undefined,
        outcome: outcome || undefined,
        method: method || undefined,
        page,
        limit: LIMIT,
      });
      setEntries(res.data || []);
      setMeta(res.meta || null);
    } catch (err) {
      show(toastFromApiError(err, 'Could not load the activity log'), 'error');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [date, debouncedSearch, outcome, method, page, show]);

  useEffect(() => {
    load();
  }, [load]);

  // Any filter change invalidates the current page number.
  useEffect(() => {
    setPage(1);
  }, [date, debouncedSearch, outcome, method]);

  const columns = [
    {
      key: 'time',
      label: 'When',
      render: (row) => <span className="log-time">{row.time ? row.time.slice(11, 19) : '—'}</span>,
    },
    { key: 'action', label: 'Action' },
    {
      key: 'userEmail',
      label: 'User',
      render: (row) => (
        <span>
          {row.userEmail || <span className="text-muted">anonymous</span>}
          {row.roles?.length > 0 && <span className="log-roles">{row.roles.join(', ')}</span>}
        </span>
      ),
    },
    {
      key: 'outcome',
      label: 'Outcome',
      render: (row) => (
        <StatusBadge status={`${row.status}`} tone={row.outcome === 'success' ? 'success' : 'danger'} />
      ),
    },
    { key: 'ip', label: 'IP', render: (row) => <span className="log-ip">{row.ip || '—'}</span> },
    {
      key: 'detail',
      label: '',
      render: (row) => (
        <button type="button" className="log-expand" onClick={() => setSelected(row)}>
          Details
        </button>
      ),
    },
  ];

  const dateOptions = dates.map((d) => ({ value: d, label: d }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Activity Logs</h1>
          <p className="page-subtitle">
            Every state-changing request, read from the server&apos;s day-wise log files. Passwords, tokens and card
            details are stripped before anything is written.
          </p>
        </div>
      </div>

      <Card className="filter-bar">
        <div className="search-panel__grid">
          <Select
            label="Day"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            options={dateOptions}
            placeholder={dates.length ? undefined : 'No logs yet'}
          />
          <Input
            label="Search"
            placeholder="action, path, user, IP, request id"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            label="Outcome"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            options={OUTCOME_OPTIONS}
            placeholder="Any outcome"
          />
          <Select
            label="Method"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            options={METHOD_OPTIONS}
            placeholder="Any method"
          />
        </div>
      </Card>

      {meta?.truncated && (
        <p className="log-truncated" role="status">
          This day&apos;s log is large and only the first portion was scanned. Narrow the search to see the rest.
        </p>
      )}

      {loading ? (
        <Loader label="Reading the log..." />
      ) : entries.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state__icon" aria-hidden="true">
            📜
          </span>
          <p>No activity recorded for these filters.</p>
        </div>
      ) : (
        <>
          <p className="log-count">
            {meta?.pagination?.total ?? entries.length} entr
            {(meta?.pagination?.total ?? entries.length) === 1 ? 'y' : 'ies'} on {meta?.date}
          </p>

          <Table columns={columns} rows={entries} rowKey={(row) => row.requestId || row.time} />


          {meta?.pagination && (
            <Pagination
              page={meta.pagination.page}
              limit={meta.pagination.limit}
              total={meta.pagination.total}
              totalPages={meta.pagination.totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}
      <Modal
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        size="lg"
        title={selected ? `${selected.method} ${selected.path}` : ''}
      >
        {selected && (
          <>
            <dl className="detail-list">
              <div>
                <dt className="detail-item__label">Time</dt>
                <dd className="detail-item__value">{selected.time}</dd>
              </div>
              <div>
                <dt className="detail-item__label">Outcome</dt>
                <dd className="detail-item__value">
                  <StatusBadge
                    status={`${selected.status}`}
                    tone={selected.outcome === 'success' ? 'success' : 'danger'}
                  />
                </dd>
              </div>
              <div>
                <dt className="detail-item__label">User</dt>
                <dd className="detail-item__value">
                  {selected.userEmail || 'anonymous'}
                  {selected.roles?.length > 0 ? ` (${selected.roles.join(', ')})` : ''}
                </dd>
              </div>
              <div>
                <dt className="detail-item__label">Duration</dt>
                <dd className="detail-item__value">{selected.durationMs} ms</dd>
              </div>
              <div>
                <dt className="detail-item__label">IP</dt>
                <dd className="detail-item__value">{selected.ip || '—'}</dd>
              </div>
              <div>
                <dt className="detail-item__label">Request id</dt>
                <dd className="detail-item__value">{selected.requestId || '—'}</dd>
              </div>
              <div className="log-detail__wide">
                <dt className="detail-item__label">User agent</dt>
                <dd className="detail-item__value">{selected.userAgent || '—'}</dd>
              </div>
            </dl>

            <h4 className="form-section__title">Payload</h4>
            <p className="text-muted log-payload__note">
              Passwords, tokens and card details are stripped before this is written to disk.
            </p>
            <pre className="log-payload">
              {JSON.stringify({ body: selected.body, params: selected.params, query: selected.query }, null, 2)}
            </pre>
          </>
        )}
      </Modal>
    </div>
  );
}

export default ActivityLogList;
