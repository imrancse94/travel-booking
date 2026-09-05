'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeftIcon,
  Button,
  TrashIcon,
  Card,
  Input,
  Loader,
  StatusBadge,
  Table,
  useToast,
} from '../../../components/ui/index.js';
import { usePermission } from '../../../hooks/usePermission.js';
import * as hotelService from '../../../services/hotelService.js';

const ROOM_TYPE_COLUMNS = [
  { key: 'name', header: 'Room Type', render: (rt) => <Link href="/admin/rooms/room-types">{rt.name}</Link> },
  { key: 'maxAdults', header: 'Max Adults' },
  { key: 'maxChildren', header: 'Max Children' },
  { key: 'bedType', header: 'Bed Type', render: (rt) => rt.bedType || '—' },
  { key: 'totalRooms', header: 'Total Rooms' },
];

/** Hotel detail: profile info, policies, amenities, room types and image gallery. */
export function HotelDetail() {
  const { id } = useParams();
  const router = useRouter();
  const { show } = useToast();
  const canUpdate = usePermission('hotels.update');

  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [addingImage, setAddingImage] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    return hotelService
      .getById(id)
      .then((res) => setHotel(res.data))
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAddImage(e) {
    e.preventDefault();
    if (!newImageUrl.trim()) return;
    setAddingImage(true);
    try {
      await hotelService.addImage(id, { url: newImageUrl.trim() });
      setNewImageUrl('');
      await load();
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setAddingImage(false);
    }
  }

  async function handleRemoveImage(imageId) {
    try {
      await hotelService.removeImage(id, imageId);
      await load();
    } catch (err) {
      show(err.message, 'error');
    }
  }

  if (loading) return <Loader label="Loading hotel..." />;
  if (error || !hotel) {
    return (
      <div className="error-state">
        <p>Could not load this hotel{error ? `: ${error.message}` : '.'}</p>
      </div>
    );
  }

  const images = hotel.images || [];
  const amenities = hotel.hotelAmenities || [];
  const roomTypes = hotel.roomTypes || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title-row">
            <h1 className="page-title">{hotel.name}</h1>
            <StatusBadge status={hotel.status} />
          </div>
          <p className="page-subtitle">{[hotel.address, hotel.city, hotel.country].filter(Boolean).join(', ')}</p>
        </div>
        <div className="page-actions">
          <Button icon={<ArrowLeftIcon />} variant="primary" onClick={() => router.push('/admin/hotels')}>
            Back
          </Button>
        </div>
      </div>

      <div className="detail-grid">
        <Card title="Overview">
          <div className="detail-list">
            <div>
              <p className="detail-item__label">Star Rating</p>
              <p className="detail-item__value">{hotel.starRating ? '★'.repeat(hotel.starRating) : '—'}</p>
            </div>
            <div>
              <p className="detail-item__label">Email</p>
              <p className="detail-item__value">{hotel.email || '—'}</p>
            </div>
            <div>
              <p className="detail-item__label">Phone</p>
              <p className="detail-item__value">{hotel.phone || '—'}</p>
            </div>
            <div>
              <p className="detail-item__label">Check-in / Check-out</p>
              <p className="detail-item__value">
                {hotel.checkInTime} / {hotel.checkOutTime}
              </p>
            </div>
          </div>
          {hotel.description && <p style={{ marginTop: 'var(--space-4)' }}>{hotel.description}</p>}
        </Card>

        <Card title="Amenities">
          {amenities.length ? (
            <div className="inline-actions">
              {amenities.map((ha) => (
                <StatusBadge key={ha.id || ha.amenityId} status={ha.amenity?.name || ha.amenityId} tone="info" />
              ))}
            </div>
          ) : (
            <p className="text-muted">No amenities assigned.</p>
          )}
        </Card>
      </div>

      <Card title="Policies" style={{ marginTop: 'var(--space-5)' }}>
        <div className="detail-list">
          <div>
            <p className="detail-item__label">Cancellation</p>
            <p className="detail-item__value">{hotel.cancellationPolicy || '—'}</p>
          </div>
          <div>
            <p className="detail-item__label">Payment</p>
            <p className="detail-item__value">{hotel.paymentPolicy || '—'}</p>
          </div>
          <div>
            <p className="detail-item__label">Child</p>
            <p className="detail-item__value">{hotel.childPolicy || '—'}</p>
          </div>
          <div>
            <p className="detail-item__label">Pet</p>
            <p className="detail-item__value">{hotel.petPolicy || '—'}</p>
          </div>
        </div>
      </Card>

      <Card title="Room Types" style={{ marginTop: 'var(--space-5)' }}>
        <Table columns={ROOM_TYPE_COLUMNS} rows={roomTypes} emptyMessage="No room types yet." />
      </Card>

      <Card title="Images" style={{ marginTop: 'var(--space-5)' }}>
        {canUpdate && (
          <form onSubmit={handleAddImage} style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            <Input
              containerClassName="mt-0"
              placeholder="Image URL"
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              style={{ flex: 1 }}
            />
            <Button variant="success" type="submit" loading={addingImage}>
              Add
            </Button>
          </form>
        )}
        {images.length ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 'var(--space-3)' }}>
            {images.map((img) => (
              <div key={img.id} style={{ position: 'relative' }}>
                <img
                  src={img.url}
                  alt={img.caption || hotel.name}
                  style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
                />
                {canUpdate && (
                  <Button icon={<TrashIcon />} variant="danger" onClick={() => handleRemoveImage(img.id)} style={{ marginTop: 'var(--space-1)' }}>
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted">No images uploaded yet.</p>
        )}
      </Card>
    </div>
  );
}

export default HotelDetail;
