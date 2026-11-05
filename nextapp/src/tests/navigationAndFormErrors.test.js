import { getBreadcrumbTrail } from '../constants/navigation.js';
import {
  apiFieldErrors,
  describeFieldErrors,
  humanizeField,
  toastFromApiError,
  toastFromFieldErrors,
} from '../utils/formErrors.js';

describe('getBreadcrumbTrail', () => {
  // Breadcrumbs are keyed per item; a repeated label used to produce React's
  // "two children with the same key" warning and rendered "Dashboard / Dashboard".
  const ROUTES = [
    '/admin',
    '/admin/dashboard',
    '/admin/rooms/rooms',
    '/admin/rooms/room-types',
    '/admin/hotels',
    '/admin/hotels/new',
    '/admin/tours/packages',
    '/admin/users/new',
    '/admin/hotels/9e08a5bc-c811-4c55-814b-0b057b4e3446',
  ];

  it.each(ROUTES)('produces no repeated label for %s', (route) => {
    const labels = getBreadcrumbTrail(route).map((item) => item.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('collapses the redundant Dashboard root on the dashboard itself', () => {
    expect(getBreadcrumbTrail('/admin/dashboard').map((i) => i.label)).toEqual(['Dashboard']);
  });

  it('collapses a section that repeats its own name', () => {
    expect(getBreadcrumbTrail('/admin/rooms/rooms').map((i) => i.label)).toEqual(['Dashboard', 'Rooms']);
  });

  it('still links every item except the current page', () => {
    const trail = getBreadcrumbTrail('/admin/hotels/new');
    expect(trail.map((i) => i.label)).toEqual(['Dashboard', 'Hotels', 'New']);
    expect(trail.at(-1).to).toBeUndefined();
    expect(trail[0].to).toBe('/admin/dashboard');
  });
});

describe('form error helpers', () => {
  const validationError = {
    message: 'Validation failed',
    errors: [
      { field: 'body.email', message: 'Invalid email' },
      { field: 'body.password', message: 'String must contain at least 8 character(s)' },
    ],
  };

  it('strips the request-part prefix and humanises field names', () => {
    expect(humanizeField('body.firstName')).toBe('First name');
    expect(humanizeField('query.page')).toBe('Page');
  });

  it('maps API issues onto form-state keys so inputs can be highlighted', () => {
    expect(apiFieldErrors(validationError)).toEqual({
      email: 'Invalid email',
      password: 'String must contain at least 8 character(s)',
    });
  });

  it('names the offending fields instead of showing only "Validation failed"', () => {
    expect(toastFromApiError(validationError)).toContain('Email: Invalid email');
    expect(toastFromApiError(validationError)).not.toBe('Validation failed');
  });

  it('falls back to the server summary when there are no field issues', () => {
    expect(toastFromApiError({ message: 'A record with this email already exists' })).toBe(
      'A record with this email already exists'
    );
    expect(toastFromApiError({}, 'Could not save')).toBe('Could not save');
  });

  it('truncates a long list rather than filling the toast', () => {
    const many = Object.fromEntries(['a', 'b', 'c', 'd', 'e'].map((k) => [k, 'is required']));
    expect(describeFieldErrors(many)).toMatch(/and 2 more$/);
  });

  it('does not repeat a label the message already names', () => {
    expect(describeFieldErrors({ firstName: 'First name is required.' })).toBe('First name is required.');
  });

  it('always says something for a client-side failure', () => {
    expect(toastFromFieldErrors({})).toBe('Please correct the highlighted fields.');
  });
});
