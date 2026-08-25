import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Button, Card, Input } from '../components/ui/index.js';

function todayPlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function Home() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [destination, setDestination] = useState('');
  const [checkIn, setCheckIn] = useState(todayPlus(7));
  const [checkOut, setCheckOut] = useState(todayPlus(10));

  function handleSearch(e) {
    e.preventDefault();
    const params = new URLSearchParams({ checkIn, checkOut, adults: '2', children: '0', rooms: '1' });
    if (destination.trim()) params.set('destination', destination.trim());
    navigate(`/hotels?${params.toString()}`);
  }

  return (
    <div>
      <section className="hero">
        <div className="container">
          <h1 className="hero__title">Find your next stay</h1>
          <p className="hero__subtitle">
            {isAuthenticated
              ? `Welcome back, ${user?.firstName || 'traveler'}. Search hotels or check your bookings.`
              : 'Hotel booking and travel packages, all in one place.'}
          </p>

          <Card className="search-panel">
            <form onSubmit={handleSearch}>
              <div className="search-panel__grid">
                <Input label="Destination" placeholder="City or hotel name" value={destination} onChange={(e) => setDestination(e.target.value)} />
                <Input label="Check-in" type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
                <Input label="Check-out" type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
              </div>
              <div className="search-panel__actions">
                <Button type="submit">Search Hotels</Button>
              </div>
            </form>
          </Card>
        </div>
      </section>

      <section className="page-section container">
        <h2>Why book with us</h2>
        <div className="detail-grid">
          <Card title="Wide Selection">
            <p>Hotels across every major destination, from budget stays to luxury resorts.</p>
          </Card>
          <Card title="Best Rates">
            <p>Transparent pricing with no hidden fees, shown in your currency.</p>
          </Card>
          <Card title="Flexible Cancellation">
            <p>Free cancellation on most bookings when you cancel with enough notice.</p>
          </Card>
        </div>
      </section>
    </div>
  );
}

export default Home;
