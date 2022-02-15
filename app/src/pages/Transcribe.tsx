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
  Combobox,
  Dialog,
  FormField,
  Group,
  Link,
  majorScale,
  Text,
  TextInputField,
  toaster,
} from 'evergreen-ui';
import * as path from 'path';
import { TranscribeTour } from '../tour/TranscribeTour';
import { useTheme } from '../components/theme';

export function TranscribePage(): JSX.Element {
  const dispatch = useDispatch();
  const file = useSelector((state: RootState) => state.transcribe.file) || '';
  const models = useSelector((state: RootState) =>
    Object.values(state.models.downloaded).flatMap((x) => x)
  );
  const [selectedModel, setSelectedModel] = useState(models[0]);
  const [diarizationMode, setDiarizationMode] = useState('on' as 'off' | 'on' | 'advanced');
  const [diarizationSpeakers, setDiarizationSpeakers] = useState('4');
  const [animationDone, setAnimationDone] = useState(false);

  const theme = useTheme();

  return (
    <AppContainer>
      <TranscribeTour animationDone={animationDone} />

      <TitleBar />
      <Dialog
        isShown={true}
        title="Transcription Options"
        onCloseComplete={() => dispatch(openLanding())}
        onOpenComplete={() => setAnimationDone(true)}
        containerProps={{ backgroundColor: theme.colors.overlayBackgroundColor }}
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
                if (
                  (diarizationMode != 'off' && isFinite(parsedSpeakers)) ||
                  diarizationMode == 'off'
                ) {
                  dispatch(
                    startTranscription({
                      model: selectedModel,
                      diarize: diarizationMode != 'off',
                      diarize_max_speakers:
                        diarizationMode == 'advanced' ? parsedSpeakers - 1 : null,
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
        <FormField
          marginBottom={majorScale(1)}
          label="Speaker Seperation"
          description={'Audapolis can automatically seperate different speakers in the audio file.'}
        >
          <Group width={'100%'}>
            <Button
              flex={1}
              isActive={diarizationMode == 'off'}
              onClick={() => setDiarizationMode('off')}
            >
              Off
            </Button>
            <Button
              flex={1}
              isActive={diarizationMode == 'on'}
              onClick={() => setDiarizationMode('on')}
            >
              On
            </Button>
            <Button
              flex={1}
              isActive={diarizationMode == 'advanced'}
              onClick={() => setDiarizationMode('advanced')}
            >
              Advanced
            </Button>
          </Group>
        </FormField>
        {diarizationMode == 'advanced' ? (
          <>
            <TextInputField
              label={'Maximum Number Of Speakers'}
              description={
                'This specifies an upper limit of speakers. It might be beneficial to set this ' +
                'higher than the actual number of speakers in your document, for example if it ' +
                'includes noises or music.'
              }
              value={diarizationSpeakers}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setDiarizationSpeakers(e.target.value)
              }
              type={'number'}
              isInvalid={!isFinite(parseInt(diarizationSpeakers))}
            />
          </>
        ) : (
          <></>
        )}
      </Dialog>
    </AppContainer>
  );
}
