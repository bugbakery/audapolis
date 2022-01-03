import RawColor from 'color';
import { DefaultTheme } from 'styled-components';

function Color(x: string): RawColor & string {
  return RawColor(x) as RawColor & string;
}

// you can add new fields to the theme in custom.d.ts!

//TODO do theming of evergreen:
//  * darker gray for active buttons
export const darkTheme: DefaultTheme = {
  bg: Color('#282828'),
  bgAccent: Color('#444'),
  bgSelection: Color('darkslateblue'),

  fg: Color('white'),
  fgMild: Color('#fff5'),

  linkColor: Color('lightblue'),
  playAccent: Color('#ed6a5e'),

  speakers: ['#6bb9f0', '#00ff00', '#fc6399', '#ff7f50', '#ff6347'],
};

export const lightTheme: DefaultTheme = {
  bg: Color('white'),
  bgAccent: Color('#f2f2f2'),
  bgSelection: Color('lightblue'),

  fg: Color('black'),
  fgMild: Color('#0005'),

  linkColor: Color('darkblue'),
  playAccent: Color('#ed6a5e'),

  speakers: ['#0f4880', '#1d781d', '#db0a5b', '#8d6708', '#d43900'],
};
