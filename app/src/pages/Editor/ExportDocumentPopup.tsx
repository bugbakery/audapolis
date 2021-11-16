import React, { useState } from 'react';
import { RootState } from '../../state';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { setExportPopup } from '../../state/editor';
import { Button, Popup, Select } from '../../components/Controls';
import { Form, MainCenterColumn } from '../../components/Util';
import path from 'path';
import styled from 'styled-components';
import { FilePickerWithText } from '../../components/FilePicker';
import { FileFilter } from 'electron';
import { player } from '../../core/player';
import { toast } from 'react-hot-toast';
import { exportAudio, exportVideo } from '../../core/ffmpeg';
import { DocumentGenerator } from '../../core/document';
import { assertSome } from '../../util';
import { exportOtio } from '../../core/otio';

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

const NumberInput = styled.input.attrs({ type: 'number' })`
  width: 75px;
`;

const ExportForm = styled(Form)`
  & > :nth-child(2n - 1) {
    opacity: 0.5;
  }

  & > :nth-child(2n) {
    width: 300px;
    display: flex;
  }

  & > :nth-child(2n) > * {
    flex-grow: 1;
  }
`;

export function ExportDocumentPopup(): JSX.Element {
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

  return (
    <Popup onClose={() => dispatch(setExportPopup(false))} open={true}>
      <MainCenterColumn>
        <h1>Export document</h1>
        <ExportForm>
          <span>Output Format</span>
          <Select
            options={exportValues}
            name={'type'}
            value={formState}
            onChange={(x) => setFormState(x)}
          />

          <span>Export Path</span>
          <FilePickerWithText
            value={formState.path}
            onChange={(path) => setFormState((state) => ({ ...state, path }))}
            save={true}
            filters={formState.filters}
          />

          {formState.type == 'video' ? (
            <>
              <span>Resolution</span>
              <span>
                <NumberInput
                  value={formState.width}
                  onChange={(e) =>
                    setFormState((last) => ({ ...last, width: parseInt(e.target.value) }))
                  }
                />
                x
                <NumberInput
                  value={formState.height}
                  onChange={(e) =>
                    setFormState((last) => ({ ...last, height: parseInt(e.target.value) }))
                  }
                />
              </span>
            </>
          ) : (
            <></>
          )}

          {formState.type == 'OpenTimelineIO' ? (
            <>
              <span>Output Format</span>
              <Select
                options={otioFormats}
                name={'name'}
                value={otioFormat}
                onChange={(x) => setOtioFormat(x)}
              />
            </>
          ) : (
            <></>
          )}
        </ExportForm>

        <Button
          primary
          onClick={() => {
            const action = async () => {
              dispatch(setExportPopup(false));

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
        <Button onClick={() => dispatch(setExportPopup(false))}>abort</Button>
      </MainCenterColumn>
    </Popup>
  );
}
