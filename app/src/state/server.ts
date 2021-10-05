import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { app } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import * as process from 'process';
import { RootState } from './index';

export interface ServerState {
  local_state: LocalServerStatus;
  local_proc: ChildProcess | null;
  local_config: ServerConfig;
  servers: ServerConfig[];
}

export interface ServerConfig {
  hostname: string;
  port: number;
  token: string | null;
  name: string;
}
export enum LocalServerStatus {
  NotStarted,
  Stopped,
  Starting,
  Running,
  Stopping,
  Error,
}

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
    alert(
      'Failed to find local executable for server. Please report this issue to https://github.com/audapolis/audapolis/issues'
    );
    app.quit();
    return;
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
export const startServer = createAsyncThunk('server/startServer', async (_, { dispatch }) => {
  const proc = getServerProcess();
  if (proc == undefined) {
    return;
  }
  dispatch(setLocalProc(proc));
  dispatch(setLocalState(LocalServerStatus.Starting));
  proc.stdout.on('data', (data: Buffer) => {
    console.log(`Server stdout: ${data}`);
    try {
      const parsed_data: ServerStartingMessage | ServerStartedMessage = JSON.parse(data.toString());
      if (parsed_data.msg == 'server_starting') {
        dispatch(setLocalPort(parsed_data['port']));
      } else if (parsed_data.msg == 'server_started') {
        dispatch(setLocalToken(parsed_data['token']));
        dispatch(setLocalState(LocalServerStatus.Running));
      }
    } catch (e) {
      console.log('error decoding stdout json', e);
    }
  });

  proc.stderr.on('data', (data: Buffer) => {
    console.error(`Server stderr: ${data}`);
  });

  proc.on('close', (code: number | null) => {
    if (code == 0) {
      dispatch(setLocalState(LocalServerStatus.Stopped));
    } else {
      dispatch(setLocalState(LocalServerStatus.Error));
    }
    dispatch(setLocalProc(null));
    console.log(`child process exited with code ${code}`);
  });
});

export const stopServer = createAsyncThunk<void, void, { state: RootState }>(
  'server/stopServer',
  async (_, { dispatch, getState }) => {
    const proc = getState().server.local_proc;
    if (proc) {
      console.log('killing proc', proc);
      proc.kill();
      dispatch(setLocalState(LocalServerStatus.Stopping));
    }
  }
);

export const serverSlice = createSlice({
  name: 'server',
  initialState: {
    local_state: LocalServerStatus.NotStarted,
    local_proc: null,
    local_config: {
      hostname: 'http://localhost',
      port: 0,
      name: 'Local Server',
      token: null,
    },
    servers: [],
    selected_server: null,
  } as ServerState,
  reducers: {
    setLocalState: (state, args: PayloadAction<LocalServerStatus>) => {
      state.local_state = args.payload;
    },
    setLocalProc: (state, args: PayloadAction<ChildProcess | null>) => {
      state.local_proc = args.payload;
    },
    setLocalPort: (state, args: PayloadAction<number>) => {
      state.local_config.port = args.payload;
    },
    setLocalToken: (state, args: PayloadAction<string>) => {
      state.local_config.token = args.payload;
    },
    addServer: (state, args: PayloadAction<ServerConfig>) => {
      state.servers.push(args.payload);
    },
    removeServer: (state, args: PayloadAction<string>) => {
      state.servers = state.servers.filter((config) => config.hostname != args.payload);
    },
  },
});
const { setLocalProc, setLocalState, setLocalPort, setLocalToken, addServer, removeServer } =
  serverSlice.actions;
export default serverSlice.reducer;

export const getServerName = (server: ServerConfig): string => {
  return `${server.hostname}:${server.port}`;
};

export const getAuthHeader = (server: ServerConfig): string => {
  return `Bearer ${server.token}`;
};

export const getServers = (state: RootState): ServerConfig[] => {
  const servers = state.server.servers.slice();
  servers.unshift(state.server.local_config);
  return servers;
};
