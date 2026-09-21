import { httpClient } from './httpClient.js';
import { setAccessToken, clearAccessToken } from './tokenStore.js';

export async function login(email, password) {
  const res = await httpClient.post('/auth/login', { email, password });
  setAccessToken(res.data.accessToken);
  return res.data.user;
}

export async function register(payload) {
  const res = await httpClient.post('/auth/register', payload);
  return res.data;
}

export async function logout() {
  try {
    await httpClient.post('/auth/logout');
  } finally {
    clearAccessToken();
  }
}

export async function refreshSession() {
  const res = await httpClient.post('/auth/refresh');
  setAccessToken(res.data.accessToken);
  return res.data.accessToken;
}

export async function fetchCurrentUser() {
  const res = await httpClient.get('/auth/me');
  return res.data;
}

export async function forgotPassword(email) {
  return httpClient.post('/auth/forgot-password', { email });
}

export async function resetPassword(token, newPassword) {
  return httpClient.post('/auth/reset-password', { token, newPassword });
}

export async function changePassword(currentPassword, newPassword) {
  return httpClient.post('/auth/change-password', { currentPassword, newPassword });
}
