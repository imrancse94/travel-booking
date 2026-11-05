import { httpClient } from './httpClient.js';

// REST shape per instructions.md section 31 (Admin Dashboard). A single
// aggregate endpoint keeps the Dashboard page to one request; `params` takes
// an optional { from, to } date range. Expected response `data` shape:
//
// {
//   cards: {
//     totalBookings, todaysBookings, upcomingCheckIns, upcomingCheckOuts,
//     revenue, pendingPayments, availableRooms, occupiedRooms, customers, tourBookings
//   },
//   charts: {
//     revenueOverTime: [{ date, revenue }],
//     bookingTrends: [{ date, bookings }],
//     occupancy: [{ date, occupancyRate }],
//     topHotels: [{ name, bookings }],
//     topDestinations: [{ name, bookings }],
//     paymentMethods: [{ method, amount }],
//   },
//   recentBookings: [Booking],
// }
export function getDashboard(params) {
  return httpClient.get('/dashboard', { params });
}
