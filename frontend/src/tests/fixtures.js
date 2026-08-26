// Fixtures mirroring the real API envelopes, so component tests exercise the
// same shapes the backend returns:
//   - availability: backend/src/services/availabilityService.js -> searchAvailability()
//   - hotel detail: GET /hotels/:id
//   - booking:      GET /bookings/:id

export const AVAILABILITY_ROOM_TYPE = {
  id: 'rt-standard',
  name: 'Standard',
  description: 'Comfortable room with a queen bed.',
  maxAdults: 2,
  maxChildren: 1,
  bedType: 'Queen',
  images: [],
  amenities: [],
  availableRooms: 2,
  nights: 3,
  ratePerNight: '120.00',
  totalPrice: '360.00',
  currency: 'USD',
};

export const AVAILABILITY_ROOM_TYPE_SOLD_OUT = {
  ...AVAILABILITY_ROOM_TYPE,
  id: 'rt-suite',
  name: 'Suite',
  availableRooms: 0,
  ratePerNight: '400.00',
  totalPrice: '1200.00',
};

export const AVAILABLE_HOTEL = {
  id: 'hotel-grand-palace',
  name: 'Grand Palace Hotel',
  description: 'A five star stay in the heart of the city.',
  city: 'Dhaka',
  country: 'Bangladesh',
  starRating: 5,
  images: [{ id: 'img-1', url: 'https://cdn.example.com/grand-palace.jpg', sortOrder: 0 }],
  amenities: [
    { id: 'am-wifi', name: 'WiFi' },
    { id: 'am-pool', name: 'Swimming Pool' },
  ],
  cancellationPolicy: 'Free cancellation up to 7 days before check-in.',
  roomTypes: [AVAILABILITY_ROOM_TYPE, AVAILABILITY_ROOM_TYPE_SOLD_OUT],
};

export const HOTEL_DETAIL = {
  id: 'hotel-grand-palace',
  name: 'Grand Palace Hotel',
  description: 'A five star stay in the heart of the city.',
  address: '12 Gulshan Avenue',
  city: 'Dhaka',
  country: 'Bangladesh',
  starRating: 5,
  checkInTime: '14:00',
  checkOutTime: '12:00',
  cancellationPolicy: 'Free cancellation up to 7 days before check-in.',
  childPolicy: 'Children under 6 stay free.',
  petPolicy: 'Pets are not allowed.',
  status: 'active',
  images: [{ id: 'img-1', url: 'https://cdn.example.com/grand-palace.jpg' }],
  hotelAmenities: [
    { id: 'ha-1', amenityId: 'am-wifi', amenity: { id: 'am-wifi', name: 'WiFi' } },
    { id: 'ha-2', amenityId: 'am-gym', amenity: { id: 'am-gym', name: 'Gym' } },
  ],
};

export const CONFIRMED_BOOKING = {
  id: 'booking-1',
  bookingNumber: 'BK-2026-000001',
  status: 'confirmed',
  checkIn: '2026-09-10T00:00:00.000Z',
  checkOut: '2026-09-13T00:00:00.000Z',
  adults: 2,
  children: 0,
  currency: 'USD',
  totalAmount: '360.00',
  paidAmount: '360.00',
  dueAmount: '0.00',
  hotel: { id: 'hotel-grand-palace', name: 'Grand Palace Hotel' },
  bookingRooms: [
    {
      id: 'br-1',
      roomType: { id: 'rt-standard', name: 'Standard' },
      room: { id: 'room-101', roomNumber: '101' },
      checkIn: '2026-09-10T00:00:00.000Z',
      checkOut: '2026-09-13T00:00:00.000Z',
      nights: 3,
      totalPrice: '360.00',
      currency: 'USD',
    },
  ],
};

export const CHECKOUT_STATE = {
  hotelId: 'hotel-grand-palace',
  hotelName: 'Grand Palace Hotel',
  checkIn: '2026-09-10',
  checkOut: '2026-09-13',
  adults: 1,
  children: 0,
  currency: 'USD',
  estimatedTotal: 360,
  selections: [
    {
      roomTypeId: 'rt-standard',
      name: 'Standard',
      quantity: 1,
      nights: 3,
      ratePerNight: '120.00',
      totalPrice: '360.00',
      currency: 'USD',
    },
  ],
};

export const SERVICE_CATALOG = [
  { id: 'svc-airport', name: 'Airport Pickup', description: 'Sedan from the airport', price: '25.00', tax: '0.00', status: 'active' },
  { id: 'svc-breakfast', name: 'Breakfast', description: 'Daily buffet', price: '15.00', tax: '0.00', status: 'active' },
];
