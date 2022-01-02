import { Joyride } from '../components/Joyride';
import * as React from 'react';
import { Text } from 'evergreen-ui';

const steps = [
  {
    target: 'body',
    placement: 'center' as const,
    title: <>Welcome to audapolis!</>,
    content: (
      <Text>
        This short introduction will guide you through the basic features and get you up to speed.
      </Text>
    ),
  },
  {
    target: '#import',
    content: (
      <Text>
        You can import your media files here. They will automatically be transcribed later. You can
        for example start with your favourite speech.
      </Text>
    ),
  },
];

export function LandingJoyride(): JSX.Element {
  return <Joyride steps={steps} page={'landing'} />;
}
