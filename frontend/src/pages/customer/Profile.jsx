import { useEffect, useState } from 'react';
import { Button, Card, Input, Loader, useToast } from '../../components/ui/index.js';
import * as customerService from '../../services/customerService.js';
import * as authService from '../../services/authService.js';
import { formatDateInput } from '../../utils/format.js';

const EMPTY_PROFILE = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  nationality: '',
  passportNumber: '',
  passportExpiry: '',
  dateOfBirth: '',
};

/** Self-service profile page: GET/PUT /customers/me plus a change-password sub-section. */
export function Profile() {
  const { show } = useToast();
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState(null);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    customerService
      .getMe()
      .then((res) => {
        const me = res.data;
        setProfile({
          ...EMPTY_PROFILE,
          ...me,
          passportExpiry: formatDateInput(me.passportExpiry),
          dateOfBirth: formatDateInput(me.dateOfBirth),
        });
      })
      .catch((err) => show(err.message, 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setField(key, value) {
    setProfile((p) => ({ ...p, [key]: value }));
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...profile };
      delete payload.id;
      delete payload.userId;
      delete payload.documents;
      delete payload.createdAt;
      delete payload.updatedAt;
      delete payload.deletedAt;
      Object.keys(payload).forEach((key) => {
        if (payload[key] === '') delete payload[key];
      });
      const res = await customerService.updateMe(payload);
      setProfile((p) => ({ ...p, ...res.data }));
      show('Profile updated', 'success');
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPasswordError(null);
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    setChangingPassword(true);
    try {
      await authService.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      show('Password changed', 'success');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setChangingPassword(false);
    }
  }

  if (loading) return <Loader label="Loading profile..." />;

  return (
    <div className="container page-section">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">Keep your contact and travel document details up to date.</p>
        </div>
      </div>

      <form onSubmit={handleSaveProfile}>
        <Card title="Profile Details">
          <div className="form-grid">
            <Input label="First Name" required value={profile.firstName} onChange={(e) => setField('firstName', e.target.value)} />
            <Input label="Last Name" required value={profile.lastName} onChange={(e) => setField('lastName', e.target.value)} />
            <Input label="Email" type="email" required value={profile.email} onChange={(e) => setField('email', e.target.value)} />
            <Input label="Phone" value={profile.phone} onChange={(e) => setField('phone', e.target.value)} />
            <Input label="Nationality" value={profile.nationality} onChange={(e) => setField('nationality', e.target.value)} />
            <Input label="Date of Birth" type="date" value={profile.dateOfBirth} onChange={(e) => setField('dateOfBirth', e.target.value)} />
            <Input label="Passport Number" value={profile.passportNumber} onChange={(e) => setField('passportNumber', e.target.value)} />
            <Input label="Passport Expiry" type="date" value={profile.passportExpiry} onChange={(e) => setField('passportExpiry', e.target.value)} />
            <Input label="Address" containerClassName="form-grid--full-item" value={profile.address} onChange={(e) => setField('address', e.target.value)} />
          </div>
          <div className="form-actions">
            <Button type="submit" loading={saving}>
              Save Changes
            </Button>
          </div>
        </Card>
      </form>

      <form onSubmit={handleChangePassword}>
        <Card title="Change Password" style={{ marginTop: 'var(--space-5)' }}>
          {passwordError && <p style={{ color: 'var(--color-danger)' }}>{passwordError}</p>}
          <div className="form-grid">
            <Input
              label="Current Password"
              type="password"
              required
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
            />
            <Input
              label="New Password"
              type="password"
              required
              hint="At least 8 characters, with an uppercase letter and a number."
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
            />
            <Input
              label="Confirm New Password"
              type="password"
              required
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
            />
          </div>
          <div className="form-actions">
            <Button type="submit" loading={changingPassword}>
              Change Password
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}

export default Profile;
