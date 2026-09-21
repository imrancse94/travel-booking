import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from '../views/auth/Login.jsx';
import * as authActions from '../server/actions/auth.actions.js';
import { renderWithProviders, CUSTOMER_USER } from './testUtils.jsx';

// AuthContext now calls the Server Action directly (see src/lib/callAction.js)
// instead of a client-side authService.login() HTTP call, so that's what's
// mocked here. A Server Action never throws to its caller in this codebase
// (see server/actions/_actionResult.js) -- it always resolves with a
// { success, data, message, errors, statusCode } envelope, success or not.
vi.mock('../server/actions/auth.actions.js', () => ({
  loginAction: vi.fn(),
  logoutAction: vi.fn(),
}));

function successResult(user) {
  return { success: true, data: { user, accessToken: 'test-access-token' }, message: 'Login successful', errors: [], statusCode: 200 };
}

function failureResult(message, statusCode = 401) {
  return { success: false, data: null, message, errors: [], statusCode };
}

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
    authActions.loginAction.mockResolvedValue(successResult(CUSTOMER_USER));
    const user = userEvent.setup();
    const { getUser } = renderLogin();

    await user.type(screen.getByLabelText(/email/i), 'customer@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Customer@12345');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(authActions.loginAction).toHaveBeenCalledWith('customer@example.com', 'Customer@12345');
    await waitFor(() => expect(getUser()).toEqual(CUSTOMER_USER));
  });

  it('redirects to the home page after a successful login', async () => {
    authActions.loginAction.mockResolvedValue(successResult(CUSTOMER_USER));
    const user = userEvent.setup();
    const { router } = renderLogin();

    await user.type(screen.getByLabelText(/email/i), 'customer@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Customer@12345');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
  });

  it('returns the user to the page that sent them to login', async () => {
    authActions.loginAction.mockResolvedValue(successResult(CUSTOMER_USER));
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
    authActions.loginAction.mockResolvedValue(successResult(CUSTOMER_USER));
    const user = userEvent.setup();
    const { router } = renderLogin('?from=https%3A%2F%2Fevil.example%2Fphish');

    await user.type(screen.getByLabelText(/email/i), 'customer@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Customer@12345');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
  });

  it('shows the API error message and stays on the page when login fails', async () => {
    authActions.loginAction.mockResolvedValue(failureResult('Invalid email or password'));
    const user = userEvent.setup();
    const { getUser } = renderLogin();

    await user.type(screen.getByLabelText(/email/i), 'customer@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(getUser()).toBeNull();
  });
});
