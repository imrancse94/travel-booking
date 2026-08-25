import { asyncHandler } from '../utils/asyncHandler.js';
import { success } from '../utils/apiResponse.js';
import { searchAvailability } from '../services/availabilityService.js';

export const search = asyncHandler(async (req, res) => {
  const { destination, hotelId, checkIn, checkOut, adults, children, rooms, roomTypeId, starRating } = req.query;
  const results = await searchAvailability({
    destination,
    hotelId,
    checkIn,
    checkOut,
    adults,
    children,
    roomsRequested: rooms,
    roomTypeId,
    starRating,
  });
  return success(res, { data: results });
});
