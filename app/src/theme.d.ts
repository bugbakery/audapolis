import 'styled-components';
import Color from 'color';
declare module 'styled-components' {
  export interface DefaultTheme {
    bg: Color & string;
    bgAccent: Color & string;
    bgSelection: Color & string;

    fg: Color & string;
    fgMild: Color & string;

    linkColor: Color & string;
    playAccent: Color & string;

    speakers: string[];
  }
}
