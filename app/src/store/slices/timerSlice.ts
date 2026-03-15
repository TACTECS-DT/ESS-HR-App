import {createSlice, PayloadAction} from '@reduxjs/toolkit';

interface TimerState {
  running: boolean;
  taskId: number | null;
  taskName: string | null;
  startTimestamp: number | null;
  elapsedSeconds: number;
}

const initialState: TimerState = {
  running: false,
  taskId: null,
  taskName: null,
  startTimestamp: null,
  elapsedSeconds: 0,
};

const timerSlice = createSlice({
  name: 'timer',
  initialState,
  reducers: {
    startTimer: (
      state,
      action: PayloadAction<{taskId: number; taskName: string}>,
    ) => {
      state.running = true;
      state.taskId = action.payload.taskId;
      state.taskName = action.payload.taskName;
      state.startTimestamp = Date.now();
      state.elapsedSeconds = 0;
    },
    stopTimer: state => {
      if (state.startTimestamp) {
        state.elapsedSeconds += Math.floor(
          (Date.now() - state.startTimestamp) / 1000,
        );
      }
      state.running = false;
      state.startTimestamp = null;
    },
    resetTimer: state => {
      state.running = false;
      state.taskId = null;
      state.taskName = null;
      state.startTimestamp = null;
      state.elapsedSeconds = 0;
    },
    tickTimer: state => {
      if (state.running && state.startTimestamp) {
        state.elapsedSeconds = Math.floor(
          (Date.now() - state.startTimestamp) / 1000,
        );
      }
    },
  },
});

export const {startTimer, stopTimer, resetTimer, tickTimer} = timerSlice.actions;
export default timerSlice.reducer;
