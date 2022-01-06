import React, { MutableRefObject, useState } from 'react';
import { Document } from '../../../core/document';
import { exportWebVTT } from '../../../core/webvtt';
import { Checkbox } from 'evergreen-ui';
import { useSelector } from 'react-redux';
import { RootState } from '../../../state';

export function WebVtt({
  exportCallbackRef,
}: {
  exportCallbackRef: MutableRefObject<(document: Document, path: string) => Promise<void>>;
}): JSX.Element {
  exportCallbackRef.current = async (document, path) => {
    await exportWebVTT(document.content, path, wordTimings, includeSpeakerNames);
  };

  const displaySpeakerNames =
    useSelector((state: RootState) => state.editor.present?.displaySpeakerNames) || false;
  const [includeSpeakerNames, setIncludeSpeakerNames] = useState(displaySpeakerNames);
  const [wordTimings, setWordTimings] = useState(true);

  return (
    <>
      <Checkbox
        label="Include Speaker Names"
        checked={includeSpeakerNames}
        onChange={(e) => setIncludeSpeakerNames(e.target.checked)}
      />
      <Checkbox
        label="Include Word-Timings"
        checked={wordTimings}
        onChange={(e) => setWordTimings(e.target.checked)}
      />
    </>
  );
}
