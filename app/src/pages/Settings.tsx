import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TitleBar } from '../components/TitleBar';
import { AppContainer, MainCenterColumn, StyledTable, Title } from '../components/Util';
import { Button, IconButton } from '../components/Controls';
import { openLanding, openManageServer } from '../state/nav';
import { RootState } from '../state';
import {
  LocalServerStatus,
  ServerConfig,
  ServerState,
  startServer,
  stopServer,
} from '../state/server';
import { MdPlayArrow, MdSettings, MdStop } from 'react-icons/md';
import { IconType } from 'react-icons';

export function SettingsPage(): JSX.Element {
  const dispatch = useDispatch();
  const local_server_running = useSelector(
    (state: RootState) =>
      state.server.local_state == LocalServerStatus.Running ||
      state.server.local_state == LocalServerStatus.Starting
  );
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
          <ServerTable
            server_state={server_state}
            actionIcon={MdSettings}
            onAction={(server) => dispatch(openManageServer(server))}
            localActionIcon={local_server_running ? MdStop : MdPlayArrow}
            localOnAction={() =>
              local_server_running ? dispatch(stopServer()) : dispatch(startServer())
            }
          />
        </StyledTable>
        <Button onClick={() => dispatch(openLanding())}>Back</Button>
      </MainCenterColumn>
    </AppContainer>
  );
}

function ServerTableRow({
  server,
  actionIcons,
}: {
  server: ServerConfig;
  actionIcons: JSX.Element | JSX.Element[];
}): JSX.Element {
  return (
    <tr>
      <td>{server.name}</td>
      <td>
        {server.hostname}:{server.port}
      </td>
      <td>{actionIcons}</td>
    </tr>
  );
}
function ServerTable({
  server_state,
  actionIcon,
  onAction,
  localActionIcon,
  localOnAction,
}: {
  server_state: ServerState;
  actionIcon: IconType;
  onAction: (server: ServerConfig) => void;
  localActionIcon: IconType;
  localOnAction: () => void;
}): JSX.Element {
  return (
    <tbody>
      <ServerTableRow
        key="local"
        server={server_state.local_config}
        actionIcons={
          <>
            <IconButton icon={actionIcon} onClick={() => onAction(server_state.local_config)} />
            <IconButton icon={localActionIcon} onClick={() => localOnAction()} />
          </>
        }
      />
      {server_state.servers.map((server, i) => (
        <ServerTableRow
          key={i}
          server={server}
          actionIcons={<IconButton icon={actionIcon} onClick={() => onAction(server)} />}
        />
      ))}
    </tbody>
  );
}
