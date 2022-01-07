import React, { MutableRefObject, useRef, useState } from 'react';
import { RootState } from '../../state';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { setExportPopup } from '../../state/editor';
import path from 'path';
import { FilePickerWithText } from '../../components/FilePicker';
import { FileFilter } from 'electron';
import { toast } from 'react-hot-toast';
import { Document } from '../../core/document';
import { assertSome } from '../../util';
import { Button, Combobox, Dialog, FormField, majorScale } from 'evergreen-ui';
import { Video } from './ExportOptions/Video';
import { Otio } from './ExportOptions/Otio';
import { Audio } from './ExportOptions/Audio';
import { WebVtt } from './ExportOptions/WebVtt';

type ExportType = {
  type: string;
  path: string;
  filters: FileFilter[];
  // We pass a ref as onExport which the function will set to its export function
  component: (props: {
    exportCallbackRef: MutableRefObject<(document: Document, path: string) => Promise<void>>;
    outputPath: string;
  }) => JSX.Element;
};

export function ExportDocumentDialog(): JSX.Element {
  const dispatch = useDispatch();
  const store = useStore();
  const documentPath = useSelector((state: RootState) => state.editor.present?.path || '');
  const documentBaseName = path.basename(documentPath, '.audapolis');
  const documentBasePath = path.join(path.dirname(documentPath), documentBaseName);
  const exportFnRef = useRef((_a: Document, _b: string) => {
    return new Promise<void>((resolve, _) => {
      resolve();
    });
  });
  const exportValues: (ExportType & { filters: FileFilter[] })[] = [
    {
      type: 'audio',
      path: documentBasePath + '.mp3',
      filters: [{ name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'wma', 'aac'] }],
      component: Audio,
    },
    {
      type: 'video',
      path: documentBasePath + '.mp4',
      filters: [{ name: 'Video Files', extensions: ['mp4', 'mkv', 'gif'] }],
      component: Video,
    },
    {
      type: 'OpenTimelineIO',
      path: documentBasePath + '_proj',
      filters: [],
      component: Otio,
    },
    {
      type: 'WebVTT',
      path: documentBasePath + '.vtt',
      filters: [{ name: 'WebVTT Files', extensions: ['vtt'] }],
      component: WebVtt,
    },
  ];

  const [formState, setFormState] = useState(exportValues[0]);

  const popupState = useSelector((state: RootState) => state.editor.present?.exportPopup);
  const exportFn = (close: () => void) => {
    const action = async () => {
      close();
      const state: RootState = store.getState();
      assertSome(state.editor.present);
      await exportFnRef.current(state.editor.present.document, formState.path);
    };

    toast
      .promise(action(), {
        loading: 'Exporting...',
        success: <b>Export successful!</b>,
        error: <b>Export failed.</b>,
      })
      .catch((e) => console.log(e));
  };
  const ExportOptionComponent = formState.component;
  return (
    <Dialog
      onCloseComplete={() => dispatch(setExportPopup(false))}
      isShown={popupState}
      title={'Export document'}
      footer={({ close }) => (
        <>
          <Button onClick={() => dispatch(setExportPopup(false))}>abort</Button>
          <Button marginLeft={majorScale(1)} appearance={'primary'} onClick={() => exportFn(close)}>
            Start Export
          </Button>
        </>
      )}
    >
      <FormField label="Output Format" marginBottom={majorScale(3)}>
        <Combobox
          width={'100%'}
          initialSelectedItem={formState}
          items={exportValues}
          itemToString={(x) => x.type}
          onChange={(selected) => setFormState(selected)}
        />
      </FormField>
      <FormField label="Export Path" marginBottom={majorScale(3)}>
        <FilePickerWithText
          value={formState.path}
          onChange={(path) => setFormState((state) => ({ ...state, path }))}
          save={true}
          filters={formState.filters}
        />
      </FormField>

      <ExportOptionComponent exportCallbackRef={exportFnRef} outputPath={formState.path} />
    </Dialog>
  );
}
