// eslint-disable-next-line @typescript-eslint/no-var-requires
const getVersion = require('./get_version.js');

/**
 * @type {import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration/configuration
 */
const config = {
  directories: {
    output: 'dist',
    buildResources: './assets/',
  },
  files: ['build/**'],
  extraMetadata: {
    version: getVersion(),
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
      {
        target: 'zip',
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
