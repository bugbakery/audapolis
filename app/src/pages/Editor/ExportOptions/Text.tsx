import React, { MutableRefObject, useState } from 'react';
import { Document } from '../../../core/document';
import { Checkbox } from 'evergreen-ui';
import { useSelector } from 'react-redux';
import { RootState } from '../../../state';
import { ExportType } from './index';
import { ProgressCallback } from '../../../core/ffmpeg';
import { macroItemsToText, memoizedMacroItems } from '../../../state/editor/selectors';
import fs from 'fs';

export const exportDefinition: ExportType = {
  type: 'text',
  defaultExtension: '.txt',
  filters: [{ name: 'Text Files', extensions: ['txt'] }],
  component: Text,
};

export function Text({
  exportCallbackRef,
}: {
  exportCallbackRef: MutableRefObject<
    (document: Document, path: string, progressCallback: ProgressCallback) => Promise<void>
  >;
  outputPath: string;
  setOutputPath: (path: string) => void;
}): JSX.Element {
  exportCallbackRef.current = async (document, path) => {
    const contentMacros = memoizedMacroItems(document.content);
    const text = macroItemsToText(contentMacros, includeSpeakerNames);
    fs.writeFileSync(path, text + '\n');
  };

  const displaySpeakerNames =
    useSelector(
      (state: RootState) => state.editor.present?.document.metadata.display_speaker_names
    ) || false;
  const [includeSpeakerNames, setIncludeSpeakerNames] = useState(displaySpeakerNames);

  return (
    <>
      <Checkbox
        label="Include Speaker Names"
        checked={includeSpeakerNames}
        onChange={(e) => setIncludeSpeakerNames(e.target.checked)}
      />
    </>
  );
}
