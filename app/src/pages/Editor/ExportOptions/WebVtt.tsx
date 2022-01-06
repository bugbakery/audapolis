import React, { ChangeEvent, MutableRefObject, useState } from 'react';
import { Document } from '../../../core/document';
import { exportWebVTT } from '../../../core/webvtt';
import { Checkbox, FormField, majorScale, TextInput } from 'evergreen-ui';
import { useSelector } from 'react-redux';
import { RootState } from '../../../state';

export function WebVtt({
  exportCallbackRef,
}: {
  exportCallbackRef: MutableRefObject<(document: Document, path: string) => Promise<void>>;
}): JSX.Element {
  exportCallbackRef.current = async (document, path) => {
    await exportWebVTT(
      document.content,
      path,
      wordTimings,
      includeSpeakerNames,
      limitLineLength ? lineLimit : null
    );
  };

  const displaySpeakerNames =
    useSelector((state: RootState) => state.editor.present?.displaySpeakerNames) || false;
  const [includeSpeakerNames, setIncludeSpeakerNames] = useState(displaySpeakerNames);
  const [wordTimings, setWordTimings] = useState(true);
  const [limitLineLength, setLimitLineLength] = useState(false);
  const [lineLimit, setLineLimit] = useState(60);

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
      />{' '}
      <Checkbox
        label="Limit line length"
        checked={limitLineLength}
        onChange={(e) => setLimitLineLength(e.target.checked)}
      />
      {limitLineLength ? (
        <FormField label="Line length limit (in characters)" marginBottom={majorScale(3)}>
          <TextInput
            width={'100%'}
            value={lineLimit}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setLineLimit(parseInt(e.target.value))}
            type={'number'}
          />
        </FormField>
      ) : (
        <></>
      )}
    </>
  );
}
