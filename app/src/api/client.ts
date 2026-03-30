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

    // Dynamic base URL: use the server URL from login, fall back to .env (mock/dev)
    if (!config.baseURL) {
      config.baseURL = auth.serverUrl
        ? auth.serverUrl.replace(/\/$/, '') + '/ess/api'
        : ENV.API_BASE_URL;
    }

    if (auth.accessToken) {
      config.headers['Authorization'] = `Bearer ${auth.accessToken}`;
    }
    if (auth.serverUrl) {
      config.headers['X-ESS-Server-URL'] = auth.serverUrl;
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
      // badge_id or username — never password or pin
      config.headers['X-ESS-Login-Identifier'] = auth.loginIdentifier;
    }

    return config;
  },
  error => Promise.reject(error),
);

// Response interceptor — handle 401 / global errors
apiClient.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      // Token refresh handled by Django backend when active
    }
    return Promise.reject(error);
  },
);

export default apiClient;
