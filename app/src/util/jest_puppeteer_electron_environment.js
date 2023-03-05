import NodeEnvironment from 'jest-environment-node';
import { spawn } from 'child_process';
import puppeteer from 'puppeteer-core';
import { getPortPromise } from 'portfinder';
import { sleep } from './index';
import treeKill from 'tree-kill';

const startTimeout = 30_000;

class CustomEnvironment extends NodeEnvironment {
  constructor(config) {
    super(config);

    this.process = null;
    this.browser = null;
    this.page = null;
    this.xvfb = null;
  }

  async setup() {
    await super.setup();
    const startTime = Date.now();

    // we start with a random port because spawning multiple workers could be racy.
    // this reduces the flakiness
    const basePort = 1000 + Math.round(Math.random() * 5000);
    const port = await getPortPromise({ port: basePort });

    this.process = spawn('npm', ['start'], {
      shell: true,
      env: { ...process.env, DEBUGGER_PORT: port },
      detached: true,
      ...(process.env.DEBUG_TESTS
        ? { stdio: [process.stdin, process.stdout, process.stderr] }
        : {}),
    });

    // Wait for Puppeteer to connect
    while (!this.browser) {
      try {
        this.browser = await puppeteer.connect({
          browserURL: `http://127.0.0.1:${port}/`,
        });
        const pages = await this.browser.pages();
        // we do this to filter out the devtools window
        const pageTitles = await Promise.all(pages.map((x) => x.title()));
        while (!this.page) {
          this.page = pages.filter((x, i) => pageTitles[i] === 'audapolis')[0];
          await sleep(0.1);
          if (Date.now() > startTime + startTimeout) {
            console.error(pages);
            throw Error('timeout while looking for page.');
          }
        }
      } catch (error) {
        if (Date.now() > startTime + startTimeout) {
          throw error;
        }
      }
    }

    this.global.page = this.page;
  }

  async teardown() {
    if (process.platform === 'win32') {
      treeKill(this.process.pid);
    } else {
      process.kill(-this.process.pid);
    }
  }

  getVmContext() {
    return super.getVmContext();
  }
}

module.exports = CustomEnvironment;
