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
    buildResources: 'src/resources/',
  },
  files: ['build/**'],
  extraMetadata: {
    version: process.env.VITE_APP_VERSION,
  },
  mac: {
    category: 'public.app-category.productivity', // this is also where libreoffice lives
    darkModeSupport: true,
    artifactName: '${name}-mac-${arch}-${version}.${ext}',
    target: [
      {
        target: 'dmg',
        arch: ['x64', 'arm64'],
      },
    ],
  },
  win: {
    artifactName: '${name}-win-${arch}-${version}.${ext}',
  },
  linux: {
    target: [
      'AppImage',
      // 'snap',
      'deb',
      'rpm',
      'pacman',
    ],
    category: 'Audio',
    artifactName: '${name}-linux-${arch}-${version}.${ext}',
  },
  extraResources: ['./server/**', './generated/**'],
  asar: false,
};

module.exports = config;
