import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import type {UserInfo} from '../../api/mocks/auth.mock';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserInfo | null;
  companyId: number | null;
  companyName: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
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
    setCredentials: (
      state,
      action: PayloadAction<{
        accessToken: string;
        refreshToken: string;
        user: UserInfo;
        companyId: number;
        companyName: string;
      }>,
    ) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.user = action.payload.user;
      state.companyId = action.payload.companyId;
      state.companyName = action.payload.companyName;
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
      state.isAuthenticated = false;
    },
  },
});

export const {setCredentials, updateTokens, clearAuth} = authSlice.actions;
export default authSlice.reducer;
