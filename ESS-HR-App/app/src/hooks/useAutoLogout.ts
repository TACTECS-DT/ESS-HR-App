/**
 * useAutoLogout — enforces the auto-logout duration received from the admin server.
 *
 * Checks are triggered:
 *   1. When the app returns to the foreground (AppState change).
 *   2. Once per minute while the app is in the foreground (periodic guard).
 *
 * `lastActivityTime` is stamped at login (setCredentials). Screens that involve
 * meaningful user activity should dispatch `updateLastActivity()` to reset the clock.
 */

import {useEffect, useRef} from 'react';
import {AppState, AppStateStatus} from 'react-native';
import {useAppSelector} from './useAppSelector';
import {useAppDispatch} from './useAppDispatch';
import {clearAuth} from '../store/slices/authSlice';
import {clearTokens} from '../utils/secureStorage';

const CHECK_INTERVAL_MS = 60 * 1000; // 1 minute

export function useAutoLogout() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(s => s.auth.isAuthenticated);
  const lastActivityTime = useAppSelector(s => s.auth.lastActivityTime);
  const autoLogoutDuration = useAppSelector(s => s.auth.autoLogoutDuration ?? 72);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function checkAndLogout() {
    if (!isAuthenticated || !lastActivityTime) {return;}
    const maxIdleMs = autoLogoutDuration * 60 * 60 * 1000;
    if (Date.now() - lastActivityTime > maxIdleMs) {
      clearTokens();
      dispatch(clearAuth());
    }
  }

  // Check on foreground resume
  useEffect(() => {
    function handleAppStateChange(next: AppStateStatus) {
      if (next === 'active') {
        checkAndLogout();
      }
    }
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, lastActivityTime, autoLogoutDuration]);

  // Periodic check while foregrounded
  useEffect(() => {
    if (!isAuthenticated) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(checkAndLogout, CHECK_INTERVAL_MS);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, lastActivityTime, autoLogoutDuration]);
}
