import path from 'path';
import process from 'process';
import fs from 'fs';
import { spawn } from 'child_process';
import { app, ipcMain, dialog } from 'electron';
import { sendAll } from './windowList';

function findServer() {
  const possibilities = [
    // In packaged app
    path.join(process.resourcesPath, 'server', 'server'),
    path.join(process.resourcesPath, 'server', 'server.exe'),
    // In development
    path.join(process.cwd(), 'server', 'server'),
    path.join(process.cwd(), 'server', 'server.exe'),
  ];
  for (const path of possibilities) {
    if (fs.existsSync(path)) {
      return path;
    }
  }
  return null;
}

function getServerProcess() {
  if (process.env.NODE_ENV === 'development') {
    console.log(process.cwd() + '/../server');
    return spawn('poetry', ['run', 'python', 'run.py'], {
      stdio: 'pipe',
      cwd: process.cwd() + '/../server',
      env: { ...process.env },
    });
  }
  const path = findServer();
  if (path === null) {
    dialog.showMessageBoxSync({
      type: 'error',
      message:
        'Failed to find local executable for server. Please report this issue to https://github.com/audapolis/audapolis/issues',
    });
    app.quit();
    return null;
  }
  console.log('Starting server from', path);
  return spawn(path, {
    stdio: 'pipe',
    env: { ...process.env },
  });
}

interface ServerStartingMessage {
  msg: 'server_starting';
  port: number;
}

interface ServerStartedMessage {
  msg: 'server_started';
  token: string;
}

export enum LocalServerStatus {
  NotStarted,
  Stopped,
  Starting,
  Running,
  Stopping,
  Error,
}

let serverInfo = {
  port: null as null | number,
  token: null as null | string,
  state: LocalServerStatus.NotStarted,
};

let serverProcess = null;
function startServer() {
  serverProcess = getServerProcess();
  if (!serverProcess) {
    return;
  }
  serverProcess.stdout.on('data', (data: Buffer) => {
    console.log(`server-stdout: ${data}`);
    try {
      const parsed_data: ServerStartingMessage | ServerStartedMessage = JSON.parse(data.toString());
      if (parsed_data.msg == 'server_starting') {
        publishServerInfo({ state: LocalServerStatus.Starting, port: parsed_data.port });
      } else if (parsed_data.msg == 'server_started') {
        publishServerInfo({ state: LocalServerStatus.Running, token: parsed_data.token });
      }
    } catch (e) {
      console.log('error decoding stdout json', e);
    }
  });

  serverProcess.stderr.on('data', (data: Buffer) => {
    console.log(`server-stderr: \n${data}`);
    sendAll('local-server-stderr', data.toString());
  });

  serverProcess.on('close', (code: number | null) => {
    if (code == 0) {
      publishServerInfo({ state: LocalServerStatus.Stopped });
    } else {
      publishServerInfo({ state: LocalServerStatus.Error });
    }
    serverProcess = null;
    console.log(`child process exited with code ${code}`);
  });
}
startServer();

function publishServerInfo(update?: Partial<typeof serverInfo>): void {
  serverInfo = { ...serverInfo, ...update };
  sendAll('local-server-info', serverInfo);
}

ipcMain.on('local-server-request', () => {
  publishServerInfo();
});
