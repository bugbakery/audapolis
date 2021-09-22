declare module '*.svg' {
  const content: any;
  export default content;
}

interface ImportMeta {
  env: {
    VITE_DEV_SERVER_URL: string;
  };
}

declare module 'fluent-ffmpeg/lib/fluent-ffmpeg';
