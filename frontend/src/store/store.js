import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice.js';

// Single RTK store: session/user/permission state lives here so it survives
// route changes and is readable from anywhere via useSelector, instead of
// being re-fetched or threaded through props.
export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
});
