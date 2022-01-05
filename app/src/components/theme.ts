import { defaultTheme as defaultThemeWrongType, Theme } from 'evergreen-ui';
import { DefaultTheme } from '../types/theme';

const defaultTheme = defaultThemeWrongType as unknown as DefaultTheme;

//TODO do theming of evergreen:
//  * darker gray for active buttons
export const lightTheme: Theme = {
  ...defaultTheme,
  colors: {
    ...defaultTheme.colors,
    playAccent: '#ed6a5e',
    speakers: ['#0f4880', '#1d781d', '#db0a5b', '#8d6708', '#d43900'],
  },
};
