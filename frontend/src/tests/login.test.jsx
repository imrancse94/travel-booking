import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from '../views/auth/Login.jsx';
import * as authService from '../services/authService.js';
import { renderWithProviders, CUSTOMER_USER } from './testUtils.jsx';

vi.mock('../services/authService.js', () => ({
  login: vi.fn(),
  logout: vi.fn(),
  refreshSession: vi.fn(),
  fetchCurrentUser: vi.fn(),
}));

function renderLogin(search = '') {
  return renderWithProviders(<Login />, { pathname: '/login', search });
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
    const { router } = renderLogin();

    await user.type(screen.getByLabelText(/email/i), 'customer@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Customer@12345');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
  });

  it('returns the user to the page that sent them to login', async () => {
    authService.login.mockResolvedValue(CUSTOMER_USER);
    const user = userEvent.setup();
    const { router } = renderLogin('?from=%2Fmy-bookings');

    await user.type(screen.getByLabelText(/email/i), 'customer@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Customer@12345');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/my-bookings'));
  });

  it('ignores an off-site ?from= rather than following it', async () => {
    // As router state this was unforgeable; as a query param it is attacker
    // supplied, so anything not a same-origin path must fall back to '/'.
    authService.login.mockResolvedValue(CUSTOMER_USER);
    const user = userEvent.setup();
    const { router } = renderLogin('?from=https%3A%2F%2Fevil.example%2Fphish');

    await user.type(screen.getByLabelText(/email/i), 'customer@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Customer@12345');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
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
