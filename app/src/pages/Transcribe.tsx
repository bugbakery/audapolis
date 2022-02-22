import * as React from 'react';
import { ChangeEvent, useEffect, useState } from 'react';
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
  Group,
  Link,
  majorScale,
  minorScale,
  Pane,
  Text,
  TextInputField,
  toaster,
} from 'evergreen-ui';
import * as path from 'path';
import { TranscribeTour } from '../tour/TranscribeTour';
import { useTheme } from '../components/theme';
import { getDefaultModel, Model } from '../state/models';

function getDefaultModelInstance(models: Model[], lang: string, type: string) {
  const default_model_id = getDefaultModel(lang, type);
  for (const model of models) {
    if (model.model_id == default_model_id) {
      return model;
    }
  }
  return models[0];
}
function ModelSelector({
  models,
  selectedModel,
  setSelectedModel,
}: {
  models: Model[];
  selectedModel: Model;
  setSelectedModel: (m: Model) => void;
}): JSX.Element {
  if (models.length == 1) {
    return <Text size={300}>Selected model: {selectedModel.name}</Text>;
  }
  return (
    <Combobox
      width={'100%'}
      selectedItem={selectedModel}
      items={models}
      itemToString={(model) => `${model.name}`}
      onChange={(selected) => {
        if (selected !== null) setSelectedModel(selected);
      }}
    />
  );
}
export function TranscribePage(): JSX.Element {
  const dispatch = useDispatch();
  const file = useSelector((state: RootState) => state.transcribe.file) || '';

  const languages = useSelector((state: RootState) => {
    return Object.values(state.models.languages)
      .map((lang) => {
        return {
          ...lang,
          punctuation_models: lang.punctuation_models.filter(
            (x) => x.model_id in state.models.downloaded
          ),
          transcription_models: lang.transcription_models.filter(
            (x) => x.model_id in state.models.downloaded
          ),
        };
      })
      .filter((lang) => lang.transcription_models.length > 0);
  });
  const [selectedLanguage, setSelectedLanguage] = useState(languages[0]);
  const [selectedTranscriptionModel, setSelectedTranscriptionModel] = useState(
    getDefaultModelInstance(
      selectedLanguage.transcription_models,
      selectedLanguage.lang,
      'transcription'
    )
  );
  useEffect(() => {
    setSelectedTranscriptionModel(
      getDefaultModelInstance(
        selectedLanguage.transcription_models,
        selectedLanguage.lang,
        'transcription'
      )
    );
  }, [selectedLanguage]);
  const [punctuate, setPunctuate] = useState(selectedLanguage.punctuation_models.length > 0);
  const [selectedPunctuationModel, setSelectedPunctuationModel] = useState(
    getDefaultModelInstance(
      selectedLanguage.punctuation_models,
      selectedLanguage.lang,
      'punctuation'
    )
  );
  useEffect(() => {
    setSelectedPunctuationModel(
      getDefaultModelInstance(
        selectedLanguage.punctuation_models,
        selectedLanguage.lang,
        'punctuation'
      )
    );
    setPunctuate(selectedLanguage.punctuation_models.length > 0);
  }, [selectedLanguage]);
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
                  (diarizationMode == 'advanced' && isFinite(parsedSpeakers)) ||
                  diarizationMode != 'advanced'
                ) {
                  dispatch(
                    startTranscription({
                      transcription_model: selectedTranscriptionModel,
                      punctuation_model: selectedPunctuationModel,
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
          label="Language"
          description={
            <Link onClick={() => dispatch(openModelManager())}>Manage Languages & Models</Link>
          }
          id={'model' /* for tour */}
          marginBottom={majorScale(3)}
        >
          <Combobox
            width={'100%'}
            selectedItem={selectedLanguage}
            items={languages}
            itemToString={(lang) => `${lang.lang}`}
            onChange={(selected) => setSelectedLanguage(selected)}
            marginBottom={majorScale(1)}
          />
          <details style={{ marginBottom: majorScale(3) }}>
            <summary style={{ color: theme.colors.default, marginBottom: majorScale(1) }}>
              <Text size={300}>Advanced Language Settings</Text>
            </summary>
            <Pane
              padding={majorScale(1)}
              borderRadius={minorScale(1)}
              backgroundColor={theme.intents.info.background}
            >
              <FormField
                label={'Transcription'}
                description={
                  'If there are multiple transcription models for the selected language, you can choose between them here. ' +
                  'They often differ in speed, needed RAM and accuracy.'
                }
              >
                <ModelSelector
                  selectedModel={selectedTranscriptionModel}
                  models={selectedLanguage.transcription_models}
                  setSelectedModel={setSelectedTranscriptionModel}
                />
              </FormField>
              {selectedLanguage.punctuation_models.length > 0 ? (
                <FormField
                  marginTop={majorScale(2)}
                  label={'Punctuation Reconstruction'}
                  description={
                    'Audapolis can try to automatically guess the punctuation. This requires a punctuation model, which is only supported for a few languages'
                  }
                >
                  <Checkbox
                    label={'Enable Punctuation Reconstruction'}
                    checked={punctuate}
                    disabled={selectedLanguage.punctuation_models.length == 0}
                    onChange={(e) => setPunctuate(e.target.checked)}
                  />
                  {punctuate ? (
                    <ModelSelector
                      selectedModel={selectedPunctuationModel}
                      models={selectedLanguage.punctuation_models}
                      setSelectedModel={setSelectedPunctuationModel}
                    />
                  ) : (
                    <></>
                  )}
                </FormField>
              ) : (
                <></>
              )}
            </Pane>
          </details>
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
