declare module '*.svg?raw' {
  const content: any;
  export default content;
}

interface ImportMeta {
  env: {
    VITE_DEV_SERVER_URL: string;
  };
}

declare module 'fluent-ffmpeg/lib/fluent-ffmpeg';
declare module 'ffmpeg-static';
