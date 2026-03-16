import {createSlice, PayloadAction} from '@reduxjs/toolkit';

interface TimerState {
  running: boolean;
  paused: boolean;
  taskId: number | null;
  taskName: string | null;
  startTimestamp: number | null;
  elapsedSeconds: number;
}

const initialState: TimerState = {
  running: false,
  paused: false,
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
      state.paused = false;
      state.taskId = action.payload.taskId;
      state.taskName = action.payload.taskName;
      state.startTimestamp = Date.now();
      state.elapsedSeconds = 0;
    },
    pauseTimer: state => {
      if (state.running && state.startTimestamp) {
        state.elapsedSeconds += Math.floor(
          (Date.now() - state.startTimestamp) / 1000,
        );
      }
      state.running = false;
      state.paused = true;
      state.startTimestamp = null;
    },
    resumeTimer: state => {
      if (!state.paused) {return;}
      state.running = true;
      state.paused = false;
      state.startTimestamp = Date.now();
    },
    stopTimer: state => {
      if (state.startTimestamp) {
        state.elapsedSeconds += Math.floor(
          (Date.now() - state.startTimestamp) / 1000,
        );
      }
      state.running = false;
      state.paused = false;
      state.startTimestamp = null;
    },
    resetTimer: state => {
      state.running = false;
      state.paused = false;
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

export const {startTimer, pauseTimer, resumeTimer, stopTimer, resetTimer, tickTimer} = timerSlice.actions;
export default timerSlice.reducer;
