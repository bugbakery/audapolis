import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TitleBar } from '../components/TitleBar';
import { AppContainer, MainCenterColumn } from '../components/Util';
import { openLanding } from '../state/nav';
import { RootState } from '../state';
import { ServerState } from '../state/server';
import { Heading, Table, Button } from 'evergreen-ui';

export function ServersListPage(): JSX.Element {
  const dispatch = useDispatch();
  const server_state = useSelector((state: RootState) => state.server);

  return (
    <AppContainer>
      <TitleBar />
      <MainCenterColumn>
        <Heading
          style={{
            textAlign: 'left',
            gridColumn: '1 / 1',
          }}
        >
          Manage Servers
        </Heading>

        <ServerTable server_state={server_state} /*style={{ width: '70%' }}*/ />
        <Button onClick={() => dispatch(openLanding())}>Home</Button>
      </MainCenterColumn>
    </AppContainer>
  );
}

function ServerTable({ server_state }: { server_state: ServerState }): JSX.Element {
  return (
    <Table>
      <Table.Head>
        <Table.Row>
          <Table.TextHeaderCell>Server Name</Table.TextHeaderCell>
          <Table.TextHeaderCell>Server Address</Table.TextHeaderCell>
          <Table.TextHeaderCell>Server State</Table.TextHeaderCell>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {server_state.servers.map((server, i) => (
          <Table.Row key={i}>
            <Table.TextCell>{server.name}</Table.TextCell>
            <Table.TextCell>
              {server.hostname}:{server.port}
            </Table.TextCell>
            <Table.TextCell>{server.state || ''}</Table.TextCell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}
