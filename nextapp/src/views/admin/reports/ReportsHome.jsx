'use client';

import { useEffect, useState } from 'react';
import { Button, Card, Loader, Select, Table } from '../../../components/ui/index.js';
import * as reportService from '../../../services/reportService.js';
import * as hotelService from '../../../services/hotelService.js';
import * as userService from '../../../services/userService.js';
import { BOOKING_SOURCE_OPTIONS, PAYMENT_METHOD_OPTIONS, REPORT_TYPE_OPTIONS } from '../../../constants/options.js';
import { triggerBlobDownload } from '../../../utils/format.js';
import { MAX_PAGE_SIZE } from '../../../constants/pagination.js';

function humanizeKey(key) {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}

function buildColumns(rows) {
  if (!rows.length) return [];
  return Object.keys(rows[0]).map((key) => ({ key, header: humanizeKey(key), render: (row) => formatCell(row[key]) }));
}

function formatCell(value) {
  if (value == null) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/** Reports: pick a report type, apply shared filters, view results, and export CSV. */
export function ReportsHome() {
  const [type, setType] = useState('bookings');
  const [filters, setFilters] = useState({ from: '', to: '', hotelId: '', agentId: '', paymentMethod: '', source: '' });
  const [hotels, setHotels] = useState([]);
  const [agents, setAgents] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    hotelService
      .list({ limit: MAX_PAGE_SIZE })
      .then((res) => setHotels(res.data || []))
      .catch(() => setHotels([]));
    userService
      .list({ limit: MAX_PAGE_SIZE })
      .then((res) => setAgents(res.data || []))
      .catch(() => setAgents([]));
  }, []);

  function runReport() {
    setLoading(true);
    setError(null);
    reportService
      .getReport(type, filters)
      .then((res) => setRows(Array.isArray(res.data) ? res.data : []))
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    runReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await reportService.exportCsv(type, filters);
      triggerBlobDownload(blob, `${type}-report.csv`);
    } catch (err) {
      setError(err);
    } finally {
      setExporting(false);
    }
  }

  const columns = buildColumns(rows);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Bookings, occupancy, revenue, customers, payments, refunds, commissions and more.</p>
        </div>
        <div className="page-actions">
          <Button variant="secondary" loading={exporting} onClick={handleExport} disabled={!rows.length}>
            Export CSV
          </Button>
        </div>
      </div>

      <Card>
        <div className="form-grid" style={{ marginBottom: 'var(--space-4)' }}>
          <Select label="Report Type" value={type} onChange={(e) => setType(e.target.value)} options={REPORT_TYPE_OPTIONS} />
          <label className="form-field">
            <span className="form-field__label">From</span>
            <input
              type="date"
              className="form-field__control"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            />
          </label>
          <label className="form-field">
            <span className="form-field__label">To</span>
            <input
              type="date"
              className="form-field__control"
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            />
          </label>
          <Select
            label="Hotel"
            value={filters.hotelId}
            onChange={(e) => setFilters({ ...filters, hotelId: e.target.value })}
            placeholder="All hotels"
            options={hotels.map((h) => ({ value: h.id, label: h.name }))}
          />
          <Select
            label="Agent"
            value={filters.agentId}
            onChange={(e) => setFilters({ ...filters, agentId: e.target.value })}
            placeholder="All agents"
            options={agents.map((a) => ({ value: a.id, label: `${a.firstName} ${a.lastName}` }))}
          />
          <Select
            label="Payment Method"
            value={filters.paymentMethod}
            onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
            placeholder="All methods"
            options={PAYMENT_METHOD_OPTIONS}
          />
          <Select
            label="Source"
            value={filters.source}
            onChange={(e) => setFilters({ ...filters, source: e.target.value })}
            placeholder="All sources"
            options={BOOKING_SOURCE_OPTIONS}
          />
        </div>
        <Button onClick={runReport} loading={loading}>
          Run Report
        </Button>
      </Card>

      <Card title="Results" style={{ marginTop: 'var(--space-5)' }}>
        {/* Report rows are grouped aggregates with no id of their own, and the whole
            array is replaced on every run, so the index is a stable key here. */}
        {error ? (
          <div className="error-state">
            <p>Could not load this report: {error.message}</p>
          </div>
        ) : loading ? (
          <Loader label="Running report..." />
        ) : (
          <Table
            columns={columns}
            rows={rows}
            rowKey={(row, i) => i}
            emptyMessage="No results. Adjust the filters and run the report again."
          />
        )}
      </Card>
    </div>
  );
}

export default ReportsHome;
