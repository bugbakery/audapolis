import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TitleBar } from '../components/TitleBar';
import { AppContainer, MainCenterColumn, StyledTable, Title } from '../components/Util';
import { Button } from '../components/Controls';
import { openLanding } from '../state/nav';
import { RootState } from '../state';
import { ServerState } from '../state/server';

export function ServersListPage(): JSX.Element {
  const dispatch = useDispatch();
  const server_state = useSelector((state: RootState) => state.server);

  return (
    <AppContainer>
      <TitleBar />
      <MainCenterColumn>
        <Title
          style={{
            textAlign: 'left',
            // backgroundColor: '#ff0000',
            gridColumn: '1 / 1',
          }}
        >
          Manage Servers
        </Title>

        <StyledTable style={{ width: '70%' }}>
          <ServerTable server_state={server_state} />
        </StyledTable>
        <Button onClick={() => dispatch(openLanding())}>Home</Button>
      </MainCenterColumn>
    </AppContainer>
  );
}

function ServerTable({ server_state }: { server_state: ServerState }): JSX.Element {
  return (
    <>
      <thead>
        <tr>
          <th>Server Name</th>
          <th>Server Address</th>
          <th>Server State</th>
        </tr>
      </thead>
      <tbody>
        {server_state.servers.map((server, i) => (
          <tr key={i}>
            <td>{server.name}</td>
            <td>
              {server.hostname}:{server.port}
            </td>
            <td>{server.state || ''}</td>
          </tr>
        ))}
      </tbody>
    </>
  );
}
