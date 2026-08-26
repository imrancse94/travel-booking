import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import BookingConfirmation from '../pages/customer/BookingConfirmation.jsx';
import * as bookingService from '../services/bookingService.js';
import { renderWithProviders, CUSTOMER_USER } from './testUtils.jsx';
import { CONFIRMED_BOOKING } from './fixtures.js';

vi.mock('../services/bookingService.js', () => ({
  list: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  cancel: vi.fn(),
  confirm: vi.fn(),
  checkIn: vi.fn(),
  checkOut: vi.fn(),
}));

function renderConfirmation() {
  return renderWithProviders(
    <Routes>
      <Route path="/booking-confirmation/:id" element={<BookingConfirmation />} />
      <Route path="/my-bookings" element={<h1>My bookings page</h1>} />
    </Routes>,
    { user: CUSTOMER_USER, initialEntries: ['/booking-confirmation/booking-1'] }
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Booking confirmation', () => {
  it('confirms the booking with its number, status and stay details', async () => {
    bookingService.getById.mockResolvedValue({ success: true, data: CONFIRMED_BOOKING });
    renderConfirmation();

    expect(await screen.findByRole('heading', { name: /Booking Confirmed!/i })).toBeInTheDocument();
    expect(bookingService.getById).toHaveBeenCalledWith('booking-1');
    expect(screen.getByText('BK-2026-000001')).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Grand Palace Hotel')).toBeInTheDocument();
    expect(screen.getByText('2 / 0')).toBeInTheDocument();
  });

  it('shows the server-calculated amounts', async () => {
    bookingService.getById.mockResolvedValue({ success: true, data: CONFIRMED_BOOKING });
    renderConfirmation();

    await screen.findByRole('heading', { name: /Booking Confirmed!/i });
    const summary = screen.getByText('Payment Summary').closest('.ui-card');
    expect(summary.textContent).toMatch(/360/); // total
    expect(summary.textContent).toMatch(/0\.00/); // due
  });

  it('lists the booked rooms', async () => {
    bookingService.getById.mockResolvedValue({ success: true, data: CONFIRMED_BOOKING });
    renderConfirmation();

    await screen.findByRole('heading', { name: /Booking Confirmed!/i });
    const row = screen.getByRole('row', { name: /Standard/ });
    expect(row.textContent).toMatch(/Standard/);
    expect(row.textContent).toMatch(/3/); // nights
  });

  it('links onward to My Bookings and to a new search', async () => {
    bookingService.getById.mockResolvedValue({ success: true, data: CONFIRMED_BOOKING });
    renderConfirmation();

    await screen.findByRole('heading', { name: /Booking Confirmed!/i });
    expect(screen.getByRole('link', { name: /go to my bookings/i })).toHaveAttribute('href', '/my-bookings');
    expect(screen.getByRole('link', { name: /book another stay/i })).toHaveAttribute('href', '/hotels');
  });

  it('explains a held booking is still awaiting payment', async () => {
    bookingService.getById.mockResolvedValue({
      success: true,
      data: { ...CONFIRMED_BOOKING, status: 'held', paidAmount: '0.00', dueAmount: '360.00' },
    });
    renderConfirmation();

    expect(await screen.findByRole('heading', { name: /Booking Received/i })).toBeInTheDocument();
    expect(screen.getByText('Held')).toBeInTheDocument();
    expect(screen.getByText(/held while payment is processed/i)).toBeInTheDocument();
  });

  it('shows an error state when the booking cannot be loaded', async () => {
    bookingService.getById.mockRejectedValue(new Error('Booking not found'));
    renderConfirmation();

    expect(await screen.findByText(/Could not load this booking: Booking not found/)).toBeInTheDocument();
  });
});
