import React, { MutableRefObject } from 'react';
import { Document } from '../../../core/document';
import { exportAudio, ProgressCallback } from '../../../core/ffmpeg';
import { ExportType } from './index';
import { documentRenderItems } from '../../../state/editor/selectors';

export const exportDefinition: ExportType = {
  type: 'audio',
  defaultExtension: '.mp3',
  filters: [{ name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'wma', 'aac'] }],
  component: Audio,
};

export function Audio({
  exportCallbackRef,
}: {
  exportCallbackRef: MutableRefObject<
    (document: Document, path: string, progressCallback: ProgressCallback) => Promise<void>
  >;
}): JSX.Element {
  exportCallbackRef.current = async (document, path, progressCallback) => {
    const ris = documentRenderItems(document.content);
    const sources = document.sources;
    await exportAudio(ris, sources, path, progressCallback);
  };

  return <></>;
}
