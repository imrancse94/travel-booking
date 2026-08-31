'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, StatCard, StatusBadge, Table, Loader } from '../../../components/ui/index.js';
import { LineChartCard, BarChartCard, PieChartCard } from '../../../components/charts/index.js';
import * as dashboardService from '../../../services/dashboardService.js';
import { formatCurrency, formatDate } from '../../../utils/format.js';

const RECENT_BOOKINGS_COLUMNS = [
  {
    key: 'bookingNumber',
    header: 'Booking #',
    render: (row) => <Link href={`/admin/bookings/${row.id}`}>{row.bookingNumber}</Link>,
  },
  { key: 'customer', header: 'Customer', render: (row) => (row.customer ? `${row.customer.firstName} ${row.customer.lastName}` : '—') },
  { key: 'hotel', header: 'Hotel', render: (row) => row.hotel?.name || '—' },
  { key: 'checkIn', header: 'Check-in', render: (row) => formatDate(row.checkIn) },
  { key: 'checkOut', header: 'Check-out', render: (row) => formatDate(row.checkOut) },
  { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  {
    key: 'totalAmount',
    header: 'Total',
    render: (row) => formatCurrency(row.totalAmount, row.currency),
  },
];

/** Admin dashboard: KPI cards, revenue/booking/occupancy/top-hotel/top-destination/payment-method charts, and a recent-bookings table. */
export function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    dashboardService
      .getDashboard()
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <Loader label="Loading dashboard..." />;

  if (error) {
    return (
      <div className="error-state">
        <p>Could not load the dashboard: {error.message}</p>
      </div>
    );
  }

  const cards = data?.cards || {};
  const charts = data?.charts || {};
  const recentBookings = data?.recentBookings || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">An overview of bookings, revenue and operations.</p>
        </div>
      </div>

      <div className="stat-cards">
        <StatCard label="Total Bookings" value={cards.totalBookings ?? 0} icon="📖" />
        <StatCard label="Today's Bookings" value={cards.todaysBookings ?? 0} icon="📅" />
        <StatCard label="Upcoming Check-ins" value={cards.upcomingCheckIns ?? 0} icon="🛎️" />
        <StatCard label="Upcoming Check-outs" value={cards.upcomingCheckOuts ?? 0} icon="🚪" />
        <StatCard label="Revenue" value={formatCurrency(cards.revenue)} tone="success" icon="💵" />
        <StatCard label="Pending Payments" value={formatCurrency(cards.pendingPayments)} tone="warning" icon="⏳" />
        <StatCard label="Available Rooms" value={cards.availableRooms ?? 0} tone="success" icon="🟢" />
        <StatCard label="Occupied Rooms" value={cards.occupiedRooms ?? 0} icon="🛏️" />
        <StatCard label="Customers" value={cards.customers ?? 0} icon="👥" />
        <StatCard label="Tour Bookings" value={cards.tourBookings ?? 0} icon="🧳" />
      </div>

      <div className="charts-grid">
        <Card title="Revenue Over Time">
          <LineChartCard
            data={charts.revenueOverTime || []}
            xKey="date"
            series={[{ key: 'revenue', label: 'Revenue' }]}
            valueFormatter={(v) => formatCurrency(v)}
          />
        </Card>

        <Card title="Booking Trends">
          <LineChartCard
            data={charts.bookingTrends || []}
            xKey="date"
            series={[{ key: 'bookings', label: 'Bookings' }]}
          />
        </Card>

        <Card title="Occupancy">
          <BarChartCard
            data={charts.occupancy || []}
            xKey="date"
            series={[{ key: 'occupancyRate', label: 'Occupancy %' }]}
            valueFormatter={(v) => `${v}%`}
          />
        </Card>

        <Card title="Top Hotels">
          <BarChartCard
            data={charts.topHotels || []}
            xKey="name"
            horizontal
            series={[{ key: 'bookings', label: 'Bookings' }]}
          />
        </Card>

        <Card title="Top Destinations">
          <BarChartCard
            data={charts.topDestinations || []}
            xKey="name"
            horizontal
            series={[{ key: 'bookings', label: 'Bookings' }]}
          />
        </Card>

        <Card title="Payment Methods">
          <PieChartCard
            data={charts.paymentMethods || []}
            dataKey="amount"
            nameKey="method"
            valueFormatter={(v) => formatCurrency(v)}
          />
        </Card>
      </div>

      <Card title="Recent Bookings">
        <Table columns={RECENT_BOOKINGS_COLUMNS} rows={recentBookings} emptyMessage="No recent bookings." />
      </Card>
    </div>
  );
}

export default Dashboard;
