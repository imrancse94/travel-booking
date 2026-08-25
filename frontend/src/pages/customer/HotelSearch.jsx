import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, Card, Input, Loader, Select, StatusBadge } from '../../components/ui/index.js';
import * as roomService from '../../services/roomService.js';
import { formatCurrency } from '../../utils/format.js';

function todayPlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const STAR_OPTIONS = [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n}+ stars` }));

function cheapestRoomType(roomTypes) {
  const priced = (roomTypes || []).filter((rt) => rt.ratePerNight != null);
  if (!priced.length) return null;
  return priced.reduce((min, rt) => (Number(rt.ratePerNight) < Number(min.ratePerNight) ? rt : min), priced[0]);
}

/** Public hotel search: destination/date/occupancy filters over GET /rooms/availability, rendered as result cards. */
export function HotelSearch() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState({
    destination: searchParams.get('destination') || '',
    checkIn: searchParams.get('checkIn') || todayPlus(7),
    checkOut: searchParams.get('checkOut') || todayPlus(10),
    adults: searchParams.get('adults') || '2',
    children: searchParams.get('children') || '0',
    rooms: searchParams.get('rooms') || '1',
    starRating: searchParams.get('starRating') || '',
  });

  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkIn = searchParams.get('checkIn') || todayPlus(7);
    const checkOut = searchParams.get('checkOut') || todayPlus(10);
    const params = {
      checkIn,
      checkOut,
      adults: searchParams.get('adults') || '2',
      children: searchParams.get('children') || '0',
      rooms: searchParams.get('rooms') || '1',
    };
    const destination = searchParams.get('destination');
    const starRating = searchParams.get('starRating');
    if (destination) params.destination = destination;
    if (starRating) params.starRating = starRating;

    let cancelled = false;
    setLoading(true);
    setError(null);
    roomService
      .checkAvailability(params)
      .then((res) => {
        if (!cancelled) setHotels(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  function setField(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  function handleSearch(e) {
    e.preventDefault();
    const next = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value != null) next[key] = value;
    });
    setSearchParams(next);
  }

  function detailLink(hotelId) {
    const params = new URLSearchParams({
      checkIn: searchParams.get('checkIn') || filters.checkIn,
      checkOut: searchParams.get('checkOut') || filters.checkOut,
      adults: searchParams.get('adults') || filters.adults,
      children: searchParams.get('children') || filters.children,
      rooms: searchParams.get('rooms') || filters.rooms,
    });
    return `/hotels/${hotelId}?${params.toString()}`;
  }

  return (
    <div className="container page-section">
      <Card className="search-panel">
        <form onSubmit={handleSearch}>
          <div className="search-panel__grid">
            <Input
              label="Destination"
              placeholder="City or hotel name"
              value={filters.destination}
              onChange={(e) => setField('destination', e.target.value)}
            />
            <Input label="Check-in" type="date" required value={filters.checkIn} onChange={(e) => setField('checkIn', e.target.value)} />
            <Input label="Check-out" type="date" required value={filters.checkOut} onChange={(e) => setField('checkOut', e.target.value)} />
            <Input label="Adults" type="number" min="1" value={filters.adults} onChange={(e) => setField('adults', e.target.value)} />
            <Input label="Children" type="number" min="0" value={filters.children} onChange={(e) => setField('children', e.target.value)} />
            <Input label="Rooms" type="number" min="1" value={filters.rooms} onChange={(e) => setField('rooms', e.target.value)} />
            <Select
              label="Star Rating"
              placeholder="Any rating"
              value={filters.starRating}
              onChange={(e) => setField('starRating', e.target.value)}
              options={STAR_OPTIONS}
            />
          </div>
          <div className="search-panel__actions">
            <Button type="submit">Search Hotels</Button>
          </div>
        </form>
      </Card>

      {loading ? (
        <Loader label="Searching hotels..." />
      ) : error ? (
        <div className="error-state">
          <p>Could not load hotels: {error.message}</p>
        </div>
      ) : hotels.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state__icon">🏨</span>
          <p>No hotels found for these dates. Try adjusting your search.</p>
        </div>
      ) : (
        <div className="hotel-results">
          {hotels.map((hotel) => {
            const cheapest = cheapestRoomType(hotel.roomTypes);
            const image = hotel.images?.[0];
            const imageUrl = typeof image === 'string' ? image : image?.url;
            return (
              <Card key={hotel.id} className="hotel-card">
                {imageUrl ? (
                  <img className="hotel-card__image" src={imageUrl} alt={hotel.name} />
                ) : (
                  <div className="hotel-card__image hotel-card__image--placeholder">🏨</div>
                )}
                <div className="hotel-card__body">
                  <div className="hotel-card__title-row">
                    <h3 className="hotel-card__name">{hotel.name}</h3>
                    {hotel.starRating ? <span className="hotel-card__rating">{'★'.repeat(hotel.starRating)}</span> : null}
                  </div>
                  <p className="hotel-card__location">{[hotel.city, hotel.country].filter(Boolean).join(', ') || '—'}</p>

                  {hotel.amenities?.length > 0 && (
                    <div className="hotel-card__amenities">
                      {hotel.amenities.slice(0, 4).map((a) => (
                        <StatusBadge key={a.id || a.name} status={a.name} tone="info" />
                      ))}
                    </div>
                  )}

                  {hotel.cancellationPolicy && (
                    <p className="text-muted" style={{ fontSize: '0.78rem' }}>
                      {hotel.cancellationPolicy.length > 100
                        ? `${hotel.cancellationPolicy.slice(0, 100)}...`
                        : hotel.cancellationPolicy}
                    </p>
                  )}

                  <div className="hotel-card__footer">
                    <div className="hotel-card__price">
                      {cheapest ? (
                        <>
                          {formatCurrency(cheapest.ratePerNight, cheapest.currency)}
                          <span className="hotel-card__price-hint">per night, from</span>
                        </>
                      ) : (
                        <span className="hotel-card__price-hint">Contact us for pricing</span>
                      )}
                    </div>
                    <Button as={Link} to={detailLink(hotel.id)}>
                      View Hotel
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default HotelSearch;
