/**
 * Call this once after the Redux store is ready.
 * Attaches Bearer token to requests and handles 401 refresh.
 */
import apiClient from './client';
import {store} from '../store';
import {updateTokens, clearAuth} from '../store/slices/authSlice';
import {saveTokens, clearTokens} from '../utils/secureStorage';

export function setupInterceptors(): void {
  // Attach Bearer token to every request
  apiClient.interceptors.request.use(config => {
    const token = store.getState().auth.accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // Handle 401: attempt token refresh, then retry
  apiClient.interceptors.response.use(
    response => response,
    async error => {
      const originalRequest = error.config;
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
          const refreshToken = store.getState().auth.refreshToken;
          const response = await apiClient.post('/auth/refresh', {
            refresh_token: refreshToken,
          });
          const {access_token, refresh_token} = response.data.data;
          store.dispatch(
            updateTokens({
              accessToken: access_token,
              refreshToken: refresh_token,
            }),
          );
          await saveTokens(access_token, refresh_token);
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return apiClient(originalRequest);
        } catch {
          store.dispatch(clearAuth());
          await clearTokens();
        }
      }
      return Promise.reject(error);
    },
  );
}
