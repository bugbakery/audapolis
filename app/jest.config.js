// /** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
// module.exports = {
//   transform: {
//     '^.+\\.tsx?$': 'esbuild-jest',
//   },
//   testEnvironment: 'jsdom',
// };
module.exports = {
  transform: {
    '^.+\\.(t|j)sx?$': '@swc/jest',
  },
  moduleNameMapper: {
    '^proxy-memoize$': '<rootDir>/node_modules/proxy-memoize/dist/index.modern.js',
  },
  transformIgnorePatterns: ['/node_modules/(?!proxy-memoize)'],
};
