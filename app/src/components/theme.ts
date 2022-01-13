import {
  defaultTheme,
  DefaultTheme,
  mergeTheme,
  useTheme as useEvergreenTheme,
} from 'evergreen-ui';

export interface AudapolisThemeExtension {
  colors: {
    speakers: Record<string, string>;
    playAccent: string;
  };
}

export type Theme = DefaultTheme & AudapolisThemeExtension;
export const useTheme = (): Theme => useEvergreenTheme<Theme>();

//TODO do theming of evergreen:
//  * darker gray for active buttons
export const lightTheme: Theme = mergeTheme(defaultTheme, {
  colors: {
    playAccent: '#ed6a5e',
    speakers: { 0: '#0f4880', 1: '#1d781d', 2: '#db0a5b', 3: '#8d6708', 4: '#d43900' },
  },
});
