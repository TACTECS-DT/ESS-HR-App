import axios from 'axios';
import {ENV} from '../config/env';
import {store} from '../store';

const apiClient = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request interceptor — attach auth context headers on every request
apiClient.interceptors.request.use(
  config => {
    const auth = store.getState().auth;

    if (auth.accessToken) {
      config.headers['Authorization'] = `Bearer ${auth.accessToken}`;
    }
    if (auth.licenseKey) {
      config.headers['X-ESS-License-Key'] = auth.licenseKey;
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
