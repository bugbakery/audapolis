declare module '*.svg?raw' {
  const content: any;
  export default content;
}

interface ImportMeta {
  env: {
    VITE_DEV_SERVER_URL: string;
  };
}

declare module 'ffmpeg-static';
