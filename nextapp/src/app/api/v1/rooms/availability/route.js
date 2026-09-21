import { apiHandler } from '../../../../../server/lib/apiHandler.js';
import { parseQuery } from '../../../../../server/lib/parseRequest.js';
import { success } from '../../../../../server/lib/apiResponse.js';
import { availabilityQuerySchema } from '../../../../../server/validators/booking.validators.js';
import { searchAvailability } from '../../../../../server/services/availabilityService.js';

export const GET = apiHandler(async (request) => {
  const { destination, hotelId, checkIn, checkOut, adults, children, rooms, roomTypeId, starRating } = parseQuery(
    request,
    availabilityQuerySchema
  );
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
  return success({ data: results });
});
