if (process.env.VITE_APP_VERSION === undefined) {
  const now = new Date();
  process.env.VITE_APP_VERSION =
    `${now.getUTCFullYear() - 2000}.${now.getUTCMonth() + 1}.${now.getUTCDate()}` +
    `-${now.getUTCHours() * 100 + now.getUTCMinutes()}`;
}

/**
 * @type {import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration/configuration
 */
const config = {
  directories: {
    output: 'dist',
    buildResources: 'src/res/',
  },
  files: ['build/**'],
  extraMetadata: {
    version: process.env.VITE_APP_VERSION,
  },
  mac: {
    category: 'public.app-category.productivity', // this is also where libreoffice lives
    target: 'dmg',
    darkModeSupport: true,
  },
  linux: {
    target: 'AppImage',
    category: 'Audio',
  },
  extraResources: [
    "./server/**"
  ]
};

module.exports = config;
