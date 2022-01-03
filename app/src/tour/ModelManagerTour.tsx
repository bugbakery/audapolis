import * as React from 'react';
import { Tour } from '../components/Tour';
import { Text } from 'evergreen-ui';

const steps = [
  {
    body: (
      <Text>
        Here you can download so called "transcription models". These models will help the computer
        to transcribe audio into text. For Each language you want to work with, you need at least
        one model
      </Text>
    ),
  },
  {
    target: '#English-small',
    body: <Text>Small models are fast to download and use not much disk space.</Text>,
  },
  {
    target: '#English-big',
    body: (
      <Text>
        Big models take longer to load, consume more disk space but generally give better results.
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
    body: <Text>Congratulations 🎉. You Now have a transcription model...</Text>,
  },
  {
    target: '#back',
    body: <Text>...and can go back and transcribe your media file.</Text>,
  },
];

export function ModelManagerTour({ hasDownloaded }: { hasDownloaded?: boolean }): JSX.Element {
  return <Tour steps={steps} page={'model_manager'} dependencyStates={{ hasDownloaded }} />;
}
