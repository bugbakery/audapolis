import 'react';
declare module 'react' {
  export interface CSSProperties {
    WebkitAppRegion?: 'no-drag' | 'drag';
  }
}
