const { createServer, build, createLogger } = require('vite');
const electronPath = require('electron');
const { spawn } = require('child_process');

const mode = (process.env.MODE = process.env.MODE || 'development');
const LOG_LEVEL = 'warn';
const sharedConfig = {
  mode,
  build: {
    watch: {},
  },
  logLevel: LOG_LEVEL,
};

const getWatcher = ({ name, configFile, writeBundle }) => {
  return build({
    ...sharedConfig,
    configFile,
    plugins: [{ name, writeBundle }],
  });
};

const setupMainPackageWatcher = (viteDevServer) => {
  // Write a value to an environment variable to pass it to the main process.
  {
    const protocol = `http${viteDevServer.config.server.https ? 's' : ''}:`;
    const host = viteDevServer.config.server.host || 'localhost';
    const port = viteDevServer.config.server.port; // Vite searches for and occupies the first free port: 3000, 3001, 3002 and so on
    const path = '/';
    process.env.VITE_DEV_SERVER_URL = `${protocol}//${host}:${port}${path}`;
  }

  const logger = createLogger(LOG_LEVEL, {
    prefix: '[main]',
  });

  let spawnProcess = null;

  return getWatcher({
    name: 'reload-app-on-main-package-change',
    configFile: 'main_process/vite_main.config.js',
    writeBundle({ dir }) {
      if (spawnProcess !== null) {
        spawnProcess.kill('SIGINT');
        spawnProcess = null;
      }

      spawnProcess = spawn(String(electronPath), [`${dir}/start.cjs.js`]);

      spawnProcess.stdout.on(
        'data',
        (d) => d.toString().trim() && logger.warn(d.toString(), { timestamp: true })
      );
      spawnProcess.stderr.on(
        'data',
        (d) => d.toString().trim() && logger.error(d.toString(), { timestamp: true })
      );
    },
  });
};

(async () => {
  try {
    const viteDevServer = await createServer({
      ...sharedConfig,
      configFile: 'src/vite_renderer.config.js',
    });

    await viteDevServer.listen();

    await setupMainPackageWatcher(viteDevServer);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
