import {createSlice, PayloadAction} from '@reduxjs/toolkit';

interface SettingsState {
  language: 'en' | 'ar';
  darkMode: boolean;
}

const initialState: SettingsState = {
  language: 'en',
  darkMode: false,
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
  },
});

export const {setLanguage, toggleDarkMode, setDarkMode} = settingsSlice.actions;
export default settingsSlice.reducer;
