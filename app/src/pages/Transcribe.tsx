import * as React from 'react';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { abortTranscription, startTranscription } from '../state/transcribe';
import { TitleBar } from '../components/TitleBar';
import { AppContainer, MainCenterColumn } from '../components/Util';
import { RootState } from '../state';
import { openModelManager } from '../state/nav';
import { Joyride } from '../components/Joyride';
import { Button, Link } from 'evergreen-ui';

export function TranscribePage(): JSX.Element {
  const dispatch = useDispatch();
  const file = useSelector((state: RootState) => state.transcribe.file) || '';
  const models = useSelector((state: RootState) =>
    Object.values(state.models.downloaded).flatMap((x) => x)
  );

  const [selectedModel, setSelectedModel] = useState(0);
  const [diarize, setDiarize] = useState(true);

  const steps = [
    {
      target: '#lang',
      content: <p>Here you should select the model you just downloaded...</p>,
    },
    {
      target: '#start',
      content: <p>... and now start the transcription. This might take a moment.</p>,
    },
  ];

  return (
    <AppContainer>
      <Joyride steps={steps} page={'model-manager-second'} />

      <TitleBar />
      <MainCenterColumn>
        <Form>
          <span style={{ opacity: 0.5 }}>Opened File</span>
          <span style={{ textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {file.split('/').pop()}
          </span>

          <span style={{ opacity: 0.5 }}>Transcription Model</span>
          <select
            id={'lang'}
            value={selectedModel}
            onChange={(e) => setSelectedModel(parseInt(e.target.value))}
          >
            {models.map((model, i) => (
              <option key={i} value={i}>
                {model.lang} - {model.name}
              </option>
            ))}
          </select>

          <Link style={{ gridColumn: '2 / 2' }} onClick={() => dispatch(openModelManager())}>
            Download More Transcription Models
          </Link>

          <span style={{ opacity: 0.5 }}>Auto-detect speakers?</span>
          <input
            type={'checkbox'}
            checked={diarize}
            onChange={(e) => setDiarize(e.target.checked)}
          />
        </Form>

        <Button
          id={'start'}
          appearance={'primary'}
          onClick={() =>
            dispatch(
              startTranscription({
                model: models[selectedModel],
                diarize,
              })
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
