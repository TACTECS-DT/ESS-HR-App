import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import type {UserInfo} from '../../api/types/auth';

export interface AllowedModule {
  name: string;
  code: string;
}

interface AuthState {
  // Step 1 — Admin validation result
  serverUrl: string | null;
  allowedModules: AllowedModule[];
  autoLogoutDuration: number;         // minutes; default 4320 (3 days)
  knownServerUrls: string[];          // cached valid client server URLs for quick re-login
  // Step 2 — Login (identifier used, never password/pin)
  loginIdentifier: string | null;     // badge_id or username entered
  loginMode: 'badge' | 'username' | null;
  // From Odoo responses
  accessToken: string | null;
  refreshToken: string | null;
  user: UserInfo | null;
  companyId: number | null;
  companyName: string | null;
  isAuthenticated: boolean;
  lastActivityTime: number | null;    // ms timestamp; updated on user activity
  forceLogoutGen: number;             // generation counter received at login; sent with every request
}

const initialState: AuthState = {
  serverUrl: null,
  allowedModules: [],
  autoLogoutDuration: 4320,
  knownServerUrls: [],
  loginIdentifier: null,
  loginMode: null,
  accessToken: null,
  refreshToken: null,
  user: null,
  companyId: null,
  companyName: null,
  isAuthenticated: false,
  lastActivityTime: null,
  forceLogoutGen: 0,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * Called after Step 1 (admin validate) succeeds.
     * Saves the validated client server URL, allowed modules, and logout duration.
     * Also pushes the URL into knownServerUrls if not already present.
     */
    setAdminContext: (
      state,
      action: PayloadAction<{
        serverUrl: string;
        allowedModules: AllowedModule[];
        autoLogoutDuration: number;
      }>,
    ) => {
      state.serverUrl = action.payload.serverUrl;
      state.allowedModules = action.payload.allowedModules;
      state.autoLogoutDuration = action.payload.autoLogoutDuration;
      if (!state.knownServerUrls.includes(action.payload.serverUrl)) {
        state.knownServerUrls = [action.payload.serverUrl, ...state.knownServerUrls].slice(0, 5);
      }
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
        forceLogoutGen: number;
      }>,
    ) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.user = action.payload.user;
      state.companyId = action.payload.companyId;
      state.companyName = action.payload.companyName;
      state.loginIdentifier = action.payload.loginIdentifier;
      state.loginMode = action.payload.loginMode;
      state.forceLogoutGen = action.payload.forceLogoutGen;
      state.isAuthenticated = true;
      state.lastActivityTime = Date.now();
    },
    updateTokens: (
      state,
      action: PayloadAction<{accessToken: string; refreshToken: string}>,
    ) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
    },
    updateLastActivity: state => {
      state.lastActivityTime = Date.now();
    },
    clearAuth: state => {
      state.serverUrl = null;
      state.allowedModules = [];
      state.autoLogoutDuration = 4320;
      state.accessToken = null;
      state.refreshToken = null;
      state.user = null;
      state.loginIdentifier = null;
      state.loginMode = null;
      state.isAuthenticated = false;
      state.lastActivityTime = null;
      state.forceLogoutGen = 0;
      // knownServerUrls kept — visible in the welcome screen URL history dropdown.
      // User must actively choose a server; nothing is auto-selected.
    },
    // Auto-logout due to inactivity: clear everything including server context
    // so the user must re-enter the server URL. knownServerUrls kept for the
    // history dropdown on the welcome screen.
    autoLogout: state => {
      state.serverUrl = null;
      state.allowedModules = [];
      state.autoLogoutDuration = 4320;
      state.accessToken = null;
      state.refreshToken = null;
      state.user = null;
      state.loginIdentifier = null;
      state.loginMode = null;
      state.isAuthenticated = false;
      state.lastActivityTime = null;
      state.forceLogoutGen = 0;
      // knownServerUrls kept — visible in the welcome screen URL history
    },
    // Used only for admin force-logout: clears session and allowedModules so the
    // user must re-validate the server license before logging in again.
    forceLogout: state => {
      state.accessToken = null;
      state.refreshToken = null;
      state.user = null;
      state.loginIdentifier = null;
      state.loginMode = null;
      state.isAuthenticated = false;
      state.lastActivityTime = null;
      state.allowedModules = [];
      state.autoLogoutDuration = 4320;
      state.forceLogoutGen = 0;
    },
  },
});

export const {
  setAdminContext,
  setCredentials,
  updateTokens,
  updateLastActivity,
  clearAuth,
  autoLogout,
  forceLogout,
} = authSlice.actions;
export default authSlice.reducer;
