import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Checkout from '../views/customer/Checkout.jsx';
import * as bookingService from '../services/bookingService.js';
import * as paymentService from '../services/paymentService.js';
import * as customerService from '../services/customerService.js';
import * as serviceService from '../services/serviceService.js';
import { renderWithProviders, CUSTOMER_USER } from './testUtils.jsx';
import { CHECKOUT_STATE, SERVICE_CATALOG } from './fixtures.js';
import { readCheckoutDraft, saveCheckoutDraft } from '../lib/navState.js';

vi.mock('../services/bookingService.js', () => ({
  list: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  cancel: vi.fn(),
  confirm: vi.fn(),
  checkIn: vi.fn(),
  checkOut: vi.fn(),
}));

vi.mock('../services/paymentService.js', () => ({
  list: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}));

vi.mock('../services/customerService.js', () => ({
  list: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  getMe: vi.fn(),
  updateMe: vi.fn(),
}));

vi.mock('../services/serviceService.js', () => ({
  list: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

/**
 * The room selection used to arrive as router state. It now comes from
 * sessionStorage, so the test seeds it there before rendering -- exactly what
 * HotelDetails does before navigating.
 */
function renderCheckout({ state = CHECKOUT_STATE, ...options } = {}) {
  if (state) saveCheckoutDraft(state);
  return renderWithProviders(<Checkout />, {
    user: CUSTOMER_USER,
    pathname: '/checkout',
    ...options,
  });
}

/** Walks the wizard from the current step to the payment step. */
async function advanceToPayment(user, steps) {
  for (let i = 0; i < steps; i += 1) {
    await user.click(screen.getByRole('button', { name: /^continue$/i }));
  }
  return screen.findByRole('heading', { name: 'Payment' });
}

beforeEach(() => {
  vi.clearAllMocks();
  serviceService.list.mockResolvedValue({ success: true, data: SERVICE_CATALOG });
  customerService.getMe.mockResolvedValue({
    success: true,
    data: { firstName: 'Casey', lastName: 'Customer', email: 'customer@example.com', phone: '+8801711000000', nationality: 'Bangladeshi' },
  });
  bookingService.create.mockResolvedValue({
    success: true,
    data: { id: 'booking-1', bookingNumber: 'BK-2026-000001', status: 'held', totalAmount: '360.00' },
  });
  paymentService.create.mockResolvedValue({ success: true, data: { id: 'pay-1', status: 'paid' } });
});

describe('Checkout', () => {
  it('shows an empty state when no rooms were selected', async () => {
    const user = userEvent.setup();
    const { router } = renderCheckout({ state: null });

    expect(screen.getByText(/No rooms selected yet/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /browse hotels/i }));
    expect(router.push).toHaveBeenCalledWith('/hotels');
  });

  it('renders the five checkout steps and starts on guest information', async () => {
    renderCheckout();

    ['1. Guest Information', '2. Room Summary', '3. Additional Services', '4. Price Summary', '5. Payment'].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
    expect(await screen.findByRole('heading', { name: 'Guest Information' })).toBeInTheDocument();
  });

  it('prefills the primary guest from the signed-in customer profile', async () => {
    renderCheckout();

    await waitFor(() => expect(screen.getByLabelText(/first name/i)).toHaveValue('Casey'));
    expect(screen.getByLabelText(/last name/i)).toHaveValue('Customer');
    expect(screen.getByLabelText(/^email$/i)).toHaveValue('customer@example.com');
  });

  it('blocks step 1 until every guest has a first and last name', async () => {
    customerService.getMe.mockRejectedValue(new Error('not a customer'));
    const user = userEvent.setup();
    renderCheckout();

    await user.click(screen.getByRole('button', { name: /^continue$/i }));

    expect(await screen.findByText(/Please fill in each guest’s first and last name/i)).toBeInTheDocument();
    expect(screen.getAllByText('Required').length).toBe(2);
    expect(screen.getByRole('heading', { name: 'Guest Information' })).toBeInTheDocument();
  });

  it('lets the guest add and remove additional guests', async () => {
    const user = userEvent.setup();
    renderCheckout();
    await waitFor(() => expect(screen.getByLabelText(/first name/i)).toHaveValue('Casey'));

    await user.click(screen.getByRole('button', { name: /add guest/i }));
    expect(screen.getByRole('heading', { name: 'Guest 2', level: 4 })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^remove$/i }));
    expect(screen.queryByRole('heading', { name: 'Guest 2', level: 4 })).not.toBeInTheDocument();
  });

  it('summarises rooms and stay details on step 2', async () => {
    const user = userEvent.setup();
    renderCheckout();
    await waitFor(() => expect(screen.getByLabelText(/first name/i)).toHaveValue('Casey'));

    await user.click(screen.getByRole('button', { name: /^continue$/i }));

    expect(await screen.findByRole('heading', { name: 'Room Summary' })).toBeInTheDocument();
    expect(screen.getByText('1 × Standard (3 nights)')).toBeInTheDocument();
    expect(screen.getByText('1 adults, 0 children')).toBeInTheDocument();
  });

  it('adds a selected extra service to the estimated total', async () => {
    const user = userEvent.setup();
    renderCheckout();
    await waitFor(() => expect(screen.getByLabelText(/first name/i)).toHaveValue('Casey'));

    await user.click(screen.getByRole('button', { name: /^continue$/i }));
    await user.click(screen.getByRole('button', { name: /^continue$/i }));

    expect(await screen.findByRole('heading', { name: 'Additional Services' })).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /Airport Pickup/i }));

    await user.click(screen.getByRole('button', { name: /^continue$/i }));
    expect(await screen.findByRole('heading', { name: 'Price Summary' })).toBeInTheDocument();

    // 360 room + 25 service
    const total = screen.getAllByText(/Estimated Total/)[0].closest('.summary-line');
    expect(total.textContent).toMatch(/385/);
    expect(screen.getByText(/calculated by the server when your booking is created/i)).toBeInTheDocument();
  });

  it('creates the booking, takes payment and lands on the confirmation page', async () => {
    const user = userEvent.setup();
    const { router } = renderCheckout();
    await waitFor(() => expect(screen.getByLabelText(/first name/i)).toHaveValue('Casey'));

    await user.click(screen.getByRole('button', { name: /^continue$/i }));
    await user.click(screen.getByRole('button', { name: /^continue$/i }));
    await user.click(screen.getByRole('checkbox', { name: /Airport Pickup/i }));
    await user.type(screen.getByLabelText(/special requests/i), 'Late check-in please');
    await advanceToPayment(user, 2);

    await user.selectOptions(screen.getByLabelText(/payment method/i), 'card');
    await user.click(screen.getByRole('button', { name: /confirm & pay/i }));

    await waitFor(() => expect(bookingService.create).toHaveBeenCalledTimes(1));
    expect(bookingService.create).toHaveBeenCalledWith({
      hotelId: 'hotel-grand-palace',
      checkIn: '2026-09-10',
      checkOut: '2026-09-13',
      adults: 1,
      children: 0,
      specialRequests: 'Late check-in please',
      source: 'website',
      rooms: [{ roomTypeId: 'rt-standard' }],
      guests: [
        {
          firstName: 'Casey',
          lastName: 'Customer',
          email: 'customer@example.com',
          phone: '+8801711000000',
          nationality: 'Bangladeshi',
          isPrimary: true,
        },
      ],
      services: [{ serviceId: 'svc-airport', quantity: 1 }],
    });

    // The payment is charged against the server-calculated total, never the
    // frontend estimate (instructions.md section 41).
    expect(paymentService.create).toHaveBeenCalledWith({
      bookingId: 'booking-1',
      amount: '360.00',
      method: 'card',
      gateway: 'mock',
    });

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/booking-confirmation/booking-1'));
    expect(readCheckoutDraft()).toBeNull();
  });

  it('sends one room per selected quantity when several rooms are booked', async () => {
    const user = userEvent.setup();
    renderCheckout({
      state: {
        ...CHECKOUT_STATE,
        adults: 2,
        estimatedTotal: 1080,
        selections: [
          { ...CHECKOUT_STATE.selections[0], quantity: 2 },
          { roomTypeId: 'rt-suite', name: 'Suite', quantity: 1, nights: 3, ratePerNight: '400.00', totalPrice: '1200.00', currency: 'USD' },
        ],
      },
    });
    await waitFor(() => expect(screen.getAllByLabelText(/first name/i)[0]).toHaveValue('Casey'));

    // Second guest still needs a name before step 1 will pass.
    await user.type(screen.getAllByLabelText(/first name/i)[1], 'Robin');
    await user.type(screen.getAllByLabelText(/last name/i)[1], 'Traveller');
    await advanceToPayment(user, 4);
    await user.click(screen.getByRole('button', { name: /confirm & pay/i }));

    await waitFor(() => expect(bookingService.create).toHaveBeenCalledTimes(1));
    const payload = bookingService.create.mock.calls[0][0];
    expect(payload.rooms).toEqual([
      { roomTypeId: 'rt-standard' },
      { roomTypeId: 'rt-standard' },
      { roomTypeId: 'rt-suite' },
    ]);
    expect(payload.guests).toHaveLength(2);
    expect(payload.guests[1]).toEqual({ firstName: 'Robin', lastName: 'Traveller', isPrimary: false });
  });

  it('keeps the guest on the page and reports the error when booking creation fails', async () => {
    bookingService.create.mockRejectedValue(new Error('Room is no longer available'));
    const user = userEvent.setup();
    renderCheckout();
    await waitFor(() => expect(screen.getByLabelText(/first name/i)).toHaveValue('Casey'));

    await advanceToPayment(user, 4);
    await user.click(screen.getByRole('button', { name: /confirm & pay/i }));

    expect(await screen.findByText('Room is no longer available')).toBeInTheDocument();
    expect(paymentService.create).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Payment' })).toBeInTheDocument();
  });

  it('stays on the payment step when the charge fails, instead of showing "Booking Received"', async () => {
    // A created-but-unpaid booking used to land on the confirmation page, which
    // read as success for something that had not been paid for.
    paymentService.create.mockRejectedValue(new Error('Gateway declined'));
    const user = userEvent.setup();
    const { router } = renderCheckout();
    await waitFor(() => expect(screen.getByLabelText(/first name/i)).toHaveValue('Casey'));

    await advanceToPayment(user, 4);
    await user.click(screen.getByRole('button', { name: /confirm & pay/i }));

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(/payment not completed/i)).toBeInTheDocument();
    expect(within(alert).getByText(/Gateway declined/i)).toBeInTheDocument();
    // The booking exists and is held, so the customer is told which one.
    expect(within(alert).getByText(/BK-2026-000001/)).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('does not let a failed payment be retried by re-booking the same rooms', async () => {
    paymentService.create.mockRejectedValue(new Error('Gateway declined'));
    const user = userEvent.setup();
    renderCheckout();
    await waitFor(() => expect(screen.getByLabelText(/first name/i)).toHaveValue('Casey'));

    await advanceToPayment(user, 4);
    await user.click(screen.getByRole('button', { name: /confirm & pay/i }));
    await screen.findByRole('alert');

    // Confirm & Pay is withdrawn: pressing it again would create a second
    // booking. Retrying charges the booking that already exists.
    expect(screen.queryByRole('button', { name: /confirm & pay/i })).not.toBeInTheDocument();
    expect(bookingService.create).toHaveBeenCalledTimes(1);

    paymentService.create.mockResolvedValue({ success: true, data: { id: 'pay-1', status: 'paid' } });
    await user.click(screen.getByRole('button', { name: /retry payment/i }));

    await waitFor(() => expect(paymentService.create).toHaveBeenCalledTimes(2));
    expect(bookingService.create).toHaveBeenCalledTimes(1);
  });

  it('surfaces a wallet gateway\u2019s approval step rather than reporting failure', async () => {
    // PayPal/bKash/Nagad answer the first charge with an approval URL, not an
    // error: the payer has to finish on the provider's page.
    paymentService.create.mockResolvedValue({
      success: true,
      data: {
        id: 'pay-1',
        status: 'failed',
        metadata: { gatewayRaw: { requiresApproval: true, approvalUrl: 'https://provider/approve' } },
      },
    });
    const user = userEvent.setup();
    const { router } = renderCheckout();
    await waitFor(() => expect(screen.getByLabelText(/first name/i)).toHaveValue('Casey'));

    await advanceToPayment(user, 4);
    await user.click(screen.getByRole('button', { name: /confirm & pay/i }));

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByRole('link', { name: /continue to provider/i })).toHaveAttribute(
      'href',
      'https://provider/approve'
    );
    expect(router.push).not.toHaveBeenCalled();
  });
});
