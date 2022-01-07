import React, { ChangeEvent, MutableRefObject, useEffect, useState } from 'react';
import { Document } from '../../../core/document';
import { exportWebVTT } from '../../../core/webvtt';
import { Button, Checkbox, FormField, Group, majorScale, TextInput } from 'evergreen-ui';
import { useSelector } from 'react-redux';
import { RootState } from '../../../state';
import * as path from 'path';
import { SubtitleFormat } from '../../../util/WebVtt';

function switchExtension(pathName: string, extension: string) {
  const current_extension = path.extname(pathName);
  const dirname = path.dirname(pathName);
  let basename = path.basename(pathName, current_extension);
  if (path.extname(basename) != extension) {
    basename += extension;
  }
  return path.join(dirname, basename);
}

export function Subtitles({
  exportCallbackRef,
  outputPath,
  setOutputPath,
}: {
  exportCallbackRef: MutableRefObject<(document: Document, path: string) => Promise<void>>;
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
    useSelector((state: RootState) => state.editor.present?.displaySpeakerNames) || false;
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
