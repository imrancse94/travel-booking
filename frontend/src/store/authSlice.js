import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as authService from '../services/authService.js';

// Bootstraps the session on app load: the refresh token lives in an httpOnly
// cookie, so this exchanges it for a fresh access token and the current
// user's profile (roles + permissions) without the user re-entering credentials.
export const bootstrapSession = createAsyncThunk('auth/bootstrap', async () => {
  await authService.refreshSession();
  return authService.fetchCurrentUser();
});

export const loginThunk = createAsyncThunk('auth/login', async ({ email, password }) => {
  return authService.login(email, password);
});

export const logoutThunk = createAsyncThunk('auth/logout', async () => {
  await authService.logout();
});

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null, isLoading: true },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(bootstrapSession.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isLoading = false;
      })
      .addCase(bootstrapSession.rejected, (state) => {
        state.user = null;
        state.isLoading = false;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.user = null;
      });
  },
});

export default authSlice.reducer;
