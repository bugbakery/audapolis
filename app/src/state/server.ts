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
  servers: ServerConfig[];
}

export interface ServerConfig {
  hostname: string;
  port: number;
  token: string | null;
  name: string;
}
export enum LocalServerStatus {
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
    // In development
    path.join(process.cwd(), 'server', 'server'),
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

export const startServer = createAsyncThunk('server/startServer', async (_, { dispatch }) => {
  const proc = getServerProcess();
  if (proc == undefined) {
    return;
  }
  dispatch(setLocalProc(proc));
  dispatch(setLocalState(LocalServerStatus.Starting));
  dispatch(
    addServer({ hostname: 'http://localhost', port: 8000, token: null, name: 'Local Server' })
  );
  proc.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
    try {
      const parsed_data = JSON.parse(data);
      console.log('parsed_data', parsed_data);
      if (parsed_data['msg'] == 'server_starting') {
        dispatch(setPort({ hostname: 'http://localhost', port: parsed_data['port'] }));
      } else if (parsed_data['msg'] == 'server_started') {
        dispatch(setToken({ hostname: 'http://localhost', token: parsed_data['token'] }));
        dispatch(setLocalState(LocalServerStatus.Running));
      }
    } catch (e) {
      console.log('error decoding stdout json', e);
    }
  });

  proc.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });

  proc.on('close', (code) => {
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
      dispatch(removeServer('http://localhost'));
      dispatch(setLocalState(LocalServerStatus.Stopping));
    }
  }
);

export const serverSlice = createSlice({
  name: 'server',
  initialState: {
    local_state: LocalServerStatus.Stopped,
    local_proc: null,
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
    setPort: (state, args: PayloadAction<{ hostname: string; port: number }>) => {
      const server_idx = getServerIndex(state, args.payload.hostname);
      state.servers[server_idx].port = args.payload.port;
    },
    setToken: (state, args: PayloadAction<{ hostname: string; token: string }>) => {
      const server_idx = getServerIndex(state, args.payload.hostname);
      state.servers[server_idx].token = args.payload.token;
    },
    addServer: (state, args: PayloadAction<ServerConfig>) => {
      state.servers.push(args.payload);
    },
    removeServer: (state, args: PayloadAction<string>) => {
      state.servers = state.servers.filter((config) => config.hostname != args.payload);
    },
  },
});
const { setLocalProc, setLocalState, setPort, setToken, addServer, removeServer } =
  serverSlice.actions;
export default serverSlice.reducer;

export const getServerName = (server: ServerConfig): string => {
  return `${server.hostname}:${server.port}`;
};

export const getServerIndex = (state: ServerState, hostname: string): number =>
  state.servers.findIndex((config) => config.hostname == hostname);

export const getAuthHeader = (server: ServerConfig): string => {
  return `Bearer ${server.token}`;
};
