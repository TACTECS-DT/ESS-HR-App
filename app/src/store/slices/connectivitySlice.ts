import {createSlice, PayloadAction} from '@reduxjs/toolkit';

interface ConnectivityState {
  serverDown: boolean;
}

const initialState: ConnectivityState = {
  serverDown: false,
};

const connectivitySlice = createSlice({
  name: 'connectivity',
  initialState,
  reducers: {
    setServerDown: (state, action: PayloadAction<boolean>) => {
      state.serverDown = action.payload;
    },
  },
});

export const {setServerDown} = connectivitySlice.actions;
export default connectivitySlice.reducer;
