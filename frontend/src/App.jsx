import { Navigate, Route, Routes } from 'react-router-dom';
import { CustomerLayout } from './layouts/CustomerLayout.jsx';
import { ProtectedRoute } from './routes/ProtectedRoute.jsx';
import { AdminRoutes } from './routes/AdminRoutes.jsx';

import Home from './pages/Home.jsx';
import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
import ForgotPassword from './pages/auth/ForgotPassword.jsx';
import ResetPassword from './pages/auth/ResetPassword.jsx';

import HotelSearch from './pages/customer/HotelSearch.jsx';
import HotelDetails from './pages/customer/HotelDetails.jsx';
import Checkout from './pages/customer/Checkout.jsx';
import BookingConfirmation from './pages/customer/BookingConfirmation.jsx';
import MyBookings from './pages/customer/MyBookings.jsx';
import BookingDetail from './pages/customer/BookingDetail.jsx';
import MyInvoices from './pages/customer/MyInvoices.jsx';
import Profile from './pages/customer/Profile.jsx';

/**
 * Top-level route tree: public/customer pages under CustomerLayout,
 * standalone auth pages (no header/footer chrome), the customer's own
 * protected pages (checkout, bookings, invoices, profile), and the full
 * /admin/* tree (its own layout + permission-gated sub-routes, see
 * routes/AdminRoutes.jsx).
 */
export function App() {
  return (
    <Routes>
      <Route element={<CustomerLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/hotels" element={<HotelSearch />} />
        <Route path="/hotels/:id" element={<HotelDetails />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/booking-confirmation/:id" element={<BookingConfirmation />} />
          <Route path="/my-bookings" element={<MyBookings />} />
          <Route path="/my-bookings/:id" element={<BookingDetail />} />
          <Route path="/my-invoices" element={<MyInvoices />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route path="/admin/*" element={<AdminRoutes />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
