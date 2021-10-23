import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState, store } from './index';
import { ipcRenderer } from 'electron';
import { fetchModelState } from './models';

export interface ServerState {
  servers: ServerConfig[];
  selectedServer: number;
}

export interface ServerConfig {
  hostname: string;
  port: number;
  token: string | null;
  name: string;
  state?: string;
}

export const changeServer = createAsyncThunk<void, number, { state: RootState }>(
  'models/changeServer',
  async (server, { dispatch }) => {
    await dispatch(selectServer(server));
    dispatch(fetchModelState());
  }
);

export const serverSlice = createSlice({
  name: 'server',
  initialState: {
    servers: [],
    selectedServer: 0,
  } as ServerState,
  reducers: {
    addServer: (state, args: PayloadAction<ServerConfig>) => {
      state.servers.push(args.payload);
    },
    setLocalServer: (state, args: PayloadAction<Omit<ServerConfig, 'name'>>) => {
      const localServerName = 'local server';
      const serverIdx = state.servers.findIndex((server) => server.name == localServerName);
      const server = { name: localServerName, ...args.payload };
      if (serverIdx != -1) {
        state.servers[serverIdx] = server;
      } else {
        state.servers.push(server);
      }
    },
    removeServer: (state, args: PayloadAction<string>) => {
      state.servers = state.servers.filter((config) => config.hostname != args.payload);
    },
    selectServer: (state, args: PayloadAction<number>) => {
      state.selectedServer = args.payload;
    },
  },
});
const { setLocalServer, selectServer } = serverSlice.actions;
export default serverSlice.reducer;

export const getServerName = (server: ServerConfig): string => {
  return `${server.hostname}:${server.port}`;
};

export const getAuthHeader = (server: ServerConfig): string => {
  return `Bearer ${server.token}`;
};

export const getServer = (state: RootState): ServerConfig => {
  return state.server.servers[state.server.selectedServer];
};

ipcRenderer.on('local-server-stderr', (event, arg: string) => {
  console.groupCollapsed('server stderr');
  arg.split('\n').forEach((line) => {
    console.log(line);
  });
  console.groupEnd();
});
ipcRenderer.on('local-server-info', (event, arg) => {
  store.dispatch(
    setLocalServer({
      hostname: 'http://localhost',
      port: arg.port,
      token: arg.token,
      state: arg.state,
    })
  );
});
ipcRenderer.send('local-server-request');
