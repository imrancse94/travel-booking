'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, DateRangePicker, DestinationField, Loader, OccupancyField, Select } from '../../components/ui/index.js';
import * as roomService from '../../services/roomService.js';
import { formatCurrency, formatDate } from '../../utils/format.js';

function todayPlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const STAR_OPTIONS = [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n}+ stars` }));

const SORT_OPTIONS = [
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'rating-desc', label: 'Star rating' },
];

function cheapestRoomType(roomTypes) {
  const priced = (roomTypes || []).filter((rt) => rt.ratePerNight != null);
  if (!priced.length) return null;
  return priced.reduce((min, rt) => (Number(rt.ratePerNight) < Number(min.ratePerNight) ? rt : min), priced[0]);
}

/** Public hotel search: destination/date/occupancy filters over GET /rooms/availability, rendered as result cards. */
export function HotelSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState({
    destination: searchParams.get('destination') || '',
    checkIn: searchParams.get('checkIn') || '',
    checkOut: searchParams.get('checkOut') || '',
    adults: searchParams.get('adults') || '2',
    children: searchParams.get('children') || '0',
    rooms: searchParams.get('rooms') || '1',
    starRating: searchParams.get('starRating') || '',
  });

  // Filled after mount for the same reason as the landing page: a date derived
  // from "now" must not be computed while rendering a prerenderable page.
  useEffect(() => {
    setFilters((f) => ({
      ...f,
      checkIn: f.checkIn || todayPlus(7),
      checkOut: f.checkOut || todayPlus(10),
    }));
  }, []);

  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Sorting is applied to the results already in hand -- re-querying the
  // availability endpoint just to reorder them would be wasted work.
  const [sort, setSort] = useState('price-asc');

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

  const sortedHotels = useMemo(() => {
    const rate = (h) => {
      const cheapest = cheapestRoomType(h.roomTypes);
      return cheapest ? Number(cheapest.ratePerNight) : null;
    };
    return [...hotels].sort((a, b) => {
      if (sort === 'rating-desc') return (b.starRating || 0) - (a.starRating || 0);
      const ra = rate(a);
      const rb = rate(b);
      // Hotels with no configured rate always sort last, whichever direction
      // the price sort is going.
      if (ra == null && rb == null) return 0;
      if (ra == null) return 1;
      if (rb == null) return -1;
      return sort === 'price-desc' ? rb - ra : ra - rb;
    });
  }, [hotels, sort]);

  const stayLabel = `${formatDate(filters.checkIn)} – ${formatDate(filters.checkOut)}`;
  const guestLabel = [
    `${filters.adults} adult${filters.adults === '1' ? '' : 's'}`,
    Number(filters.children) > 0 ? `${filters.children} children` : null,
    `${filters.rooms} room${filters.rooms === '1' ? '' : 's'}`,
  ]
    .filter(Boolean)
    .join(' · ');

  function handleSearch(e) {
    e.preventDefault();
    const next = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value != null) next[key] = value;
    });
    // next/navigation has no setter for search params -- pushing the new
    // query string is the equivalent, and keeps the search shareable.
    router.push(`/hotels?${new URLSearchParams(next).toString()}`);
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
      <section className="filter-bar">
        <form onSubmit={handleSearch}>
          <div className="search-panel__grid filter-bar__grid">
            <DestinationField
              value={filters.destination}
              onChange={(next) => setField('destination', next)}
            />
            <DateRangePicker
              className="search-panel__dates"
              startDate={filters.checkIn}
              endDate={filters.checkOut}
              onChange={({ startDate, endDate }) =>
                setFilters((f) => ({ ...f, checkIn: startDate, checkOut: endDate }))
              }
            />
            <OccupancyField
              value={{ adults: filters.adults, children: filters.children, rooms: filters.rooms }}
              onChange={(next) =>
                setFilters((f) => ({
                  ...f,
                  adults: String(next.adults),
                  children: String(next.children),
                  rooms: String(next.rooms),
                }))
              }
            />
            <Select
              label="Star Rating"
              placeholder="Any rating"
              value={filters.starRating}
              onChange={(e) => setField('starRating', e.target.value)}
              options={STAR_OPTIONS}
            />
          </div>
          <div className="search-panel__actions">
            <Button type="submit" className="search-panel__submit" disabled={!filters.checkIn || !filters.checkOut}>
              Search Hotels
            </Button>
          </div>
        </form>
      </section>

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
        <>
          <div className="results-head">
            <div>
              <h1 className="results-head__title">
                {hotels.length} hotel{hotels.length === 1 ? '' : 's'} available
              </h1>
              <p className="results-head__meta">
                {stayLabel} &middot; {guestLabel}
                {filters.destination ? ` · ${filters.destination}` : ''}
              </p>
            </div>
            <Select
              label="Sort by"
              className="results-head__sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              options={SORT_OPTIONS}
            />
          </div>

          <div className="hotel-results">
          {sortedHotels.map((hotel) => {
            const cheapest = cheapestRoomType(hotel.roomTypes);
            const image = hotel.images?.[0];
            const imageUrl = typeof image === 'string' ? image : image?.url;
            return (
              <article key={hotel.id} className="hotel-card">
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
                        <span key={a.id || a.name} className="amenity-chip">
                          {a.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {hotel.cancellationPolicy && (
                    <p className="hotel-card__policy">
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
                    <Button as={Link} href={detailLink(hotel.id)}>
                      View Hotel
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
          </div>
        </>
      )}
    </div>
  );
}

export default HotelSearch;
