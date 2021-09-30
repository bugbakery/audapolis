import 'styled-components';
import Color from 'color';
declare module 'styled-components' {
  export interface DefaultTheme {
    bg: Color & string;
    bgTableAccent: Color & string;
    bgSelection: Color & string;

    fg: Color & string;
    fgMild: Color & string;

    linkColor: Color & string;
    playAccent: Color & string;

    speakers: string[];
  }
}
