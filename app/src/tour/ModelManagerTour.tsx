import * as React from 'react';
import { Tour } from '../components/Tour';
import { Text } from 'evergreen-ui';

const steps = [
  {
    body: (
      <Text>
        Here you can manage additional files called "models" that audapolis needs to support
        different languages. These models are for example used by the computer to transcribe audio
        into text. You need at least one model for each language and task.
      </Text>
    ),
  },
  { target: '#language_table', body: <Text>Click on a language you want to use.</Text> },
];

export function ModelManagerTour(): JSX.Element {
  return <Tour steps={steps} page={'model_manager'} />;
}
