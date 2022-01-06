import { CrossIcon, FormField, Group, IconButton, majorScale, TextInput } from 'evergreen-ui';
import React, { ChangeEvent, MutableRefObject, useState } from 'react';
import { player } from '../../../core/player';
import { DocumentGenerator, Document } from '../../../core/document';
import { exportVideo } from '../../../core/ffmpeg';

export function Video({
  exportCallbackRef,
}: {
  exportCallbackRef: MutableRefObject<(document: Document, path: string) => Promise<void>>;
}): JSX.Element {
  const targetResolution = player.getTargetResolution();
  const [height, setHeight] = useState(targetResolution.y);
  const [width, setWidth] = useState(targetResolution.x);
  exportCallbackRef.current = async (document, path) => {
    const renderItems = DocumentGenerator.fromParagraphs(document.content)
      .toRenderItems()
      .collect();
    const sources = document.sources;
    await exportVideo(renderItems, sources, path, {
      x: width,
      y: height,
    });
  };

  return (
    <FormField label="Resolution" marginBottom={majorScale(3)}>
      <Group width={'100%'}>
        <TextInput
          value={width}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setWidth(parseInt(e.target.value))}
          flex={1}
          type={'number'}
        />
        <IconButton icon={CrossIcon} appearance={'minimal'} disabled={true}></IconButton>
        <TextInput
          value={height}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setHeight(parseInt(e.target.value))}
          flex={1}
          type={'number'}
        />
      </Group>
    </FormField>
  );
}
