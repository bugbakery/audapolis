import * as React from 'react';
import { Tour } from '../components/Tour';
import { Text } from 'evergreen-ui';

const steps = [
  {
    target: '#transcription_table',
    body: (
      <Text>
        At first you can download so called "transcription models". These models will help the
        computer to transcribe audio into text. You need at least one transcription model for each
        language you want to use.
      </Text>
    ),
  },
  {
    target: '#small',
    body: <Text>Small models are fast to download and don't need much disk space.</Text>,
  },
  {
    target: '#big',
    body: (
      <Text>
        Big models take longer to load, consume more disk space but generally give much better
        results.
      </Text>
    ),
  },
  {
    target: '.download',
    body: (
      <Text>
        You should now download at least one transcription model. This might take some time.
      </Text>
    ),
  },
  {
    showDependency: 'hasDownloaded',
    target: '.downloaded',
    body: <Text>Congratulations 🎉. You now have a transcription model...</Text>,
  },
  {
    target: '#punctuation_table',
    body: (
      <Text>
        For some languages you can also download a punctuation model. These help the computer to
        guess which punctuation was present in the spoken text.
      </Text>
    ),
  },
  {
    target: '#back',
    body: <Text>Now you can go back and transcribe your media file.</Text>,
  },
];

export function LanguageSettingsTour({ hasDownloaded }: { hasDownloaded?: boolean }): JSX.Element {
  return <Tour steps={steps} page={'language_settings'} dependencyStates={{ hasDownloaded }} />;
}
