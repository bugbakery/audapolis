import React, { ChangeEvent, useState } from 'react';
import { RootState } from '../../state';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { setExportPopup } from '../../state/editor';
import path from 'path';
import { FilePickerWithText } from '../../components/FilePicker';
import { FileFilter } from 'electron';
import { player } from '../../core/player';
import { toast } from 'react-hot-toast';
import { exportAudio, exportVideo } from '../../core/ffmpeg';
import { DocumentGenerator } from '../../core/document';
import { assertSome } from '../../util';
import { exportOtio } from '../../core/otio';
import {
  Button,
  Combobox,
  CrossIcon,
  Dialog,
  FormField,
  Group,
  IconButton,
  majorScale,
  TextInput,
} from 'evergreen-ui';

interface audioExport {
  type: 'audio';
  path: string;
}
interface videoExport {
  type: 'video';
  path: string;
  width: number;
  height: number;
}
interface finalcutExport {
  type: 'OpenTimelineIO';
  path: string;
}
type ExportType = audioExport | videoExport | finalcutExport;

export function ExportDocumentDialog(): JSX.Element {
  const dispatch = useDispatch();
  const store = useStore();
  const documentPath = useSelector((state: RootState) => state.editor.present?.path || '');
  const documentBaseName = path.basename(documentPath, '.audapolis');
  const documentBasePath = path.join(path.dirname(documentPath), documentBaseName);
  const targetResolution = player.getTargetResolution();
  const exportValues: (ExportType & { filters: FileFilter[] })[] = [
    {
      type: 'audio',
      path: documentBasePath + '.mp3',
      filters: [{ name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'wma', 'aac'] }],
    },
    {
      type: 'video',
      path: documentBasePath + '.mp4',
      width: targetResolution.x,
      height: targetResolution.y,
      filters: [{ name: 'Video Files', extensions: ['mp4', 'mkv', 'gif'] }],
    },
    {
      type: 'OpenTimelineIO',
      path: documentBasePath + '_proj',
      filters: [],
    },
  ];

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

  const [formState, setFormState] = useState(exportValues[0]);
  const [otioFormat, setOtioFormat] = useState(otioFormats[0]);

  const popupState = useSelector((state: RootState) => state.editor.present?.exportPopup);

  return (
    <Dialog
      onCloseComplete={() => dispatch(setExportPopup(false))}
      isShown={popupState}
      title={'Export document'}
      footer={({ close }) => (
        <>
          <Button onClick={() => dispatch(setExportPopup(false))}>abort</Button>
          <Button
            marginLeft={majorScale(1)}
            appearance={'primary'}
            onClick={() => {
              const action = async () => {
                close();

                const state: RootState = store.getState();
                assertSome(state.editor.present);

                const renderItems = DocumentGenerator.fromParagraphs(
                  state.editor.present.document.content
                )
                  .toRenderItems()
                  .collect();
                const sources = state.editor.present.document.sources;

                if (formState.type == 'audio') {
                  await exportAudio(renderItems, sources, formState.path);
                } else if (formState.type == 'video') {
                  await exportVideo(renderItems, sources, formState.path, {
                    x: formState.width,
                    y: formState.height,
                  });
                }
                if (formState.type == 'OpenTimelineIO') {
                  const server = state.server.servers[state.server.selectedServer];
                  await exportOtio(
                    documentBaseName,
                    otioFormat.extension,
                    otioFormat.adapter,
                    renderItems,
                    sources,
                    formState.path,
                    server
                  );
                } else {
                  throw Error('dont know how to export that :(');
                }
              };

              toast
                .promise(action(), {
                  loading: 'Exporting...',
                  success: <b>Export successful!</b>,
                  error: <b>Export failed.</b>,
                })
                .catch((e) => console.log(e));
            }}
          >
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

      {formState.type == 'video' ? (
        <FormField label="Resolution" marginBottom={majorScale(3)}>
          {/*<div style={{ display: 'flex', flexDirection: 'row' }}>*/}
          <Group width={'100%'}>
            <TextInput
              value={formState.width}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setFormState((last) => ({ ...last, width: parseInt(e.target.value) }))
              }
              flex={1}
              type={'number'}
            />
            <IconButton icon={CrossIcon} appearance={'minimal'} disabled={true}></IconButton>
            <TextInput
              value={formState.height}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setFormState((last) => ({ ...last, height: parseInt(e.target.value) }))
              }
              flex={1}
              type={'number'}
            />
          </Group>
          {/*</div>*/}
        </FormField>
      ) : (
        <></>
      )}

      {formState.type == 'OpenTimelineIO' ? (
        <>
          <FormField label="Output Format" marginBottom={majorScale(3)}>
            <Combobox
              width={'100%'}
              initialSelectedItem={otioFormat}
              items={otioFormats}
              itemToString={(x) => x.name}
              onChange={(selected) => setOtioFormat(selected)}
            />
          </FormField>
        </>
      ) : (
        <></>
      )}
    </Dialog>
  );
}
