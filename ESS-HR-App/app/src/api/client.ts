import axios from 'axios';
import {ENV} from '../config/env';
import {store} from '../store';

const apiClient = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request interceptor — attach full auth context headers on every request.
// This is the single place where all auth headers are assembled.
// Odoo reads these via get_auth_context() in controllers/utils.py.
apiClient.interceptors.request.use(
  config => {
    const auth = store.getState().auth;

    // Dynamic base URL:
    //  - MOCK_MODE: leave baseURL unset so axios-mock-adapter receives the bare
    //    relative path and can match its registered handlers.
    //  - Real mode: use the client server URL from Redux (set after Step 1 succeeds).
    //    If serverUrl is null the user hasn't completed Step 1 yet — reject the call
    //    rather than silently hitting a wrong hardcoded server.
    // Dynamic base URL resolution:
    //  - mock:   serverUrl = 'mock', leave baseURL unset — mock adapter intercepts bare paths
    //  - django: use DJANGO_BASE_URL from .env (fixed middleware address)
    //  - odoo:   use serverUrl from Redux (user-entered at Step 1) + /ess/api suffix
    //            if serverUrl is null, Step 1 hasn't completed — reject the call
    if (!config.baseURL) {
      if (ENV.MOCK_MODE || auth.serverUrl === 'mock') {
        // leave unset — mock adapter handles it
      } else if (ENV.ACTIVE_BACKEND === 'django') {
        config.baseURL = ENV.DJANGO_BASE_URL.replace(/\/$/, '');
      } else {
        const serverUrl = auth.serverUrl;
        if (!serverUrl) {
          return Promise.reject(new Error('No client server URL — complete Step 1 (license activation) first.'));
        }
        config.baseURL = serverUrl.replace(/\/$/, '') + '/ess/api';
      }
    }

    if (auth.accessToken) {
      config.headers['Authorization'] = `Bearer ${auth.accessToken}`;
    }
    if (auth.companyId != null) {
      config.headers['X-ESS-Company-ID'] = String(auth.companyId);
    }
    if (auth.user?.id != null) {
      config.headers['X-ESS-Employee-ID'] = String(auth.user.id);
    }
    if (auth.loginMode) {
      config.headers['X-ESS-Login-Mode'] = auth.loginMode;
    }
    if (auth.loginIdentifier) {
      config.headers['X-ESS-Login-Identifier'] = auth.loginIdentifier;
    }

    return config;
  },
  error => Promise.reject(error),
);

// NOTE: Response error handling (401 refresh, serverDown flag) is in
// setupInterceptors.ts which is registered after this file loads.
// Do NOT add a second response interceptor here — stacked interceptors
// cause _retry to be set before the refresh logic ever runs.

export default apiClient;
