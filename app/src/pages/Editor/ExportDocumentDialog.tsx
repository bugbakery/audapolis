import React, { useEffect, useRef, useState } from 'react';
import { RootState } from '../../state';
import { useDispatch, useSelector, useStore } from 'react-redux';
import path from 'path';
import { FilePickerWithText } from '../../components/FilePicker';
import { toast } from 'react-hot-toast';
import { Document, TimedItemExtension, Word } from '../../core/document';
import { assertSome, switchExtension } from '../../util';
import { Button, Combobox, Dialog, FormField, majorScale } from 'evergreen-ui';
import { exportDefinition as audioExportDefinition } from './ExportOptions/Audio';
import { exportDefinition as videoExportDefinition } from './ExportOptions/Video';
import { exportDefinition as otioExportDefinition } from './ExportOptions/Otio';
import { exportDefinition as subtitleExportDefinition } from './ExportOptions/Subtitles';
import { getHomePath } from '../../../ipc/ipc_renderer';
import { ExportType } from './ExportOptions';
import { setExportPopup, setExportState } from '../../state/editor/display';
import { ProgressCallback } from '../../core/ffmpeg';
import { useTheme } from '../../components/theme';
import { selectedItems, selectionDocument } from '../../state/editor/selectors';
import _ from 'lodash';

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
  const exportFnRef = useRef((_a: Document, _b: string, _c: ProgressCallback) => {
    return new Promise<void>((resolve, _) => {
      resolve();
    });
  });

  const popupState = useSelector((state: RootState) => state.editor.present?.exportPopup);

  const firstSelectionWordsString = useSelector((state: RootState) => {
    const editorState = state.editor.present;
    if (popupState != 'selection' || !editorState) return '';
    const selectionItems = _(selectedItems(editorState))
      .filter((x): x is Word & TimedItemExtension => x.type == 'word')
      .map((x) => x.word)
      .slice(0, 3)
      .value();
    if (selectionItems.length == 0) return '';
    return '_' + selectionItems.join('_');
  });

  const [formState, setFormState] = useState({
    ...exportValues[0],
    path: documentBasePath + firstSelectionWordsString + exportValues[0].defaultExtension,
  });

  useEffect(() => {
    setFormState((state) => ({
      ...state,
      path: documentBasePath + firstSelectionWordsString + state.defaultExtension,
    }));
  }, [documentBasePath, firstSelectionWordsString]);

  const exportFn = (close: () => void) => {
    const action = async () => {
      close();
      const state: RootState = store.getState();
      dispatch(setExportState({ running: true, progress: 0 }));
      assertSome(state.editor.present);
      const exportDocument =
        popupState == 'document'
          ? state.editor.present.document
          : selectionDocument(state.editor.present);
      await exportFnRef
        .current(exportDocument, formState.path, (p) => {
          dispatch(setExportState({ running: true, progress: p }));
        })
        .finally(() => dispatch(setExportState({ running: false, progress: 1 })));
    };

    toast
      .promise(
        action().then(() => {
          dispatch(setExportState({ running: false, progress: 1 }));
        }),
        {
          loading: `Exporting...`,
          success: <b>Export successful!</b>,
          error: <b>Export failed. See debugging console for more details.</b>,
        }
      )
      .catch((e) => {
        if (e?.code == 'ENOSPC') {
          alert(
            'The export failed because your disk is (almost) full.\n' +
              'Note: During export, audapolis may need some additional free disk space.'
          );
        }
      });
  };
  const ExportOptionComponent = formState.component;

  const theme = useTheme();
  return (
    <Dialog
      onCloseComplete={() => dispatch(setExportPopup('hidden'))}
      isShown={popupState != 'hidden'}
      title={`Export ${popupState == 'document' ? 'Document' : 'Selection'}`}
      containerProps={{ backgroundColor: theme.colors.overlayBackgroundColor }}
      footer={({ close }) => (
        <>
          <Button onClick={() => dispatch(setExportPopup('hidden'))}>abort</Button>
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
