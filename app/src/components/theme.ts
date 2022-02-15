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
    overlayBackgroundColor: string;
  };
}

export type Theme = DefaultTheme & AudapolisThemeExtension;
export const useTheme = (): Theme => useEvergreenTheme<Theme>();

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export const darkTheme: Theme = mergeTheme(defaultTheme, {
  colors: {
    overlayBackgroundColor: '#333',
    darkerOverlayBackgroundColor: '#222',
    tint1: 'red',
    tint2: '#2A2A2A',
    gray75: '#222',
    lighterOverlayBackgroundColor: '#555',
    playAccent: '#ed6a5e',
    speakers: { 0: '#a1c3ff', 1: '#81d574', 2: '#ffa6d5', 3: '#ebbb61', 4: '#ffb074' },
    icon: { default: 'white' },
    default: 'white',
    muted: '#ccc',
    selectionBackgroundColor: 'rgba(56,139,253,0.4)',
    selectionTextColor: 'white',
    border: { default: '#888' },
  },
  components: {
    Button: {
      appearances: {
        default: {
          backgroundColor: 'colors.overlayBackgroundColor',
          color: 'colors.white',
          _hover: { backgroundColor: 'colors.darkerOverlayBackgroundColor' },
          _active: {
            backgroundColor: 'colors.lighterOverlayBackgroundColor',
          },
        },
        primary: { backgroundColor: 'colors.white', color: 'colors.overlayBackgroundColor' },
        minimal: {
          color: 'colors.default',
          _active: { backgroundColor: 'colors.lighterOverlayBackgroundColor' },
          _hover: { backgroundColor: 'colors.darkerOverlayBackgroundColor' },
        },
      },
    },
    Input: {
      appearances: {
        default: {
          backgroundColor: 'colors.overlayBackgroundColor',
          color: 'colors.white',
        },
      },
    },
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    Option: {
      baseStyle: {
        backgroundColor: 'colors.overlayBackgroundColor',
        _before: { width: 0 },
      },
    },
    Label: {
      baseStyle: { color: 'white' },
    },
    Heading: {
      baseStyle: {
        color: 'colors.white',
      },
    },
    Pane: {
      appearances: {
        default: {
          backgroundColor: 'colors.overlayBackgroundColor',
          color: 'colors.white',
        },
      },
    },
    Card: {
      appearances: {
        default: {
          backgroundColor: 'colors.overlayBackgroundColor',
          color: 'colors.white',
        },
      },
    },
    TableRow: {
      appearances: {
        default: {
          backgroundColor: 'colors.overlayBackgroundColor',
        },
      },
    },
  },
  intents: {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    info: { background: '#555', text: 'white' },
  },
  shadows: Object.assign(
    [
      '0 0 1px #222',
      '0 0 1px #222, 0 2px 4px -2px #222',
      '0 0 1px #222, 0 5px 8px -4px #222',
      '0 0 1px #222, 0 8px 10px -4px #222',
      '0 0 1px #222, 0 16px 24px -8px #222',
    ],
    { focusRing: '0 0 0 2px #D6E0FF' }
  ),
});

export const lightTheme: Theme = mergeTheme(defaultTheme, {
  colors: {
    overlayBackgroundColor: 'white',
    playAccent: '#ed6a5e',
    speakers: { 0: '#0f4880', 1: '#1d781d', 2: '#db0a5b', 3: '#8d6708', 4: '#d43900' },
  },
  components: {
    Button: {
      appearances: {
        minimal: {
          _active: { backgroundColor: 'colors.gray400' },
        },
      },
    },
  },
});
