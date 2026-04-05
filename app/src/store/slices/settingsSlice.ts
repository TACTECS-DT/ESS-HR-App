import {createSlice, PayloadAction} from '@reduxjs/toolkit';

interface SettingsState {
  language: 'en' | 'ar';
  darkMode: boolean;
  devMode: boolean;
}

const initialState: SettingsState = {
  language: 'en',
  darkMode: false,
  devMode: false,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setLanguage: (state, action: PayloadAction<'en' | 'ar'>) => {
      state.language = action.payload;
    },
    toggleDarkMode: state => {
      state.darkMode = !state.darkMode;
    },
    setDarkMode: (state, action: PayloadAction<boolean>) => {
      state.darkMode = action.payload;
    },
    toggleDevMode: state => {
      state.devMode = !state.devMode;
    },
  },
});

export const {setLanguage, toggleDarkMode, setDarkMode, toggleDevMode} = settingsSlice.actions;
export default settingsSlice.reducer;
