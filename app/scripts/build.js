const { build } = require('vite');
const { dirname } = require('path');

const mode = (process.env.MODE = process.env.MODE || 'production');
const packagesConfigs = ['src/vite_main.config.js', 'src/vite_renderer.config.js'];

const buildByConfig = (configFile) => build({ configFile, mode });
(async () => {
  try {
    const totalTimeLabel = 'Total bundling time';
    console.time(totalTimeLabel);

    for (const packageConfigPath of packagesConfigs) {
      const consoleGroupName = `${dirname(packageConfigPath)}/`;
      console.group(consoleGroupName);

      const timeLabel = 'Bundling time';
      console.time(timeLabel);

      await buildByConfig(packageConfigPath);

      console.timeEnd(timeLabel);
      console.groupEnd();
      console.log('\n');
    }
    console.timeEnd(totalTimeLabel);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
