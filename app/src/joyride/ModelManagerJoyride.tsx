import * as React from 'react';

const steps_first = [
  {
    target: 'body',
    placement: 'center' as const,
    content: (
      <p>
        Here you can download so called "transcription models". These models will help the computer
        transcribe audio into text. For Each language you want to work with you need at least one
        model
      </p>
    ),
  },
  {
    target: '#English-small',
    content: <p>Small models are fast to download and use not much disk space.</p>,
  },
  {
    target: '#English-big',
    content: (
      <p>
        Big models take longer to load, consume more disk space but generally give better results.
      </p>
    ),
  },
  {
    target: '#download',
    content: (
      <p>You should now download at least one transcription model. This might take some time.</p>
    ),
  },
];

const steps_second = [
  {
    target: '#downloaded',
    content: <p>Congratulations 🎉. You Now have a transcription model...</p>,
  },
  {
    target: '#back',
    content: (
      <p>...and can go back and transcribe your media file. Do you remember how to do that?</p>
    ),
  },
];
