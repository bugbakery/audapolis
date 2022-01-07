import { Combobox, FormField, majorScale } from 'evergreen-ui';
import React, { MutableRefObject, useState } from 'react';
import { Document, DocumentGenerator } from '../../../core/document';
import { RootState } from '../../../state';
import { assertSome } from '../../../util';
import { useSelector, useStore } from 'react-redux';
import { exportOtio } from '../../../core/otio';
import path from 'path';
import { ExportType } from './index';

export const exportDefinition: ExportType = {
  type: 'OpenTimelineIO',
  defaultExtension: '_proj',
  filters: [],
  component: Otio,
};

export function Otio({
  exportCallbackRef,
}: {
  exportCallbackRef: MutableRefObject<(document: Document, path: string) => Promise<void>>;
}): JSX.Element {
  const store = useStore();
  const documentPath = useSelector((state: RootState) => state.editor.present?.path || '');
  const documentBaseName = path.basename(documentPath, '.audapolis');

  exportCallbackRef.current = async (document, path) => {
    const state: RootState = store.getState();
    assertSome(state.editor.present);
    const server = state.server.servers[state.server.selectedServer];

    const renderItems = DocumentGenerator.fromParagraphs(document.content)
      .toRenderItems()
      .collect();
    const sources = document.sources;
    await exportOtio(
      documentBaseName,
      otioFormat.extension,
      otioFormat.adapter,
      renderItems,
      sources,
      path,
      server
    );
  };

  const otioFormats = [
    {
      name: 'Final Cut Pro',
      adapter: 'fcp_xml',
      extension: 'xml',
    },
    {
      name: 'Final Cut Pro X',
      adapter: 'fcpx_xml',
      extension: 'xml',
    },
    {
      name: 'Avid AAF',
      adapter: 'aaf',
      extension: 'aaf',
    },
    {
      name: 'Pitivi (Gstreamer Editing Services)',
      adapter: 'xges',
      extension: 'xges',
    },
    {
      name: 'Kdenlive',
      adapter: 'kdenlive',
      extension: 'kdenlive',
    },
    {
      name: 'OpenTimelineIO JSON',
      adapter: 'otio_json',
      extension: 'json',
    },
  ];

  const [otioFormat, setOtioFormat] = useState(otioFormats[0]);
  return (
    <FormField label="Output Format" marginBottom={majorScale(3)}>
      <Combobox
        width={'100%'}
        initialSelectedItem={otioFormat}
        items={otioFormats}
        itemToString={(x) => x.name}
        onChange={(selected) => setOtioFormat(selected)}
      />
    </FormField>
  );
}
