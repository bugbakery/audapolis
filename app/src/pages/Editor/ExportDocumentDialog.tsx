import React, { useEffect, useRef, useState } from 'react';
import { RootState } from '../../state';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { setExportPopup } from '../../state/editor';
import path from 'path';
import { FilePickerWithText } from '../../components/FilePicker';
import { toast } from 'react-hot-toast';
import { Document } from '../../core/document';
import { assertSome, switchExtension } from '../../util';
import { Button, Combobox, Dialog, FormField, majorScale } from 'evergreen-ui';
import { exportDefinition as audioExportDefinition } from './ExportOptions/Audio';
import { exportDefinition as videoExportDefinition } from './ExportOptions/Video';
import { exportDefinition as otioExportDefinition } from './ExportOptions/Otio';
import { exportDefinition as subtitleExportDefinition } from './ExportOptions/Subtitles';
import { getHomePath } from '../../../ipc/ipc_renderer';
import { ExportType } from './ExportOptions';

const exportValues: ExportType[] = [
  audioExportDefinition,
  videoExportDefinition,
  otioExportDefinition,
  subtitleExportDefinition,
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
