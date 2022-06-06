import React, { ChangeEvent, MutableRefObject, useEffect, useState } from 'react';
import { Document } from '../../../core/document';
import { exportWebVTT } from '../../../core/webvtt';
import { Button, Checkbox, FormField, Group, majorScale, TextInput } from 'evergreen-ui';
import { useSelector } from 'react-redux';
import { RootState } from '../../../state';
import { SubtitleFormat } from '@audapolis/webvtt-writer';
import { switchExtension } from '../../../util';
import { ExportType } from './index';
import { ProgressCallback } from '../../../core/ffmpeg';

export const exportDefinition: ExportType = {
  type: 'subtitles',
  defaultExtension: '.vtt',
  filters: [
    { name: 'WebVTT Files', extensions: ['vtt'] },
    { name: 'SRT Files', extensions: ['srt'] },
  ],
  component: Subtitles,
};

export function Subtitles({
  exportCallbackRef,
  outputPath,
  setOutputPath,
}: {
  exportCallbackRef: MutableRefObject<
    (document: Document, path: string, progressCallback: ProgressCallback) => Promise<void>
  >;
  outputPath: string;
  setOutputPath: (path: string) => void;
}): JSX.Element {
  exportCallbackRef.current = async (document, path) => {
    await exportWebVTT(
      document.content,
      path,
      format == 'vtt' && wordTimings,
      format == 'vtt' && includeSpeakerNames,
      limitLineLength ? lineLimit : null,
      format
    );
  };

  const displaySpeakerNames =
    useSelector(
      (state: RootState) => state.editor.present?.document.metadata.display_speaker_names
    ) || false;
  const [includeSpeakerNames, setIncludeSpeakerNames] = useState(displaySpeakerNames);
  const [wordTimings, setWordTimings] = useState(true);
  const [limitLineLength, setLimitLineLength] = useState(false);
  const [lineLimit, setLineLimit] = useState(60);
  const [format, setFormat] = useState('vtt' as SubtitleFormat);
  useEffect(() => {
    if (outputPath.endsWith('.srt')) {
      setFormat('srt');
    } else {
      setFormat('vtt');
    }
  }, [outputPath]);

  return (
    <>
      <FormField marginBottom={majorScale(3)} label="Format">
        <Group width={'100%'}>
          <Button
            flex={1}
            isActive={format == 'vtt'}
            onClick={() => {
              setFormat('vtt');
              setOutputPath(switchExtension(outputPath, '.vtt'));
            }}
          >
            WebVTT
          </Button>
          <Button
            flex={1}
            isActive={format == 'srt'}
            onClick={() => {
              setFormat('srt');
              setOutputPath(switchExtension(outputPath, '.srt'));
            }}
          >
            SRT
          </Button>
        </Group>
      </FormField>
      <Checkbox
        label="Include Speaker Names"
        checked={format == 'vtt' && includeSpeakerNames}
        onChange={(e) => setIncludeSpeakerNames(e.target.checked)}
        disabled={!(format == 'vtt')}
      />
      <Checkbox
        label="Include Word-Timings"
        checked={format == 'vtt' && wordTimings}
        onChange={(e) => setWordTimings(e.target.checked)}
        disabled={!(format == 'vtt')}
      />{' '}
      <Checkbox
        label="Limit line length"
        checked={limitLineLength}
        onChange={(e) => setLimitLineLength(e.target.checked)}
      />
      {limitLineLength ? (
        <FormField label="Line length limit (in characters)" marginBottom={majorScale(3)}>
          <TextInput
            width={'100%'}
            value={lineLimit}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setLineLimit(parseInt(e.target.value))}
            type={'number'}
          />
        </FormField>
      ) : (
        <></>
      )}
    </>
  );
}
