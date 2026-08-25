import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Card, Input, Select, Textarea, useToast } from '../../components/ui/index.js';
import * as bookingService from '../../services/bookingService.js';
import * as paymentService from '../../services/paymentService.js';
import * as customerService from '../../services/customerService.js';
import * as serviceService from '../../services/serviceService.js';
import { PAYMENT_METHOD_OPTIONS } from '../../constants/options.js';
import { formatCurrency, formatDate } from '../../utils/format.js';

const STEPS = ['Guest Information', 'Room Summary', 'Additional Services', 'Price Summary', 'Payment'];

function emptyGuest(isPrimary = false) {
  return {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    nationality: '',
    passportNumber: '',
    passportExpiry: '',
    specialRequirements: '',
    isPrimary,
  };
}

function cleanGuest(guest) {
  const cleaned = { firstName: guest.firstName.trim(), lastName: guest.lastName.trim(), isPrimary: Boolean(guest.isPrimary) };
  ['email', 'phone', 'dateOfBirth', 'nationality', 'passportNumber', 'passportExpiry', 'specialRequirements'].forEach((key) => {
    if (guest[key] && String(guest[key]).trim()) cleaned[key] = String(guest[key]).trim();
  });
  return cleaned;
}

/** Multi-step checkout (instructions.md section 41): guest info, room summary, extras, price summary, payment. Reads the room selection from HotelDetails via router state. */
export function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { show } = useToast();
  const checkoutState = location.state;

  const [step, setStep] = useState(0);
  const [guests, setGuests] = useState(() => {
    const count = Math.max(1, Number(checkoutState?.adults) || 1);
    return Array.from({ length: count }, (_, i) => emptyGuest(i === 0));
  });
  const [specialRequests, setSpecialRequests] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [submitting, setSubmitting] = useState(false);
  const [guestErrors, setGuestErrors] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);

  useEffect(() => {
    if (!checkoutState) return;
    serviceService
      .list({ status: 'active', limit: 100 })
      .then((res) => setCatalog(res.data || []))
      .catch(() => setCatalog([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!checkoutState) return;
    customerService
      .getMe()
      .then((res) => {
        const me = res.data;
        setGuests((prev) => {
          if (!prev.length) return prev;
          const [first, ...rest] = prev;
          return [
            {
              ...first,
              firstName: first.firstName || me.firstName || '',
              lastName: first.lastName || me.lastName || '',
              email: first.email || me.email || '',
              phone: first.phone || me.phone || '',
              nationality: first.nationality || me.nationality || '',
            },
            ...rest,
          ];
        });
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nights = checkoutState?.selections?.[0]?.nights || 0;
  const totalRooms = useMemo(
    () => (checkoutState?.selections || []).reduce((sum, s) => sum + s.quantity, 0),
    [checkoutState]
  );
  const currency = checkoutState?.currency || 'USD';
  const selectedServices = useMemo(
    () => catalog.filter((svc) => selectedServiceIds.includes(svc.id)),
    [catalog, selectedServiceIds]
  );
  const servicesTotal = useMemo(
    () => selectedServices.reduce((sum, svc) => sum + Number(svc.price) + Number(svc.tax || 0), 0),
    [selectedServices]
  );
  const estimatedTotal = (checkoutState?.estimatedTotal ?? 0) + servicesTotal;

  function toggleService(serviceId) {
    setSelectedServiceIds((prev) => (prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]));
  }

  if (!checkoutState || !checkoutState.selections?.length) {
    return (
      <div className="container page-section">
        <div className="empty-state">
          <span className="empty-state__icon">🧳</span>
          <p>No rooms selected yet. Start by searching for a hotel.</p>
          <Button onClick={() => navigate('/hotels')}>Browse Hotels</Button>
        </div>
      </div>
    );
  }

  function updateGuest(index, key, value) {
    setGuests((prev) => prev.map((g, i) => (i === index ? { ...g, [key]: value } : g)));
  }

  function addGuest() {
    setGuests((prev) => [...prev, emptyGuest(false)]);
  }

  function removeGuest(index) {
    setGuests((prev) => prev.filter((_, i) => i !== index));
  }

  function validateGuests() {
    const errors = guests.map((g) => {
      const e = {};
      if (!g.firstName.trim()) e.firstName = 'Required';
      if (!g.lastName.trim()) e.lastName = 'Required';
      return e;
    });
    setGuestErrors(errors);
    return errors.every((e) => Object.keys(e).length === 0);
  }

  function goNext() {
    if (step === 0 && !validateGuests()) {
      show('Please fill in each guest’s first and last name.', 'error');
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const rooms = (checkoutState.selections || []).flatMap((s) =>
        Array.from({ length: s.quantity }, () => ({ roomTypeId: s.roomTypeId }))
      );
      const payload = {
        hotelId: checkoutState.hotelId,
        checkIn: checkoutState.checkIn,
        checkOut: checkoutState.checkOut,
        adults: checkoutState.adults,
        children: checkoutState.children,
        specialRequests: specialRequests.trim() || undefined,
        source: 'website',
        rooms,
        guests: guests.map(cleanGuest),
        services: selectedServiceIds.map((serviceId) => ({ serviceId, quantity: 1 })),
      };

      const bookingRes = await bookingService.create(payload);
      const booking = bookingRes.data;

      try {
        const paymentRes = await paymentService.create({
          bookingId: booking.id,
          amount: booking.totalAmount,
          method: paymentMethod,
          gateway: 'mock',
        });
        if (paymentRes.data?.status === 'paid') {
          show('Payment received. Your booking is confirmed!', 'success');
        } else {
          show('Booking created, but the payment did not go through. You can retry payment from My Bookings.', 'warning');
        }
      } catch (payErr) {
        show(`Booking created, but payment failed: ${payErr.message}`, 'warning');
      }

      navigate(`/booking-confirmation/${booking.id}`);
    } catch (err) {
      show(err.message || 'Could not complete booking', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container page-section">
      <div className="page-header">
        <div>
          <h1 className="page-title">Checkout</h1>
          <p className="page-subtitle">
            {checkoutState.hotelName} &middot; {formatDate(checkoutState.checkIn)} &ndash; {formatDate(checkoutState.checkOut)}
          </p>
        </div>
      </div>

      <div className="checkout-steps">
        {STEPS.map((label, i) => (
          <span key={label} className={`checkout-step ${i === step ? 'checkout-step--active' : i < step ? 'checkout-step--done' : ''}`}>
            {i + 1}. {label}
          </span>
        ))}
      </div>

      <div className="checkout-layout">
        <Card>
          {step === 0 && (
            <div>
              <h3 className="form-section__title">Guest Information</h3>
              {guests.map((guest, index) => (
                <div key={index} className="guest-card">
                  <h4 className="guest-card__title">{guest.isPrimary ? 'Primary Guest' : `Guest ${index + 1}`}</h4>
                  {!guest.isPrimary && (
                    <Button
                      variant="ghost"
                      className="day-editor__remove"
                      onClick={() => removeGuest(index)}
                      type="button"
                    >
                      Remove
                    </Button>
                  )}
                  <div className="form-grid">
                    <Input
                      label="First Name"
                      required
                      value={guest.firstName}
                      error={guestErrors[index]?.firstName}
                      onChange={(e) => updateGuest(index, 'firstName', e.target.value)}
                    />
                    <Input
                      label="Last Name"
                      required
                      value={guest.lastName}
                      error={guestErrors[index]?.lastName}
                      onChange={(e) => updateGuest(index, 'lastName', e.target.value)}
                    />
                    <Input label="Email" type="email" value={guest.email} onChange={(e) => updateGuest(index, 'email', e.target.value)} />
                    <Input label="Phone" value={guest.phone} onChange={(e) => updateGuest(index, 'phone', e.target.value)} />
                    <Input
                      label="Date of Birth"
                      type="date"
                      value={guest.dateOfBirth}
                      onChange={(e) => updateGuest(index, 'dateOfBirth', e.target.value)}
                    />
                    <Input label="Nationality" value={guest.nationality} onChange={(e) => updateGuest(index, 'nationality', e.target.value)} />
                    <Input
                      label="Passport Number"
                      value={guest.passportNumber}
                      onChange={(e) => updateGuest(index, 'passportNumber', e.target.value)}
                    />
                    <Input
                      label="Passport Expiry"
                      type="date"
                      value={guest.passportExpiry}
                      onChange={(e) => updateGuest(index, 'passportExpiry', e.target.value)}
                    />
                  </div>
                  <Textarea
                    label="Special Requirements"
                    value={guest.specialRequirements}
                    onChange={(e) => updateGuest(index, 'specialRequirements', e.target.value)}
                  />
                </div>
              ))}
              <Button type="button" variant="secondary" onClick={addGuest}>
                + Add Guest
              </Button>
            </div>
          )}

          {step === 1 && (
            <div>
              <h3 className="form-section__title">Room Summary</h3>
              {(checkoutState.selections || []).map((s) => (
                <div key={s.roomTypeId} className="summary-line">
                  <span>
                    {s.quantity} × {s.name} ({s.nights} night{s.nights === 1 ? '' : 's'})
                  </span>
                  <span>{formatCurrency(Number(s.totalPrice) * s.quantity, s.currency)}</span>
                </div>
              ))}
              <div className="detail-list" style={{ marginTop: 'var(--space-4)' }}>
                <div>
                  <p className="detail-item__label">Check-in</p>
                  <p className="detail-item__value">{formatDate(checkoutState.checkIn)}</p>
                </div>
                <div>
                  <p className="detail-item__label">Check-out</p>
                  <p className="detail-item__value">{formatDate(checkoutState.checkOut)}</p>
                </div>
                <div>
                  <p className="detail-item__label">Guests</p>
                  <p className="detail-item__value">
                    {checkoutState.adults} adults, {checkoutState.children} children
                  </p>
                </div>
                <div>
                  <p className="detail-item__label">Rooms</p>
                  <p className="detail-item__value">{totalRooms}</p>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 className="form-section__title">Additional Services</h3>
              {catalog.length === 0 ? (
                <p className="text-muted">No extra services are available for this booking.</p>
              ) : (
                <div className="service-picker">
                  {catalog.map((svc) => (
                    <label key={svc.id} className="service-picker__row">
                      <span className="service-picker__check">
                        <input
                          type="checkbox"
                          checked={selectedServiceIds.includes(svc.id)}
                          onChange={() => toggleService(svc.id)}
                        />
                        <span>
                          <strong>{svc.name}</strong>
                          {svc.description && <span className="service-picker__desc"> &mdash; {svc.description}</span>}
                        </span>
                      </span>
                      <span>{formatCurrency(Number(svc.price) + Number(svc.tax || 0), currency)}</span>
                    </label>
                  ))}
                </div>
              )}

              <h3 className="form-section__title" style={{ marginTop: 'var(--space-6)' }}>
                Special Requests
              </h3>
              <p className="text-muted">Need something not listed above, like an early check-in? Let the hotel know here.</p>
              <Textarea
                label="Special Requests"
                rows={4}
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                placeholder="e.g. late check-in, high floor, quiet room..."
              />
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 className="form-section__title">Price Summary</h3>
              {(checkoutState.selections || []).map((s) => (
                <div key={s.roomTypeId} className="summary-line">
                  <span>
                    {s.quantity} × {s.name} &middot; {formatCurrency(s.ratePerNight, s.currency)}/night &times; {s.nights}
                  </span>
                  <span>{formatCurrency(Number(s.totalPrice) * s.quantity, s.currency)}</span>
                </div>
              ))}
              {selectedServices.map((svc) => (
                <div key={svc.id} className="summary-line">
                  <span>{svc.name}</span>
                  <span>{formatCurrency(Number(svc.price) + Number(svc.tax || 0), currency)}</span>
                </div>
              ))}
              <div className="summary-line summary-line--total">
                <span>Estimated Total</span>
                <span>{formatCurrency(estimatedTotal, currency)}</span>
              </div>
              <p className="summary-note">
                This is an estimate based on current pricing. The confirmed total, including any taxes or fees, is
                calculated by the server when your booking is created.
              </p>
            </div>
          )}

          {step === 4 && (
            <div>
              <h3 className="form-section__title">Payment</h3>
              <Select
                label="Payment Method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                options={PAYMENT_METHOD_OPTIONS}
              />
              <p className="text-muted">
                This is a sandbox environment: payments are processed through a mock gateway and always simulate a real
                charge outcome.
              </p>
            </div>
          )}

          <div className="form-actions">
            {step > 0 && (
              <Button type="button" variant="secondary" onClick={goBack} disabled={submitting}>
                Back
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={goNext}>
                Continue
              </Button>
            ) : (
              <Button type="button" onClick={handleSubmit} loading={submitting}>
                Confirm &amp; Pay {formatCurrency(estimatedTotal, currency)}
              </Button>
            )}
          </div>
        </Card>

        <Card title="Order Summary">
          <p className="detail-item__value" style={{ marginBottom: 'var(--space-2)' }}>
            {checkoutState.hotelName}
          </p>
          <p className="detail-item__label">
            {formatDate(checkoutState.checkIn)} &ndash; {formatDate(checkoutState.checkOut)} ({nights} night{nights === 1 ? '' : 's'})
          </p>
          {(checkoutState.selections || []).map((s) => (
            <div key={s.roomTypeId} className="summary-line">
              <span>
                {s.quantity} × {s.name}
              </span>
              <span>{formatCurrency(Number(s.totalPrice) * s.quantity, s.currency)}</span>
            </div>
          ))}
          {selectedServices.map((svc) => (
            <div key={svc.id} className="summary-line">
              <span>{svc.name}</span>
              <span>{formatCurrency(Number(svc.price) + Number(svc.tax || 0), currency)}</span>
            </div>
          ))}
          <div className="summary-line summary-line--total">
            <span>Estimated Total</span>
            <span>{formatCurrency(estimatedTotal, currency)}</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default Checkout;
