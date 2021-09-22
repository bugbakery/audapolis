import * as React from 'react';
import { Button } from './Controls';
import { useDispatch, useSelector } from 'react-redux';
import { abortTranscription, startTranscription } from '../state/transcribe';
import { TitleBar } from './TitleBar';
import { AppContainer, MainCenterColumn } from './Util';
import { RootState } from '../state';
import styled from 'styled-components';
import { openSettings } from '../state/nav';
import { openServerSettings } from '../state/nav';
import { useState } from 'react';

const Form = styled.div`
  padding: 20px;
  margin-bottom: 50px;
  display: grid;
  grid-template-columns: auto auto;
  grid-gap: 20px;
`;

export function TranscribePage(): JSX.Element {
  const dispatch = useDispatch();
  const file = useSelector((state: RootState) => state.transcribe.file) || '';
  const models = useSelector((state: RootState) =>
    Object.values(state.models.downloaded).flatMap((x) => x)
  );

  const [selectedModel, setSelectedModel] = useState(0);

  const servers = useSelector((state: RootState) => state.server.servers);
  const [selectedServer, setSelectedServer] = useState(0);

  return (
    <AppContainer>
      <TitleBar />
      <MainCenterColumn>
        <Form>
          <span style={{ opacity: 0.5 }}>opened</span>
          <span> {file.split('/').pop()}</span>

          <span style={{ opacity: 0.5 }}>Server</span>
          <select
            value={selectedServer}
            onChange={(e) => setSelectedServer(parseInt(e.target.value))}
          >
            {servers.map((server, i) => (
              <option key={i} value={i}>
                {server.name} ({server.hostname}:{server.port})
              </option>
            ))}
          </select>
          <a style={{ gridColumn: '2 / 2' }} onClick={() => dispatch(openServerSettings())}>
            Manage Servers
          </a>

          <span style={{ opacity: 0.5 }}>Transcription Model</span>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(parseInt(e.target.value))}
          >
            {models.map((model, i) => (
              <option key={i} value={i}>
                {model.lang} - {model.name}
              </option>
            ))}
          </select>

          <a style={{ gridColumn: '1 / 3' }} onClick={() => dispatch(openSettings())}>
            Download More Transcription Models
          </a>
        </Form>

        <Button
          primary
          onClick={() =>
            dispatch(
              startTranscription({ server: servers[selectedServer], model: models[selectedModel] })
            )
          }
        >
          Start Transcribing
        </Button>
        <Button onClick={() => dispatch(abortTranscription())}>abort</Button>
      </MainCenterColumn>
    </AppContainer>
  );
}
