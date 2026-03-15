import axios from 'axios';
import {ENV} from '../config/env';

const apiClient = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request interceptor — attach Bearer token
apiClient.interceptors.request.use(
  config => {
    // Token is injected by authSlice interceptor setup (src/store/slices/authSlice.ts)
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
      // Token refresh is handled by the auth interceptor setup
    }
    return Promise.reject(error);
  },
);

export default apiClient;
