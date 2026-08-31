'use client';

import Link from 'next/link';
import { useResourceList } from '../../../hooks/useResourceList.js';
import { Card, Pagination, SearchFilterBar, Table } from '../../../components/ui/index.js';
import * as customerService from '../../../services/customerService.js';
import { formatDate } from '../../../utils/format.js';

const COLUMNS = [
  {
    key: 'name',
    header: 'Name',
    render: (row) => <Link href={`/admin/customers/${row.id}`}>{row.firstName} {row.lastName}</Link>,
  },
  { key: 'email', header: 'Email' },
  { key: 'phone', header: 'Phone', render: (row) => row.phone || '—' },
  { key: 'nationality', header: 'Nationality', render: (row) => row.nationality || '—' },
  { key: 'createdAt', header: 'Joined', render: (row) => formatDate(row.createdAt) },
];

/** Customers list with search across name/email/phone. */
export function CustomerList() {
  const list = useResourceList({ fetcher: customerService.list });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">Everyone who has made a booking through the agency.</p>
        </div>
      </div>

      <Card>
        <SearchFilterBar search={list.search} onSearchChange={list.setSearch} searchPlaceholder="Search by name, email or phone..." />

        <Table columns={COLUMNS} rows={list.rows} loading={list.loading} emptyMessage="No customers found." />

        <Pagination
          page={list.page}
          limit={list.limit}
          total={list.meta.total}
          totalPages={list.meta.totalPages}
          onPageChange={list.setPage}
        />
      </Card>
    </div>
  );
}

export default CustomerList;
