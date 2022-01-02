import * as React from 'react';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { startTranscription } from '../state/transcribe';
import { TitleBar } from '../components/TitleBar';
import { AppContainer } from '../components/Util';
import { RootState } from '../state';
import { openLanding, openModelManager } from '../state/nav';
import { useState } from 'react';
import { Joyride } from '../components/Joyride';
import { Dialog, FormField, Link, majorScale, SelectField, Text } from 'evergreen-ui';
import * as path from 'path';

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
      <Dialog
        isShown={true}
        title="Transcription Options"
        confirmLabel="Transcribe"
        onConfirm={() =>
          dispatch(
            startTranscription({
              model: models[selectedModel],
            })
          )
        }
        onCloseComplete={() => dispatch(openLanding())}
      >
        <FormField label="Opened File" marginBottom={majorScale(3)}>
          <Text color="muted">{path.basename(file)}</Text>
        </FormField>

        <SelectField
          label="Transcription Model"
          hint={
            <Link style={{ gridColumn: '2 / 2' }} onClick={() => dispatch(openModelManager())}>
              Download More Transcription Models
            </Link>
          }
          id={'lang'}
          value={selectedModel}
          onChange={(e) => setSelectedModel(parseInt(e.target.value))}
        >
          {models.map((model, i) => (
            <option key={i} value={i}>
              {model.lang} - {model.name}
            </option>
          ))}
        </SelectField>
      </Dialog>
    </AppContainer>
  );
}
