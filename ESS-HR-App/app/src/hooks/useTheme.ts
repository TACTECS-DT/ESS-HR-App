import {lightTheme, darkTheme, Theme} from '../config/theme';
import {useAppSelector} from './useAppSelector';

export function useTheme(): Theme {
  const darkMode = useAppSelector(state => state.settings.darkMode);
  return darkMode ? darkTheme : lightTheme;
}
