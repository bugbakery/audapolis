import React, { MutableRefObject } from 'react';
import { DocumentGenerator, Document } from '../../../core/document';
import { exportAudio } from '../../../core/ffmpeg';

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
