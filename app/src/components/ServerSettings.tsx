import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TitleBar } from './TitleBar';
import { AppContainer, MainCenterColumn } from './Util';
import { Button } from './Controls';
import { openLanding } from '../state/nav';
import { RootState } from '../state';
import { LocalServerStatus, startServer, stopServer } from '../state/server';

export function ServerSettingsPage(): JSX.Element {
  const dispatch = useDispatch();
  const local_server_running = useSelector(
    (state: RootState) =>
      state.server.local_state == LocalServerStatus.Running ||
      state.server.local_state == LocalServerStatus.Starting
  );
  const local_server_state = useSelector((state: RootState) => state.server.local_state);

  return (
    <AppContainer>
      <TitleBar />
      <MainCenterColumn>
        Local Server: {LocalServerStatus[local_server_state]}
        {local_server_running ? (
          <Button primary onClick={() => dispatch(stopServer())}>
            Stop Server
          </Button>
        ) : (
          <Button primary onClick={() => dispatch(startServer())}>
            Start Server
          </Button>
        )}
        <Button onClick={() => dispatch(openLanding())}>Back</Button>
      </MainCenterColumn>
    </AppContainer>
  );
}
