'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Button, DateRangePicker, DestinationField, Select } from '../components/ui/index.js';
import * as destinationService from '../services/destinationService.js';

function todayPlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const GUEST_OPTIONS = [1, 2, 3, 4, 5, 6].map((n) => ({
  value: String(n),
  label: `${n} guest${n === 1 ? '' : 's'}`,
}));

// Decorative throughout -- every icon is aria-hidden and paired with real text.
function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function IconArrow() {
  return (
    <svg className="destination-card__arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

const VALUE_PROPS = [
  {
    title: 'Every stay in one place',
    text: 'Hotels, tour packages and airport transport booked from a single account, with one itinerary and one invoice.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-5h6v5" />
      </svg>
    ),
  },
  {
    title: 'The price you see is the price you pay',
    text: 'Rates include taxes and fees, shown in your currency, with the full breakdown before you confirm.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v10M9.5 9.5A2.5 2.5 0 0 1 12 8h1.5M14.5 14.5A2.5 2.5 0 0 1 12 16h-1.5" />
      </svg>
    ),
  },
  {
    title: 'Plans change — that is fine',
    text: 'Most rooms can be cancelled free of charge up to the property’s deadline, straight from My Bookings.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 12a9 9 0 1 1-3.2-6.9" />
        <path d="M21 4v5h-5" />
      </svg>
    ),
  },
];

export function Home() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [destination, setDestination] = useState('');
  // Empty until mount. This page is statically prerendered, so computing
  // today+N during render bakes the BUILD date into the HTML -- an image built
  // a fortnight ago would offer check-in dates in the past, then visibly flip
  // once React hydrated with the real value.
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');

  useEffect(() => {
    setCheckIn(todayPlus(7));
    setCheckOut(todayPlus(10));
  }, []);
  const [adults, setAdults] = useState('2');
  const [destinations, setDestinations] = useState([]);

  // Best-effort: the section is simply omitted if the request fails or the
  // catalogue is empty, so the landing page never shows a broken shelf.
  useEffect(() => {
    let cancelled = false;
    destinationService
      .list({ status: 'active', limit: 8 })
      .then((res) => {
        if (!cancelled) setDestinations(res.data || []);
      })
      .catch(() => {
        if (!cancelled) setDestinations([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function searchUrl(overrides = {}) {
    const params = new URLSearchParams({
      checkIn,
      checkOut,
      adults,
      children: '0',
      rooms: '1',
      ...overrides,
    });
    return `/hotels?${params.toString()}`;
  }

  function handleSearch(e) {
    e.preventDefault();
    const trimmed = destination.trim();
    router.push(searchUrl(trimmed ? { destination: trimmed } : {}));
  }

  return (
    <div>
      <section className="hero">
        <div className="container">
          <div className="hero__inner">
            <p className="hero__eyebrow">Hotels · Tours · Transport</p>
            <h1 className="hero__title">
              {isAuthenticated ? `Welcome back, ${user?.firstName || 'traveller'}.` : 'Book the whole trip, not just the room.'}
            </h1>
            <p className="hero__subtitle">
              {isAuthenticated
                ? 'Pick up where you left off — search availability, review an itinerary, or check an invoice.'
                : 'Search live availability across our hotels, add tours and transfers, and confirm it all in one booking.'}
            </p>
          </div>

          <form className="search-panel--hero" onSubmit={handleSearch}>
            <div className="search-panel__grid">
              <DestinationField value={destination} onChange={setDestination} />
              <DateRangePicker
                className="search-panel__dates"
                startDate={checkIn}
                endDate={checkOut}
                onChange={({ startDate, endDate }) => {
                  setCheckIn(startDate);
                  setCheckOut(endDate);
                }}
              />
              <Select label="Guests" options={GUEST_OPTIONS} value={adults} onChange={(e) => setAdults(e.target.value)} />
              <Button type="submit" className="search-panel__submit" disabled={!checkIn || !checkOut}>
                Search
              </Button>
            </div>
          </form>
        </div>
      </section>

      <div className="container landing-body">
        <ul className="trust-strip">
          <li className="trust-strip__item">
            <IconCheck />
            Free cancellation on most rooms
          </li>
          <li className="trust-strip__item">
            <IconCheck />
            Instant confirmation
          </li>
          <li className="trust-strip__item">
            <IconCheck />
            No booking fees
          </li>
        </ul>

        {destinations.length > 0 && (
          <section className="landing-section">
            <div className="landing-section__head">
              <h2 className="landing-section__title">Popular destinations</h2>
              <p className="landing-section__lead">Jump straight to availability for your selected dates.</p>
            </div>
            <div className="destination-grid">
              {destinations.map((d) => (
                <Link key={d.id} href={searchUrl({ destination: d.name })} className="destination-card">
                  <span className="destination-card__label">
                    <span className="destination-card__name">{d.name}</span>
                    {d.country && <span className="destination-card__country">, {d.country}</span>}
                  </span>
                  <IconArrow />
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="landing-section">
          <div className="landing-section__head">
            <h2 className="landing-section__title">Why book with us</h2>
          </div>
          <div className="value-grid">
            {VALUE_PROPS.map((item) => (
              <div key={item.title} className="value-item">
                <span className="value-item__icon">{item.icon}</span>
                <h3 className="value-item__title">{item.title}</h3>
                <p className="value-item__text">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="landing-section">
          <div className="cta-band">
            <div>
              <h2 className="cta-band__title">Not sure where yet?</h2>
              <p className="cta-band__text">Browse every property and filter by city, rating and price.</p>
            </div>
            <Button as={Link} href={searchUrl()}>
              Browse all hotels
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Home;
