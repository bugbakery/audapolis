declare module '*.svg?raw' {
  const content: any;
  export default content;
}

interface ImportMeta {
  env: {
    VITE_DEV_SERVER_URL: string;
  };
}

interface Selection {
  modify(
    alter: 'move' | 'extend',
    direction: 'forward' | 'backward' | 'left' | 'right',
    granularity:
      | 'character'
      | 'word'
      | 'sentence'
      | 'line'
      | 'paragraph'
      | 'lineboundary'
      | 'sentenceboundary'
      | 'paragraphboundary'
      | 'documentboundary'
  ): void;
}

declare module 'ffmpeg-static';
