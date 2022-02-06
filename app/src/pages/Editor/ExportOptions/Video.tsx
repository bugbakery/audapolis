import {
  Button,
  Checkbox,
  CrossIcon,
  FormField,
  Group,
  IconButton,
  majorScale,
  TextInput,
  Tooltip,
} from 'evergreen-ui';
import React, { ChangeEvent, MutableRefObject, useState } from 'react';
import { player } from '../../../core/player';
import { Document } from '../../../core/document';
import {
  exportVideo,
  isSeperateSubtitleTrackSupported,
  ProgressCallback,
} from '../../../core/ffmpeg';
import { contentToVtt } from '../../../core/webvtt';
import { ExportType } from './index';
import { documentRenderItems } from '../../../state/editor/selectors';

export const exportDefinition: ExportType = {
  type: 'video',
  defaultExtension: '.mp4',
  filters: [{ name: 'Video Files', extensions: ['mp4', 'mkv', 'gif'] }],
  component: Video,
};

export function Video({
  exportCallbackRef,
  outputPath,
}: {
  exportCallbackRef: MutableRefObject<
    (document: Document, path: string, progressCallback: ProgressCallback) => Promise<void>
  >;
  outputPath: string;
}): JSX.Element {
  const targetResolution = player.getTargetResolution();
  const [height, setHeight] = useState(targetResolution.y);
  const [width, setWidth] = useState(targetResolution.x);
  const [subtitleType, setSubtitleType] = useState('off');
  const [limitLineLength, setLimitLineLength] = useState(false);
  const [lineLimit, setLineLimit] = useState(60);
  exportCallbackRef.current = async (document, path, progressCallback) => {
    const ris = documentRenderItems(document.content);
    const sources = document.sources;
    const vtt = contentToVtt(document.content, false, false, limitLineLength ? lineLimit : null);
    await exportVideo(
      ris,
      sources,
      path,
      {
        x: width,
        y: height,
      },
      subtitleType == 'burn_in' || subtitleType == 'seperate_track'
        ? { type: subtitleType, vtt: vtt }
        : null,
      progressCallback
    );
  };

  return (
    <>
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
      <FormField marginBottom={majorScale(3)} label="Add Text as Subtitles">
        <Group width={'100%'}>
          <Button flex={1} isActive={subtitleType == 'off'} onClick={() => setSubtitleType('off')}>
            Off
          </Button>
          <Button
            flex={1}
            isActive={subtitleType == 'burn_in'}
            onClick={() => setSubtitleType('burn_in')}
          >
            Burn-In
          </Button>
          <Tooltip content={'Adds a subtitle track (only supported for mp4 and mkv)'}>
            <Button
              flex={1}
              disabled={!isSeperateSubtitleTrackSupported(outputPath)}
              isActive={subtitleType == 'seperate_track'}
              onClick={() => setSubtitleType('seperate_track')}
            >
              On Seperate Track
            </Button>
          </Tooltip>
        </Group>
        {subtitleType != 'off' ? (
          <>
            <Checkbox
              label="Limit Subtitle Line Length"
              checked={limitLineLength}
              onChange={(e) => setLimitLineLength(e.target.checked)}
            />
            {limitLineLength ? (
              <FormField
                label="Subtitle Line Length Limit (in Characters)"
                marginBottom={majorScale(3)}
              >
                <TextInput
                  width={'100%'}
                  value={lineLimit}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setLineLimit(parseInt(e.target.value))
                  }
                  type={'number'}
                />
              </FormField>
            ) : (
              <></>
            )}
          </>
        ) : (
          <></>
        )}
      </FormField>
    </>
  );
}
