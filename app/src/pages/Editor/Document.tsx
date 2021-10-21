import { useSelector } from 'react-redux';
import { RootState } from '../../state';
import { computeTimed, Paragraph as ParagraphType } from '../../core/document';
import * as React from 'react';
import { useRef } from 'react';
import { Cursor } from './Cursor';
import { Paragraph } from './Paragraph';
import { basename, extname } from 'path';
import { Title } from '../../components/Util';
import styled, { useTheme } from 'styled-components';
import { SelectionMenu } from './SelectionMenu';

const DocumentContainer = styled.div<{ displaySpeakerNames: boolean }>`
  position: relative;
  padding: 30px;
  width: 100%;
  line-height: 1.5;

  display: grid;
  row-gap: 1em;
  column-gap: 1em;
  transition: all 1s;
  grid-template-columns: ${(props) => (props.displaySpeakerNames ? '100' : '0')}px min(
      800px,
      calc(100% - ${(props) => (props.displaySpeakerNames ? '100' : '0')}px)
    );
  justify-content: center;

  & > * {
    overflow-x: hidden;
  }
`;

export function Document(): JSX.Element {
  const contentRaw = useSelector((state: RootState) => state.editor.present?.document?.content);
  const displaySpeakerNames =
    useSelector((state: RootState) => state.editor.present?.displaySpeakerNames) || false;
  const theme = useTheme();

  const content = computeTimed(contentRaw || ([] as ParagraphType[]));

  const fileName = useSelector((state: RootState) => state.editor.present?.path) || '';
  const speakerIndices = Object.fromEntries(
    Array.from(new Set(content.map((p) => p.speaker))).map((name, i) => [name, i])
  );
  const ref = useRef<HTMLDivElement>(null);

  return (
    <DocumentContainer displaySpeakerNames={displaySpeakerNames} ref={ref}>
      <Cursor />
      <SelectionMenu documentRef={ref} />
      <FileNameDisplay path={fileName} />

      {content.length > 0 ? (
        content.map((p, i) => {
          const speakerColor = theme.speakers[speakerIndices[p.speaker]];
          return (
            <Paragraph
              key={i}
              speaker={p.speaker}
              content={p.content}
              paragraphIdx={i}
              color={displaySpeakerNames ? speakerColor : theme.fg}
            />
          );
        })
      ) : (
        <Paragraph
          key={0}
          speaker=""
          content={[{ type: 'artificial_silence', absoluteStart: 0, length: 0 }]}
          paragraphIdx={0}
          color={theme.fg}
        />
      )}
    </DocumentContainer>
  );
}

function FileNameDisplay({ path }: { path: string }) {
  const extension = extname(path);
  const base = basename(path, extension);

  return (
    <Title>
      {base}
      <span style={{ fontWeight: 'lighter' }}>{extension}</span>
    </Title>
  );
}
