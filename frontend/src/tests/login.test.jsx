import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import Login from '../pages/auth/Login.jsx';
import * as authService from '../services/authService.js';
import { renderWithProviders, CUSTOMER_USER } from './testUtils.jsx';

vi.mock('../services/authService.js', () => ({
  login: vi.fn(),
  logout: vi.fn(),
  refreshSession: vi.fn(),
  fetchCurrentUser: vi.fn(),
}));

function renderLogin(initialEntries = ['/login']) {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<h1>Home page</h1>} />
      <Route path="/my-bookings" element={<h1>My bookings page</h1>} />
    </Routes>,
    { initialEntries }
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Login page', () => {
  it('renders the sign-in form', () => {
    renderLogin();

    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /forgot password/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /create one/i })).toBeInTheDocument();
  });

  it('submits the credentials and stores the returned session', async () => {
    authService.login.mockResolvedValue(CUSTOMER_USER);
    const user = userEvent.setup();
    const { store } = renderLogin();

    await user.type(screen.getByLabelText(/email/i), 'customer@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Customer@12345');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(authService.login).toHaveBeenCalledWith('customer@example.com', 'Customer@12345');
    await waitFor(() => expect(store.getState().auth.user).toEqual(CUSTOMER_USER));
  });

  it('redirects to the home page after a successful login', async () => {
    authService.login.mockResolvedValue(CUSTOMER_USER);
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/email/i), 'customer@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Customer@12345');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('heading', { name: /home page/i })).toBeInTheDocument();
  });

  it('returns the user to the page that sent them to login', async () => {
    authService.login.mockResolvedValue(CUSTOMER_USER);
    const user = userEvent.setup();
    renderLogin([{ pathname: '/login', state: { from: { pathname: '/my-bookings' } } }]);

    await user.type(screen.getByLabelText(/email/i), 'customer@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Customer@12345');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('heading', { name: /my bookings page/i })).toBeInTheDocument();
  });

  it('shows the API error message and stays on the page when login fails', async () => {
    authService.login.mockRejectedValue(new Error('Invalid email or password'));
    const user = userEvent.setup();
    const { store } = renderLogin();

    await user.type(screen.getByLabelText(/email/i), 'customer@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(store.getState().auth.user).toBeNull();
  });
});
