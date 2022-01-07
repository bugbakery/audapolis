import React, { MutableRefObject, useEffect, useRef, useState } from 'react';
import { RootState } from '../../state';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { setExportPopup } from '../../state/editor';
import path from 'path';
import { FilePickerWithText } from '../../components/FilePicker';
import { FileFilter } from 'electron';
import { toast } from 'react-hot-toast';
import { Document } from '../../core/document';
import { assertSome, switchExtension } from '../../util';
import { Button, Combobox, Dialog, FormField, majorScale } from 'evergreen-ui';
import { Video } from './ExportOptions/Video';
import { Otio } from './ExportOptions/Otio';
import { Audio } from './ExportOptions/Audio';
import { Subtitles } from './ExportOptions/Subtitles';
import { getHomePath } from '../../../main_process/ipc/ipc_client';

type ExportType = {
  type: string;
  defaultExtension: string;
  filters: FileFilter[];
  // We pass a ref as onExport which the function will set to its export function
  component: (props: {
    exportCallbackRef: MutableRefObject<(document: Document, path: string) => Promise<void>>;
    outputPath: string;
    setOutputPath: (path: string) => void;
  }) => JSX.Element;
};

const exportValues: (ExportType & { filters: FileFilter[] })[] = [
  {
    type: 'audio',
    defaultExtension: '.mp3',
    filters: [{ name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'wma', 'aac'] }],
    component: Audio,
  },
  {
    type: 'video',
    defaultExtension: '.mp4',
    filters: [{ name: 'Video Files', extensions: ['mp4', 'mkv', 'gif'] }],
    component: Video,
  },
  {
    type: 'OpenTimelineIO',
    defaultExtension: '_proj',
    filters: [],
    component: Otio,
  },
  {
    type: 'Subtitles',
    defaultExtension: '.vtt',
    filters: [
      { name: 'WebVTT Files', extensions: ['vtt'] },
      { name: 'SRT Files', extensions: ['srt'] },
    ],
    component: Subtitles,
  },
];

export function ExportDocumentDialog(): JSX.Element {
  const dispatch = useDispatch();
  const store = useStore();
  const [home, setHome] = useState('');
  getHomePath(setHome);
  const documentPath = useSelector(
    (state: RootState) => state.editor.present?.path || path.join(home, 'Untitled.audapolis')
  );
  const documentBaseName = path.basename(documentPath, '.audapolis');
  const documentBasePath = path.join(path.dirname(documentPath), documentBaseName);
  const exportFnRef = useRef((_a: Document, _b: string) => {
    return new Promise<void>((resolve, _) => {
      resolve();
    });
  });

  const [formState, setFormState] = useState({
    ...exportValues[0],
    path: documentBasePath + exportValues[0].defaultExtension,
  });

  useEffect(() => {
    setFormState((state) => ({ ...state, path: documentBasePath + state.defaultExtension }));
  }, [documentBasePath]);

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
          onChange={(selected) =>
            setFormState((state) => ({
              ...selected,
              path: switchExtension(state.path, selected.defaultExtension),
            }))
          }
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

      <ExportOptionComponent
        exportCallbackRef={exportFnRef}
        outputPath={formState.path}
        setOutputPath={(path) => setFormState((state) => ({ ...state, path }))}
      />
    </Dialog>
  );
}
