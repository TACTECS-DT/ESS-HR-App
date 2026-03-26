import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import type {UserInfo} from '../../api/mocks/auth.mock';

interface AuthState {
  // Step 1 — License Activation
  licenseKey: string | null;
  serverUrl: string | null;
  // Step 2 — Login (identifier used, never password/pin)
  loginIdentifier: string | null;  // badge_id or username entered
  loginMode: 'badge' | 'username' | null;
  // From Odoo responses
  accessToken: string | null;
  refreshToken: string | null;
  user: UserInfo | null;
  companyId: number | null;
  companyName: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  licenseKey: null,
  serverUrl: null,
  loginIdentifier: null,
  loginMode: null,
  accessToken: null,
  refreshToken: null,
  user: null,
  companyId: null,
  companyName: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLicenseContext: (
      state,
      action: PayloadAction<{licenseKey: string; serverUrl: string}>,
    ) => {
      state.licenseKey = action.payload.licenseKey;
      state.serverUrl = action.payload.serverUrl;
    },
    setCredentials: (
      state,
      action: PayloadAction<{
        accessToken: string;
        refreshToken: string;
        user: UserInfo;
        companyId: number;
        companyName: string;
        loginIdentifier: string;
        loginMode: 'badge' | 'username';
      }>,
    ) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.user = action.payload.user;
      state.companyId = action.payload.companyId;
      state.companyName = action.payload.companyName;
      state.loginIdentifier = action.payload.loginIdentifier;
      state.loginMode = action.payload.loginMode;
      state.isAuthenticated = true;
    },
    updateTokens: (
      state,
      action: PayloadAction<{accessToken: string; refreshToken: string}>,
    ) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
    },
    clearAuth: state => {
      state.accessToken = null;
      state.refreshToken = null;
      state.user = null;
      state.loginIdentifier = null;
      state.loginMode = null;
      state.isAuthenticated = false;
      // licenseKey and serverUrl kept — user stays on same server after logout
    },
  },
});

export const {setLicenseContext, setCredentials, updateTokens, clearAuth} = authSlice.actions;
export default authSlice.reducer;
