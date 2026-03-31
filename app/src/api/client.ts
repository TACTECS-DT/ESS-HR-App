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
    //    relative path (e.g. /auth/companies) and can match its registered handlers.
    //    Setting a baseURL here would make axios merge it into a full URL before the
    //    adapter runs, breaking all mock registrations.
    //  - Real mode: use the client server URL from Redux (set after Step 1), falling
    //    back to ENV.API_BASE_URL for the first request before Step 1 completes.
    if (!config.baseURL && !ENV.MOCK_MODE) {
      config.baseURL = auth.serverUrl
        ? auth.serverUrl.replace(/\/$/, '') + '/ess/api'
        : ENV.API_BASE_URL;
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
