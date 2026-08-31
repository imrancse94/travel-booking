import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HotelSearch from '../views/customer/HotelSearch.jsx';
import * as roomService from '../services/roomService.js';
import { renderWithProviders } from './testUtils.jsx';
import { AVAILABLE_HOTEL } from './fixtures.js';

vi.mock('../services/roomService.js', () => ({
  list: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  checkAvailability: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Hotel search', () => {
  it('queries availability with the stay filters from the URL', async () => {
    roomService.checkAvailability.mockResolvedValue({ success: true, data: [AVAILABLE_HOTEL] });

    renderWithProviders(<HotelSearch />, {
      pathname: '/hotels',
      search: '?destination=Dhaka&checkIn=2026-09-10&checkOut=2026-09-13&adults=2&children=1&rooms=1&starRating=4',
    });

    await waitFor(() => expect(roomService.checkAvailability).toHaveBeenCalledTimes(1));
    expect(roomService.checkAvailability).toHaveBeenCalledWith({
      checkIn: '2026-09-10',
      checkOut: '2026-09-13',
      adults: '2',
      children: '1',
      rooms: '1',
      destination: 'Dhaka',
      starRating: '4',
    });
  });

  it('renders each result with rating, location, cheapest price and amenities', async () => {
    roomService.checkAvailability.mockResolvedValue({ success: true, data: [AVAILABLE_HOTEL] });

    renderWithProviders(<HotelSearch />, { pathname: '/hotels' });

    expect(await screen.findByRole('heading', { name: 'Grand Palace Hotel' })).toBeInTheDocument();
    expect(screen.getByText('Dhaka, Bangladesh')).toBeInTheDocument();
    expect(screen.getByText('★★★★★')).toBeInTheDocument();
    expect(screen.getByText('WiFi')).toBeInTheDocument();
    expect(screen.getByText('Swimming Pool')).toBeInTheDocument();
    expect(screen.getByText(/Free cancellation up to 7 days/)).toBeInTheDocument();

    // Cheapest of the two room types (120/night Standard, not 400/night Suite).
    const price = screen.getByText(/per night, from/).closest('.hotel-card__price');
    expect(price.textContent).toMatch(/120/);
    expect(price.textContent).not.toMatch(/400/);

    expect(screen.getByRole('link', { name: /view hotel/i })).toHaveAttribute(
      'href',
      expect.stringContaining('/hotels/hotel-grand-palace')
    );
  });

  it('shows the empty state when nothing is available', async () => {
    roomService.checkAvailability.mockResolvedValue({ success: true, data: [] });

    renderWithProviders(<HotelSearch />, { pathname: '/hotels' });

    expect(await screen.findByText(/No hotels found for these dates/i)).toBeInTheDocument();
  });

  it('shows an error state when the availability request fails', async () => {
    roomService.checkAvailability.mockRejectedValue(new Error('Availability service unavailable'));

    renderWithProviders(<HotelSearch />, { pathname: '/hotels' });

    expect(await screen.findByText(/Availability service unavailable/)).toBeInTheDocument();
  });

  it('re-runs the search with the submitted filters', async () => {
    roomService.checkAvailability.mockResolvedValue({ success: true, data: [AVAILABLE_HOTEL] });
    const user = userEvent.setup();

    const { router, unmount } = renderWithProviders(<HotelSearch />, { pathname: '/hotels' });
    await screen.findByRole('heading', { name: 'Grand Palace Hotel' });

    await user.type(screen.getByLabelText(/destination/i), "Cox's Bazar");
    await user.selectOptions(screen.getByLabelText(/star rating/i), '4');
    await user.click(screen.getByRole('button', { name: /search hotels/i }));

    // Submitting no longer re-queries directly: the filters go into the URL and
    // the new search params are what drive the next query. Both halves are
    // checked -- the URL the form produces, then the query that URL causes.
    expect(router.push).toHaveBeenCalledTimes(1);
    const pushed = new URL(router.push.mock.calls[0][0], 'http://localhost');
    expect(pushed.pathname).toBe('/hotels');
    expect(pushed.searchParams.get('destination')).toBe("Cox's Bazar");
    expect(pushed.searchParams.get('starRating')).toBe('4');

    unmount();
    renderWithProviders(<HotelSearch />, { pathname: '/hotels', search: pushed.search });

    await waitFor(() => expect(roomService.checkAvailability).toHaveBeenCalledTimes(2));
    const params = roomService.checkAvailability.mock.calls.at(-1)[0];
    expect(params.destination).toBe("Cox's Bazar");
    expect(params.starRating).toBe('4');
  });

  it('renders a placeholder instead of a price when a hotel has no configured rates', async () => {
    roomService.checkAvailability.mockResolvedValue({
      success: true,
      data: [
        {
          ...AVAILABLE_HOTEL,
          roomTypes: [{ ...AVAILABLE_HOTEL.roomTypes[0], ratePerNight: null, totalPrice: null, currency: null }],
        },
      ],
    });

    renderWithProviders(<HotelSearch />, { pathname: '/hotels' });

    const card = (await screen.findByRole('heading', { name: 'Grand Palace Hotel' })).closest('.hotel-card');
    expect(within(card).getByText(/Contact us for pricing/i)).toBeInTheDocument();
  });
});
