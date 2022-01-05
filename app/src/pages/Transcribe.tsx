import * as React from 'react';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { startTranscription } from '../state/transcribe';
import { TitleBar } from '../components/TitleBar';
import { AppContainer } from '../components/Util';
import { RootState } from '../state';
import { openLanding, openModelManager } from '../state/nav';
import { useState } from 'react';
import {
  Button,
  Checkbox,
  Combobox,
  Dialog,
  FormField,
  Link,
  majorScale,
  Text,
} from 'evergreen-ui';
import * as path from 'path';
import { TranscribeTour } from '../tour/TranscribeTour';

export function TranscribePage(): JSX.Element {
  const dispatch = useDispatch();
  const file = useSelector((state: RootState) => state.transcribe.file) || '';
  const models = useSelector((state: RootState) =>
    Object.values(state.models.downloaded).flatMap((x) => x)
  );
  const [selectedModel, setSelectedModel] = useState(0);
  const [diarize, setDiarize] = useState(true);

  return (
    <AppContainer>
      <TranscribeTour />

      <TitleBar />
      <Dialog
        isShown={true}
        title="Transcription Options"
        onCloseComplete={() => dispatch(openLanding())}
        footer={({ close }) => (
          <>
            <Button tabIndex={0} onClick={() => close()}>
              Cancel
            </Button>

            <Button
              id={'start' /* for tour */}
              tabIndex={0}
              marginLeft={8}
              appearance="primary"
              onClick={() =>
                dispatch(
                  startTranscription({
                    model: models[selectedModel],
                    diarize,
                  })
                )
              }
            >
              Transcribe
            </Button>
          </>
        )}
      >
        <FormField label="Opened File" marginBottom={majorScale(3)}>
          <Text color="muted">{path.basename(file)}</Text>
        </FormField>
        <Checkbox
          label="Auto-detect speakers"
          checked={diarize}
          onChange={(e) => setDiarize(e.target.checked)}
        />
        <FormField
          label="Transcription Model"
          hint={
            <Link onClick={() => dispatch(openModelManager())}>
              Download More Transcription Models
            </Link>
          }
          marginBottom={majorScale(3)}
          id={'model' /* for tour */}
        >
          <Combobox
            width={'100%'}
            initialSelectedItem={selectedModel}
            items={models}
            itemToString={(model) => `${model.lang} - ${model.name}`}
            onChange={(selected) => setSelectedModel(selected)}
          />
        </FormField>
      </Dialog>
    </AppContainer>
  );
}
