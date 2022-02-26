import * as React from 'react';
import { Tour } from '../components/Tour';
import { Text } from 'evergreen-ui';

const steps = [
  {
    target: '#model',
    body: <Text>Here you should select the language you just downloaded...</Text>,
    showDependency: 'animationDone',
  },
  {
    target: '#start',
    body: <Text>... and now start the transcription. This might take a moment.</Text>,
  },
];

export function TranscribeTour(states: { animationDone: boolean }): JSX.Element {
  return <Tour steps={steps} page={'transcribe'} dependencyStates={states} />;
}
