import * as React from 'react';
import { Joyride } from '../components/Joyride';
import { Text } from 'evergreen-ui';

const steps = [
  {
    target: '#model',
    content: <Text>Here you should select the model you just downloaded...</Text>,
  },
  {
    target: '#start',
    content: <Text>... and now start the transcription. This might take a moment.</Text>,
  },
];

export function TranscribeJoyride(): JSX.Element {
  return <Joyride steps={steps} page={'transcribe'} />;
}
