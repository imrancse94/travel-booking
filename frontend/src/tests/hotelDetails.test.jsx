import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import HotelDetails from '../pages/customer/HotelDetails.jsx';
import * as hotelService from '../services/hotelService.js';
import * as roomService from '../services/roomService.js';
import { renderWithProviders } from './testUtils.jsx';
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

function renderHotelDetails(options = {}) {
  return renderWithProviders(
    <Routes>
      <Route path="/hotels/:id" element={<HotelDetails />} />
    </Routes>,
    { initialEntries: [`/hotels/hotel-grand-palace${STAY_QUERY}`], ...options }
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  hotelService.getById.mockResolvedValue({ success: true, data: HOTEL_DETAIL });
  roomService.checkAvailability.mockResolvedValue({ success: true, data: [AVAILABLE_HOTEL] });
});

describe('Hotel details page', () => {
  it('loads the hotel profile and its availability for the requested stay', async () => {
    renderHotelDetails();

    expect(await screen.findByRole('heading', { name: 'Grand Palace Hotel' })).toBeInTheDocument();
    expect(hotelService.getById).toHaveBeenCalledWith('hotel-grand-palace');
    expect(roomService.checkAvailability).toHaveBeenCalledWith({
      hotelId: 'hotel-grand-palace',
      checkIn: '2026-09-10',
      checkOut: '2026-09-13',
      adults: '2',
      children: '0',
      rooms: '1',
    });
  });

  it('shows rating, address, images, amenities and every policy', async () => {
    renderHotelDetails();

    expect(await screen.findByRole('heading', { name: 'Grand Palace Hotel' })).toBeInTheDocument();
    expect(screen.getByText(/★★★★★ · 12 Gulshan Avenue, Dhaka, Bangladesh/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Grand Palace Hotel' })).toHaveAttribute(
      'src',
      'https://cdn.example.com/grand-palace.jpg'
    );
    expect(screen.getByText('WiFi')).toBeInTheDocument();
    expect(screen.getByText('Gym')).toBeInTheDocument();
    expect(screen.getByText('14:00 / 12:00')).toBeInTheDocument();
    expect(screen.getByText('Free cancellation up to 7 days before check-in.')).toBeInTheDocument();
    expect(screen.getByText('Children under 6 stay free.')).toBeInTheDocument();
    expect(screen.getByText('Pets are not allowed.')).toBeInTheDocument();
  });

  it('lists available room types with occupancy, rate and remaining rooms', async () => {
    renderHotelDetails();

    const standard = (await screen.findByRole('heading', { name: 'Standard', level: 4 })).closest('.room-type-card');
    expect(within(standard).getByText(/Up to 2 adults, 1 children · Queen/)).toBeInTheDocument();
    expect(within(standard).getByText(/2 room\(s\) left · 3 night\(s\)/)).toBeInTheDocument();
    expect(within(standard).getByText(/\/night/).textContent).toMatch(/120/);
    expect(within(standard).getByText(/total for 3 night\(s\)/).textContent).toMatch(/360/);
  });

  it('marks a sold-out room type as unavailable rather than selectable', async () => {
    renderHotelDetails();

    const suite = (await screen.findByRole('heading', { name: 'Suite', level: 4 })).closest('.room-type-card');
    expect(within(suite).getByText(/Sold out for these dates/)).toBeInTheDocument();
    expect(within(suite).getByRole('button', { name: /unavailable/i })).toBeDisabled();
  });

  it('tells the visitor when nothing is available for the dates', async () => {
    roomService.checkAvailability.mockResolvedValue({ success: true, data: [] });
    renderHotelDetails();

    expect(await screen.findByText(/No rooms available for these dates/i)).toBeInTheDocument();
  });

  it('re-queries availability when the stay is changed', async () => {
    const user = userEvent.setup();
    renderHotelDetails();
    await screen.findByRole('heading', { name: 'Grand Palace Hotel' });

    await user.clear(screen.getByLabelText(/adults/i));
    await user.type(screen.getByLabelText(/adults/i), '3');
    await user.click(screen.getByRole('button', { name: /update search/i }));

    await screen.findByRole('heading', { name: 'Grand Palace Hotel' });
    expect(roomService.checkAvailability.mock.calls.at(-1)[0].adults).toBe('3');
  });

  it('surfaces an error state when the hotel cannot be loaded', async () => {
    hotelService.getById.mockRejectedValue(new Error('Hotel not found'));
    renderHotelDetails();

    expect(await screen.findByText(/Could not load this hotel: Hotel not found/)).toBeInTheDocument();
  });
});
