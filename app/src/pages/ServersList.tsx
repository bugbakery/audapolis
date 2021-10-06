import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TitleBar } from '../components/TitleBar';
import { AppContainer, MainCenterColumn, StyledTable, Title } from '../components/Util';
import { Button } from '../components/Controls';
import { openLanding } from '../state/nav';
import { RootState } from '../state';
import { ServerConfig, ServerState } from '../state/server';

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
        <Button onClick={() => dispatch(openLanding())}>Back</Button>
      </MainCenterColumn>
    </AppContainer>
  );
}

function ServerTableRow({ server }: { server: ServerConfig }): JSX.Element {
  return (
    <tr>
      <td>{server.name}</td>
      <td>
        {server.hostname}:{server.port}
      </td>
    </tr>
  );
}
function ServerTable({ server_state }: { server_state: ServerState }): JSX.Element {
  return (
    <tbody>
      {server_state.servers.map((server, i) => (
        <ServerTableRow key={i} server={server} />
      ))}
    </tbody>
  );
}
