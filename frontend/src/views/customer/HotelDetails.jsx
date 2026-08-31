'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Button, Card, DateRangePicker, Input, Loader, StatusBadge, useToast } from '../../components/ui/index.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import * as hotelService from '../../services/hotelService.js';
import * as roomService from '../../services/roomService.js';
import { formatCurrency } from '../../utils/format.js';
import { loginUrlFrom, saveCheckoutDraft } from '../../lib/navState.js';

function todayPlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Hotel profile + room-type availability/selection for the given stay; hands the selection off to /checkout via sessionStorage. */
export function HotelDetails() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { show } = useToast();

  const [hotel, setHotel] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const stay = {
    checkIn: searchParams.get('checkIn') || todayPlus(7),
    checkOut: searchParams.get('checkOut') || todayPlus(10),
    adults: searchParams.get('adults') || '2',
    children: searchParams.get('children') || '0',
    rooms: searchParams.get('rooms') || '1',
  };
  const [stayForm, setStayForm] = useState(stay);

  const [selection, setSelection] = useState({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      hotelService.getById(id),
      roomService.checkAvailability({ hotelId: id, ...stay }),
    ])
      .then(([hotelRes, availRes]) => {
        if (cancelled) return;
        setHotel(hotelRes.data);
        setAvailability((availRes.data || [])[0] || null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, searchParams]);

  function handleUpdateStay(e) {
    e.preventDefault();
    // replace, not push: changing the stay dates refines the current view
    // rather than adding a step the back button has to walk through.
    router.replace(`/hotels/${id}?${new URLSearchParams(stayForm).toString()}`);
    setSelection({});
  }

  function setQuantity(roomTypeId, quantity, max) {
    const clamped = Math.max(0, Math.min(quantity, max));
    setSelection((prev) => {
      const next = { ...prev };
      if (clamped === 0) delete next[roomTypeId];
      else next[roomTypeId] = clamped;
      return next;
    });
  }

  // `|| []` builds a fresh array on every render, so it changed the identity of
  // the useMemo dependency below and defeated the memo entirely.
  const roomTypes = useMemo(() => availability?.roomTypes || [], [availability]);

  const selectedRows = useMemo(
    () =>
      Object.entries(selection)
        .map(([roomTypeId, quantity]) => {
          const rt = roomTypes.find((r) => r.id === roomTypeId);
          if (!rt) return null;
          return { roomType: rt, quantity };
        })
        .filter(Boolean),
    [selection, roomTypes]
  );

  const totalSelectedRooms = selectedRows.reduce((sum, r) => sum + r.quantity, 0);
  const hasPricedSelection = selectedRows.every((r) => r.roomType.ratePerNight != null);
  const estimatedTotal = selectedRows.reduce(
    (sum, r) => sum + (r.roomType.totalPrice != null ? Number(r.roomType.totalPrice) * r.quantity : 0),
    0
  );
  const currency = selectedRows[0]?.roomType.currency || 'USD';

  function handleProceedToCheckout() {
    if (totalSelectedRooms === 0) return;
    const checkoutState = {
      hotelId: id,
      hotelName: hotel?.name,
      checkIn: stay.checkIn,
      checkOut: stay.checkOut,
      adults: Number(stay.adults),
      children: Number(stay.children),
      currency,
      estimatedTotal,
      selections: selectedRows.map((r) => ({
        roomTypeId: r.roomType.id,
        name: r.roomType.name,
        quantity: r.quantity,
        nights: r.roomType.nights,
        ratePerNight: r.roomType.ratePerNight,
        totalPrice: r.roomType.totalPrice,
        currency: r.roomType.currency,
      })),
    };

    if (!isAuthenticated) {
      show('Please sign in to continue booking.', 'info');
      router.push(loginUrlFrom(`/hotels/${id}?${searchParams.toString()}`));
      return;
    }
    // The App Router cannot carry an object through a navigation, so the
    // selection is handed to /checkout through sessionStorage instead.
    saveCheckoutDraft(checkoutState);
    router.push('/checkout');
  }

  if (loading) return <Loader label="Loading hotel..." />;
  if (error || !hotel) {
    return (
      <div className="container page-section">
        <div className="error-state">
          <p>Could not load this hotel{error ? `: ${error.message}` : '.'}</p>
        </div>
      </div>
    );
  }

  const images = hotel.images || [];
  const amenities = hotel.hotelAmenities || hotel.amenities || [];

  return (
    <div className="container page-section">
      <div className="hotel-detail__top">
        <div>
          <div className="page-header">
            <div>
              <h1 className="page-title">{hotel.name}</h1>
              <p className="page-subtitle">
                {hotel.starRating ? `${'★'.repeat(hotel.starRating)} · ` : ''}
                {[hotel.address, hotel.city, hotel.country].filter(Boolean).join(', ')}
              </p>
            </div>
          </div>

          {images.length > 0 && (
            <div className="hotel-detail__gallery">
              {images.map((img) => {
                const url = typeof img === 'string' ? img : img.url;
                return <img key={img.id || url} src={url} alt={hotel.name} />;
              })}
            </div>
          )}

          {hotel.description && <p style={{ marginTop: 'var(--space-4)' }}>{hotel.description}</p>}

          {amenities.length > 0 && (
            <Card title="Amenities" style={{ marginTop: 'var(--space-4)' }}>
              <div className="inline-actions">
                {amenities.map((a) => (
                  <StatusBadge key={a.id || a.amenityId || a.name} status={a.amenity?.name || a.name} tone="info" />
                ))}
              </div>
            </Card>
          )}

          <Card title="Policies" style={{ marginTop: 'var(--space-4)' }}>
            <div className="detail-list">
              <div>
                <p className="detail-item__label">Check-in / Check-out</p>
                <p className="detail-item__value">
                  {hotel.checkInTime} / {hotel.checkOutTime}
                </p>
              </div>
              <div>
                <p className="detail-item__label">Cancellation</p>
                <p className="detail-item__value">{hotel.cancellationPolicy || '—'}</p>
              </div>
              <div>
                <p className="detail-item__label">Children</p>
                <p className="detail-item__value">{hotel.childPolicy || '—'}</p>
              </div>
              <div>
                <p className="detail-item__label">Pets</p>
                <p className="detail-item__value">{hotel.petPolicy || '—'}</p>
              </div>
            </div>
          </Card>

          <Card title="Available Room Types" style={{ marginTop: 'var(--space-4)' }}>
            {roomTypes.length === 0 ? (
              <p className="text-muted">No rooms available for these dates. Try different dates.</p>
            ) : (
              roomTypes.map((rt) => {
                const qty = selection[rt.id] || 0;
                const soldOut = rt.availableRooms === 0;
                return (
                  <div key={rt.id} className="room-type-card">
                    <div className="room-type-card__info">
                      <h4>{rt.name}</h4>
                      <p className="room-type-card__meta">
                        Up to {rt.maxAdults} adults, {rt.maxChildren} children · {rt.bedType || 'Standard bedding'}
                      </p>
                      <p className="room-type-card__meta">
                        {soldOut ? 'Sold out for these dates' : `${rt.availableRooms} room(s) left · ${rt.nights} night(s)`}
                      </p>
                    </div>
                    <div className="room-type-card__price">
                      {rt.ratePerNight != null ? (
                        <>
                          <div className="room-type-card__rate">{formatCurrency(rt.ratePerNight, rt.currency)}/night</div>
                          <div className="room-type-card__total">
                            {formatCurrency(rt.totalPrice, rt.currency)} total for {rt.nights} night(s)
                          </div>
                        </>
                      ) : (
                        <div className="room-type-card__total">Contact us for pricing</div>
                      )}
                    </div>
                    <div className="room-type-card__actions">
                      {rt.ratePerNight != null && !soldOut ? (
                        <div className="qty-stepper">
                          <button type="button" onClick={() => setQuantity(rt.id, qty - 1, rt.availableRooms)}>
                            −
                          </button>
                          <span>{qty}</span>
                          <button type="button" onClick={() => setQuantity(rt.id, qty + 1, rt.availableRooms)}>
                            +
                          </button>
                        </div>
                      ) : (
                        <Button variant="secondary" disabled>
                          Unavailable
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </Card>
        </div>

        <div>
          <Card title="Your Stay">
            <form onSubmit={handleUpdateStay}>
              <DateRangePicker
                align="end"
                startDate={stayForm.checkIn}
                endDate={stayForm.checkOut}
                onChange={({ startDate, endDate }) =>
                  setStayForm({ ...stayForm, checkIn: startDate, checkOut: endDate })
                }
              />
              <Input
                label="Adults"
                type="number"
                min="1"
                value={stayForm.adults}
                onChange={(e) => setStayForm({ ...stayForm, adults: e.target.value })}
              />
              <Input
                label="Children"
                type="number"
                min="0"
                value={stayForm.children}
                onChange={(e) => setStayForm({ ...stayForm, children: e.target.value })}
              />
              <Button
                type="submit"
                variant="secondary"
                className="auth-page__submit"
                disabled={!stayForm.checkIn || !stayForm.checkOut}
              >
                Update Search
              </Button>
            </form>
          </Card>

          {totalSelectedRooms > 0 && (
            <Card title="Selection Summary" style={{ marginTop: 'var(--space-4)' }}>
              {selectedRows.map((r) => (
                <div key={r.roomType.id} className="summary-line">
                  <span>
                    {r.quantity} × {r.roomType.name}
                  </span>
                  <span>{formatCurrency(Number(r.roomType.totalPrice) * r.quantity, r.roomType.currency)}</span>
                </div>
              ))}
              <div className="summary-line summary-line--total">
                <span>Estimated Total</span>
                <span>{hasPricedSelection ? formatCurrency(estimatedTotal, currency) : '—'}</span>
              </div>
              <p className="summary-note">Estimated only. The final total is calculated when you book.</p>
              <Button className="auth-page__submit" onClick={handleProceedToCheckout} disabled={!hasPricedSelection}>
                Proceed to Checkout
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default HotelDetails;
