import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HotelList from '../views/admin/hotels/HotelList.jsx';
import ServiceList from '../views/admin/services/ServiceList.jsx';
import * as hotelService from '../services/hotelService.js';
import * as serviceService from '../services/serviceService.js';
import { renderWithProviders, SUPER_ADMIN_USER } from './testUtils.jsx';
import { SERVICE_CATALOG } from './fixtures.js';

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

vi.mock('../services/serviceService.js', () => ({
  list: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

const HOTEL_ROWS = [
  { id: 'hotel-1', name: 'Grand Palace Hotel', city: 'Dhaka', country: 'Bangladesh', starRating: 5, status: 'active' },
  { id: 'hotel-2', name: 'Ocean View Resort', city: "Cox's Bazar", country: 'Bangladesh', starRating: 4, status: 'active' },
];

const PAGINATION = { page: 1, limit: 20, total: 2, totalPages: 1 };

function renderPage(element, path) {
  return renderWithProviders(element, { user: SUPER_ADMIN_USER, pathname: path });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Admin list pages', () => {
  it('omits unselected filters from the query instead of sending status=""', async () => {
    // The API's query validators reject an empty enum string with a 422, so
    // sending it would render every list page empty.
    hotelService.list.mockResolvedValue({ success: true, data: HOTEL_ROWS, meta: { pagination: PAGINATION } });

    renderPage(<HotelList />, '/admin/hotels');

    await waitFor(() => expect(hotelService.list).toHaveBeenCalled());
    const params = hotelService.list.mock.calls[0][0];
    expect(params).toEqual({ page: 1, limit: 20 });
    expect(params).not.toHaveProperty('status');
  });

  it('renders the rows returned for the default unfiltered query', async () => {
    hotelService.list.mockResolvedValue({ success: true, data: HOTEL_ROWS, meta: { pagination: PAGINATION } });

    renderPage(<HotelList />, '/admin/hotels');

    expect(await screen.findByRole('link', { name: 'Grand Palace Hotel' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ocean View Resort' })).toBeInTheDocument();
    expect(screen.getByText('Dhaka, Bangladesh')).toBeInTheDocument();
    expect(screen.getByText('Showing 1-2 of 2')).toBeInTheDocument();
  });

  it('sends a filter once it is actually chosen', async () => {
    hotelService.list.mockResolvedValue({ success: true, data: HOTEL_ROWS, meta: { pagination: PAGINATION } });
    const user = userEvent.setup();

    renderPage(<HotelList />, '/admin/hotels');
    await screen.findByRole('link', { name: 'Grand Palace Hotel' });

    await user.selectOptions(screen.getByRole('combobox'), 'inactive');

    await waitFor(() => expect(hotelService.list).toHaveBeenCalledTimes(2));
    expect(hotelService.list.mock.calls.at(-1)[0]).toEqual({ page: 1, limit: 20, status: 'inactive' });
  });

  it('reports a failed fetch instead of showing an empty table', async () => {
    hotelService.list.mockRejectedValue(new Error('Validation failed'));

    renderPage(<HotelList />, '/admin/hotels');

    expect(await screen.findByText('Validation failed')).toBeInTheDocument();
  });

  it('loads the extra-services catalog the same way', async () => {
    serviceService.list.mockResolvedValue({
      success: true,
      data: SERVICE_CATALOG,
      meta: { pagination: { page: 1, limit: 20, total: 2, totalPages: 1 } },
    });

    renderPage(<ServiceList />, '/admin/services');

    await waitFor(() => expect(serviceService.list).toHaveBeenCalled());
    expect(serviceService.list.mock.calls[0][0]).toEqual({ page: 1, limit: 20 });
    expect(await screen.findByText('Airport Pickup')).toBeInTheDocument();
    // price 25 + tax 0 = what the guest pays
    expect(screen.getAllByText(/25/).length).toBeGreaterThan(0);
  });
});
