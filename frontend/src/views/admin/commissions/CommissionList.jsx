'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useResourceList } from '../../../hooks/useResourceList.js';
import { usePermission } from '../../../hooks/usePermission.js';
import {
  Button,
  Card,
  ConfirmDialog,
  Pagination,
  SearchFilterBar,
  Select,
  StatusBadge,
  Table,
  useToast,
} from '../../../components/ui/index.js';
import * as commissionService from '../../../services/commissionService.js';
import * as userService from '../../../services/userService.js';
import { COMMISSION_STATUS_OPTIONS } from '../../../constants/options.js';
import { formatCurrency, formatDate } from '../../../utils/format.js';
import { MAX_PAGE_SIZE } from '../../../constants/pagination.js';

/** Commissions list: filter by agent/status, with a mark-as-paid action. */
export function CommissionList() {
  const { show } = useToast();
  const canUpdate = usePermission('commissions.update');
  const [agents, setAgents] = useState([]);
  const [pendingMarkPaid, setPendingMarkPaid] = useState(null);
  const [marking, setMarking] = useState(false);

  const list = useResourceList({ fetcher: commissionService.list, initialFilters: { agentId: '', status: '' } });

  useEffect(() => {
    userService
      .list({ limit: MAX_PAGE_SIZE })
      .then((res) => setAgents(res.data || []))
      .catch(() => setAgents([]));
  }, []);

  async function handleMarkPaid() {
    setMarking(true);
    try {
      await commissionService.markAsPaid(pendingMarkPaid.id);
      show('Commission marked as paid', 'success');
      setPendingMarkPaid(null);
      list.reload();
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setMarking(false);
    }
  }

  const columns = [
    {
      key: 'booking',
      header: 'Booking #',
      render: (row) => (row.booking ? <Link href={`/admin/bookings/${row.booking.id}`}>{row.booking.bookingNumber}</Link> : '—'),
    },
    { key: 'agent', header: 'Agent', render: (row) => (row.agent ? `${row.agent.firstName} ${row.agent.lastName}` : '—') },
    { key: 'percentage', header: 'Rate', render: (row) => `${row.percentage}%` },
    { key: 'amount', header: 'Amount', render: (row) => formatCurrency(row.amount) },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'paidAt', header: 'Paid At', render: (row) => formatDate(row.paidAt) },
    ...(canUpdate
      ? [
          {
            key: 'actions',
            header: 'Action',
            render: (row) =>
              row.status !== 'paid' ? (
                <Button variant="ghost" onClick={() => setPendingMarkPaid(row)}>
                  Mark Paid
                </Button>
              ) : null,
          },
        ]
      : []),
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Commissions</h1>
          <p className="page-subtitle">Agent commissions earned on bookings.</p>
        </div>
      </div>

      <Card>
        <SearchFilterBar>
          <Select
            value={list.filters.agentId}
            onChange={(e) => list.setFilters({ ...list.filters, agentId: e.target.value })}
            placeholder="All agents"
            options={agents.map((a) => ({ value: a.id, label: `${a.firstName} ${a.lastName}` }))}
          />
          <Select
            value={list.filters.status}
            onChange={(e) => list.setFilters({ ...list.filters, status: e.target.value })}
            placeholder="All statuses"
            options={COMMISSION_STATUS_OPTIONS}
          />
        </SearchFilterBar>

        <Table columns={columns} rows={list.rows} loading={list.loading} emptyMessage="No commissions found." />

        <Pagination
          page={list.page}
          limit={list.limit}
          total={list.meta.total}
          totalPages={list.meta.totalPages}
          onPageChange={list.setPage}
        />
      </Card>

      <ConfirmDialog
        isOpen={Boolean(pendingMarkPaid)}
        title="Mark commission as paid"
        message="Mark this commission as paid?"
        loading={marking}
        onCancel={() => setPendingMarkPaid(null)}
        onConfirm={handleMarkPaid}
        tone="primary"
        confirmLabel="Mark Paid"
      />
    </div>
  );
}

export default CommissionList;
