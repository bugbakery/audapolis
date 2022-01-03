import { Tour } from '../components/Tour';
import * as React from 'react';
import { Text } from 'evergreen-ui';

const steps = [
  {
    title: <>Welcome to audapolis!</>,
    body: (
      <Text>
        This short introduction will guide you through the basic features and get you up to speed.
      </Text>
    ),
  },
  {
    target: '#import',
    body: (
      <Text>
        You can import your media files here. They will automatically be transcribed later. You can
        for example start with your favourite speech.
      </Text>
    ),
  },
];

export function LandingTour(): JSX.Element {
  return <Tour steps={steps} page={'landing'} />;
}
