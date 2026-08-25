import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from '../layouts/AdminLayout.jsx';
import { ProtectedRoute } from './ProtectedRoute.jsx';

import { Dashboard } from '../pages/admin/dashboard/Dashboard.jsx';

import { BookingList } from '../pages/admin/bookings/BookingList.jsx';
import { BookingDetail } from '../pages/admin/bookings/BookingDetail.jsx';

import { HotelList } from '../pages/admin/hotels/HotelList.jsx';
import { HotelForm } from '../pages/admin/hotels/HotelForm.jsx';
import { HotelDetail } from '../pages/admin/hotels/HotelDetail.jsx';

import { RoomTypeList } from '../pages/admin/rooms/RoomTypeList.jsx';
import { RoomTypeForm } from '../pages/admin/rooms/RoomTypeForm.jsx';
import { RoomList } from '../pages/admin/rooms/RoomList.jsx';
import { RoomForm } from '../pages/admin/rooms/RoomForm.jsx';
import { RatePlanList } from '../pages/admin/rooms/RatePlanList.jsx';

import { CustomerList } from '../pages/admin/customers/CustomerList.jsx';
import { CustomerDetail } from '../pages/admin/customers/CustomerDetail.jsx';

import { TourPackageList } from '../pages/admin/tours/TourPackageList.jsx';
import { TourPackageForm } from '../pages/admin/tours/TourPackageForm.jsx';
import { TourBookingList } from '../pages/admin/tours/TourBookingList.jsx';

import { DestinationList } from '../pages/admin/destinations/DestinationList.jsx';
import { DestinationForm } from '../pages/admin/destinations/DestinationForm.jsx';

import { VehicleList } from '../pages/admin/transport/VehicleList.jsx';
import { DriverList } from '../pages/admin/transport/DriverList.jsx';
import { TransportBookingList } from '../pages/admin/transport/TransportBookingList.jsx';

import { PaymentList } from '../pages/admin/payments/PaymentList.jsx';
import { PaymentDetail } from '../pages/admin/payments/PaymentDetail.jsx';

import { InvoiceList } from '../pages/admin/invoices/InvoiceList.jsx';
import { InvoiceDetail } from '../pages/admin/invoices/InvoiceDetail.jsx';

import { CommissionList } from '../pages/admin/commissions/CommissionList.jsx';
import { ReportsHome } from '../pages/admin/reports/ReportsHome.jsx';

import { UserList } from '../pages/admin/users/UserList.jsx';
import { UserForm } from '../pages/admin/users/UserForm.jsx';

import { RoleList } from '../pages/admin/roles/RoleList.jsx';
import { SettingsPage } from '../pages/admin/settings/SettingsPage.jsx';

/**
 * The full /admin/* tree, nested under AdminLayout's chrome (sidebar/topbar/
 * breadcrumbs) and gated section-by-section with the same permission each
 * section's ADMIN_NAV_ITEMS entry uses (constants/navigation.js), so a
 * section only reachable via a direct URL is still denied the same way it
 * would be hidden from the sidebar. Mounted in App.jsx as `/admin/*`.
 */
export function AdminRoutes() {
  return (
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />

          <Route element={<ProtectedRoute permission="bookings.view" />}>
            <Route path="bookings" element={<BookingList />} />
            <Route path="bookings/:id" element={<BookingDetail />} />
          </Route>

          <Route element={<ProtectedRoute permission="hotels.view" />}>
            <Route path="hotels" element={<HotelList />} />
            <Route path="hotels/new" element={<HotelForm />} />
            <Route path="hotels/:id" element={<HotelDetail />} />
            <Route path="hotels/:id/edit" element={<HotelForm />} />
          </Route>

          <Route element={<ProtectedRoute permission="room_types.view" />}>
            <Route path="rooms/room-types" element={<RoomTypeList />} />
            <Route path="rooms/room-types/new" element={<RoomTypeForm />} />
            <Route path="rooms/room-types/:id/edit" element={<RoomTypeForm />} />
            <Route path="rooms/rooms" element={<RoomList />} />
            <Route path="rooms/rooms/new" element={<RoomForm />} />
            <Route path="rooms/rooms/:id/edit" element={<RoomForm />} />
            <Route path="rooms/rate-plans" element={<RatePlanList />} />
          </Route>

          <Route element={<ProtectedRoute permission="customers.view" />}>
            <Route path="customers" element={<CustomerList />} />
            <Route path="customers/:id" element={<CustomerDetail />} />
          </Route>

          <Route element={<ProtectedRoute permission="tours.view" />}>
            <Route path="tours/packages" element={<TourPackageList />} />
            <Route path="tours/packages/new" element={<TourPackageForm />} />
            <Route path="tours/packages/:id/edit" element={<TourPackageForm />} />
            <Route path="tours/bookings" element={<TourBookingList />} />
          </Route>

          <Route element={<ProtectedRoute permission="destinations.view" />}>
            <Route path="destinations" element={<DestinationList />} />
            <Route path="destinations/new" element={<DestinationForm />} />
            <Route path="destinations/:id/edit" element={<DestinationForm />} />
          </Route>

          <Route element={<ProtectedRoute permission="transport.view" />}>
            <Route path="transport/vehicles" element={<VehicleList />} />
            <Route path="transport/drivers" element={<DriverList />} />
            <Route path="transport/bookings" element={<TransportBookingList />} />
          </Route>

          <Route element={<ProtectedRoute permission="payments.view" />}>
            <Route path="payments" element={<PaymentList />} />
            <Route path="payments/:id" element={<PaymentDetail />} />
          </Route>

          <Route element={<ProtectedRoute permission="invoices.view" />}>
            <Route path="invoices" element={<InvoiceList />} />
            <Route path="invoices/:id" element={<InvoiceDetail />} />
          </Route>

          <Route element={<ProtectedRoute permission="commissions.view" />}>
            <Route path="commissions" element={<CommissionList />} />
          </Route>

          <Route element={<ProtectedRoute permission="reports.view" />}>
            <Route path="reports" element={<ReportsHome />} />
          </Route>

          <Route element={<ProtectedRoute permission="users.view" />}>
            <Route path="users" element={<UserList />} />
            <Route path="users/new" element={<UserForm />} />
            <Route path="users/:id/edit" element={<UserForm />} />
          </Route>

          <Route element={<ProtectedRoute permission="roles.view" />}>
            <Route path="roles" element={<RoleList />} />
          </Route>

          <Route path="settings" element={<SettingsPage />} />

          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default AdminRoutes;
