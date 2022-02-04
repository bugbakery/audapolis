import * as React from 'react';
import { ChangeEvent, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { startTranscription } from '../state/transcribe';
import { TitleBar } from '../components/TitleBar';
import { AppContainer } from '../components/Util';
import { RootState } from '../state';
import { openLanding, openModelManager } from '../state/nav';
import {
  Button,
  Checkbox,
  Combobox,
  Dialog,
  FormField,
  Link,
  majorScale,
  Text,
  TextInputField,
  toaster,
} from 'evergreen-ui';
import * as path from 'path';
import { TranscribeTour } from '../tour/TranscribeTour';

export function TranscribePage(): JSX.Element {
  const dispatch = useDispatch();
  const file = useSelector((state: RootState) => state.transcribe.file) || '';
  const models = useSelector((state: RootState) =>
    Object.values(state.models.downloaded).flatMap((x) => x)
  );
  const [selectedModel, setSelectedModel] = useState(models[0]);
  const [diarize, setDiarize] = useState(true);
  const [diarizationSpeakers, setDiarizationSpeakers] = useState('2');
  const [animationDone, setAnimationDone] = useState(false);

  return (
    <AppContainer>
      <TranscribeTour animationDone={animationDone} />

      <TitleBar />
      <Dialog
        isShown={true}
        title="Transcription Options"
        onCloseComplete={() => dispatch(openLanding())}
        onOpenComplete={() => setAnimationDone(true)}
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
              onClick={() => {
                const parsedSpeakers = parseInt(diarizationSpeakers);
                if ((diarize && isFinite(parsedSpeakers)) || !diarize) {
                  dispatch(
                    startTranscription({
                      model: selectedModel,
                      diarize: diarize,
                      diarize_max_speakers: diarize ? parsedSpeakers - 1 : 0,
                    })
                  );
                } else {
                  toaster.warning('number of speakers is invalid');
                }
              }}
            >
              Transcribe
            </Button>
          </>
        )}
      >
        <FormField label="Opened File" marginBottom={majorScale(3)}>
          <Text color="muted">{path.basename(file)}</Text>
        </FormField>
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
        <FormField label={'Speaker Separation'}>
          <Checkbox
            label="Automatically separate speakers"
            checked={diarize}
            onChange={(e) => setDiarize(e.target.checked)}
          />
          {diarize ? (
            <TextInputField
              description={'number of speakers'}
              value={diarizationSpeakers}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setDiarizationSpeakers(e.target.value)
              }
              isInvalid={!isFinite(parseInt(diarizationSpeakers))}
            />
          ) : (
            <></>
          )}
        </FormField>
      </Dialog>
    </AppContainer>
  );
}
