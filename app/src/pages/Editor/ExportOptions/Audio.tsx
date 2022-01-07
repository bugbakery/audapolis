import React, { MutableRefObject } from 'react';
import { DocumentGenerator, Document } from '../../../core/document';
import { exportAudio } from '../../../core/ffmpeg';
import { ExportType } from './index';

export const exportDefinition: ExportType = {
  type: 'audio',
  defaultExtension: '.mp3',
  filters: [{ name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'wma', 'aac'] }],
  component: Audio,
};

export function Audio({
  exportCallbackRef,
}: {
  exportCallbackRef: MutableRefObject<(document: Document, path: string) => Promise<void>>;
}): JSX.Element {
  exportCallbackRef.current = async (document, path) => {
    const renderItems = DocumentGenerator.fromParagraphs(document.content)
      .toRenderItems()
      .collect();
    const sources = document.sources;
    await exportAudio(renderItems, sources, path);
  };

  return <></>;
}
