import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HotelDetails from '../views/customer/HotelDetails.jsx';
import * as hotelService from '../services/hotelService.js';
import * as roomService from '../services/roomService.js';
import { renderWithProviders, CUSTOMER_USER } from './testUtils.jsx';
import { readCheckoutDraft } from '../lib/navState.js';
import { AVAILABLE_HOTEL, HOTEL_DETAIL } from './fixtures.js';

vi.mock('../services/hotelService.js', () => ({
  list: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  addImage: vi.fn(),
  removeImage: vi.fn(),
  setAmenities: vi.fn(),
}));

vi.mock('../services/roomService.js', () => ({
  list: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  checkAvailability: vi.fn(),
}));

const STAY_QUERY = '?checkIn=2026-09-10&checkOut=2026-09-13&adults=2&children=0&rooms=1';

function renderPage(options = {}) {
  return renderWithProviders(<HotelDetails />, {
    pathname: '/hotels/hotel-grand-palace',
    search: STAY_QUERY,
    params: { id: 'hotel-grand-palace' },
    ...options,
  });
}

async function standardCard() {
  return (await screen.findByRole('heading', { name: 'Standard', level: 4 })).closest('.room-type-card');
}

beforeEach(() => {
  vi.clearAllMocks();
  hotelService.getById.mockResolvedValue({ success: true, data: HOTEL_DETAIL });
  roomService.checkAvailability.mockResolvedValue({ success: true, data: [AVAILABLE_HOTEL] });
});

describe('Room selection', () => {
  it('adds rooms and shows a running selection summary', async () => {
    const user = userEvent.setup();
    renderPage({ user: CUSTOMER_USER });

    const card = await standardCard();
    expect(screen.queryByText(/Selection Summary/i)).not.toBeInTheDocument();

    await user.click(within(card).getByRole('button', { name: '+' }));

    expect(screen.getByText(/Selection Summary/i)).toBeInTheDocument();
    expect(screen.getByText('1 × Standard')).toBeInTheDocument();
    const total = screen.getByText(/Estimated Total/).closest('.summary-line');
    expect(total.textContent).toMatch(/360/);
    expect(screen.getByText(/The final total is calculated when you book/i)).toBeInTheDocument();
  });

  it('never lets the guest select more rooms than are available', async () => {
    const user = userEvent.setup();
    renderPage({ user: CUSTOMER_USER });

    const card = await standardCard();
    const plus = within(card).getByRole('button', { name: '+' });
    await user.click(plus);
    await user.click(plus);
    await user.click(plus); // only 2 rooms left -- this one must be ignored

    expect(within(card).getByText('2')).toBeInTheDocument();
    expect(screen.getByText('2 × Standard')).toBeInTheDocument();
    const total = screen.getByText(/Estimated Total/).closest('.summary-line');
    expect(total.textContent).toMatch(/720/);
  });

  it('removes the room from the summary when the quantity returns to zero', async () => {
    const user = userEvent.setup();
    renderPage({ user: CUSTOMER_USER });

    const card = await standardCard();
    await user.click(within(card).getByRole('button', { name: '+' }));
    expect(screen.getByText(/Selection Summary/i)).toBeInTheDocument();

    await user.click(within(card).getByRole('button', { name: '−' }));
    expect(screen.queryByText(/Selection Summary/i)).not.toBeInTheDocument();
  });

  it('hands the selection to checkout for a signed-in guest', async () => {
    const user = userEvent.setup();
    const { router } = renderPage({ user: CUSTOMER_USER });

    const card = await standardCard();
    await user.click(within(card).getByRole('button', { name: '+' }));
    await user.click(screen.getByRole('button', { name: /proceed to checkout/i }));

    expect(router.push).toHaveBeenCalledWith('/checkout');

    // The selection can no longer ride along with the navigation, so it is
    // handed over through sessionStorage instead.
    const state = readCheckoutDraft();
    expect(state).toMatchObject({
      hotelId: 'hotel-grand-palace',
      hotelName: 'Grand Palace Hotel',
      checkIn: '2026-09-10',
      checkOut: '2026-09-13',
      adults: 2,
      children: 0,
      currency: 'USD',
      estimatedTotal: 360,
    });
    expect(state.selections).toEqual([
      {
        roomTypeId: 'rt-standard',
        name: 'Standard',
        quantity: 1,
        nights: 3,
        ratePerNight: '120.00',
        totalPrice: '360.00',
        currency: 'USD',
      },
    ]);
  });

  it('sends an anonymous guest to login and remembers the hotel they came from', async () => {
    const user = userEvent.setup();
    const { router } = renderPage();

    const card = await standardCard();
    await user.click(within(card).getByRole('button', { name: '+' }));
    await user.click(screen.getByRole('button', { name: /proceed to checkout/i }));

    expect(router.push).toHaveBeenCalledTimes(1);
    const target = decodeURIComponent(router.push.mock.calls[0][0]);
    expect(target).toContain('/login?from=/hotels/hotel-grand-palace');
    expect(target).toContain('checkIn=2026-09-10');
    expect(screen.getByText(/Please sign in to continue booking/i)).toBeInTheDocument();
  });

  it('clears the selection when the stay dates change', async () => {
    const user = userEvent.setup();
    renderPage({ user: CUSTOMER_USER });

    const card = await standardCard();
    await user.click(within(card).getByRole('button', { name: '+' }));
    expect(screen.getByText(/Selection Summary/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /update search/i }));

    await screen.findByRole('heading', { name: 'Grand Palace Hotel' });
    expect(screen.queryByText(/Selection Summary/i)).not.toBeInTheDocument();
  });
});
