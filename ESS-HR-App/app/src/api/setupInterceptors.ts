/**
 * Call this once after the Redux store is ready.
 * All auth headers are set in client.ts interceptor.
 * This file handles:
 *   - 401 FORCE_LOGGED_OUT: admin force-logout — clears session and alerts user
 *   - 401 other: token refresh and retry
 *   - Server unreachable detection (sets connectivity.serverDown)
 */
import {Alert} from 'react-native';
import apiClient from './client';
import {API_MAP} from './apiMap';
import {store} from '../store';
import {updateTokens, clearAuth, forceLogout} from '../store/slices/authSlice';
import {setServerDown} from '../store/slices/connectivitySlice';
import {saveTokens, clearTokens} from '../utils/secureStorage';
import i18n from '../i18n';

export function setupInterceptors(): void {
  apiClient.interceptors.response.use(
    response => {
      // Server responded — clear any previous server-down flag
      if (store.getState().connectivity.serverDown) {
        store.dispatch(setServerDown(false));
      }
      return response;
    },
    async error => {
      const originalRequest = error.config;

      // No response at all → server is unreachable / down
      if (!error.response) {
        store.dispatch(setServerDown(true));
        return Promise.reject(error);
      }

      // Server responded — clear server-down flag
      if (store.getState().connectivity.serverDown) {
        store.dispatch(setServerDown(false));
      }

      // Handle 401 FORCE_LOGGED_OUT — skip refresh, clear everything, alert user
      const errorCode = error.response.data?.error?.code;
      if (error.response.status === 401 && errorCode === 'FORCE_LOGGED_OUT') {
        store.dispatch(forceLogout());
        await clearTokens();
        Alert.alert(
          i18n.t('auth.errors.forceLogout.title'),
          i18n.t('auth.errors.forceLogout.body'),
          [{text: i18n.t('common.ok')}],
        );
        return Promise.reject(error);
      }

      // Handle 401: attempt token refresh, then retry
      if (error.response.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
          const refreshToken = store.getState().auth.refreshToken;
          const response = await apiClient.post(API_MAP.auth.refresh, {
            refresh_token: refreshToken,
          });
          const {access_token, refresh_token} = response.data.data;
          store.dispatch(updateTokens({accessToken: access_token, refreshToken: refresh_token}));
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
