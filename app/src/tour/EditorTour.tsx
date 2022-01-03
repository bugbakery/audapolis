import * as React from 'react';
import { Strong, Text } from 'evergreen-ui';
import { Tour } from '../components/Tour';

const steps = [
  {
    target: '#document',
    body: <Strong>This is the text that was transcribed from your media file.</Strong>,
  },
  {
    target: '#player-controls',
    body: (
      <Text>
        Here you can play / pause the current document. For that you can also use the space key.
      </Text>
    ),
  },
  {
    target: '#cursor',
    title: <>This is your cursor.</>,
    body: <Text>It is synchronized with the current playback position.</Text>,
  },
  {
    target: '#document',
    body: (
      <Text>
        To move the cursor, you can click on a word or use the arrow keys on your Keyboard. To
        insert a paragraph at the current cursor position, use the return Key. That should make your
        document a lot more manageable.
      </Text>
    ),
  },
  {
    target: '#document',
    body: (
      <Text>
        You can delete, words from the transcript - and the audio changes accordingly.{' '}
        <Strong>its like magic 💫.</Strong> You can also copy & paste text - try it!
      </Text>
    ),
  },
  {
    target: '#export',
    body: (
      <Text>
        After you are done editing, you can export the whole document to a media file by clicking
        this button.
      </Text>
    ),
  },
];

export function EditorTour(): JSX.Element {
  return <Tour steps={steps} page={'editor'} />;
}
