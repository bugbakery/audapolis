import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../state';
import { computeTimed, Paragraph as ParagraphType } from '../../core/document';
import * as React from 'react';
import { KeyboardEventHandler } from 'react';
import {
  deleteSomething,
  goLeft,
  goRight,
  insertParagraphBreak,
  selectLeft,
  selectRight,
  unselect,
  saveDocument,
  togglePlaying,
  copy,
  paste,
} from '../../state/editor';
import { ActionCreators } from 'redux-undo';
import { Cursor } from './Cursor';
import { Paragraph } from './Paragraph';
import { basename, extname } from 'path';
import { Title } from '../../components/Util';
import styled, { useTheme } from 'styled-components';

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

  &:focus {
    outline: none;
  }
`;

export function Document(): JSX.Element {
  const dispatch = useDispatch();
  const contentRaw = useSelector((state: RootState) => state.editor.present?.document?.content);
  const displaySpeakerNames =
    useSelector((state: RootState) => state.editor.present?.displaySpeakerNames) || false;
  const theme = useTheme();

  const content = computeTimed(contentRaw || ([] as ParagraphType[]));

  const handleKeyPress: KeyboardEventHandler = (e) => {
    const ctrlOrCmdKey = e.ctrlKey || e.metaKey;
    if (e.key === ' ') {
      dispatch(togglePlaying());
      e.preventDefault();
    } else if (e.key === 'Enter') {
      dispatch(insertParagraphBreak());
    } else if (e.key === 'Backspace') {
      dispatch(deleteSomething());
    } else if (e.key === 'ArrowRight') {
      if (e.shiftKey) dispatch(selectRight());
      else dispatch(goRight());
    } else if (e.key === 'ArrowLeft') {
      if (e.shiftKey) dispatch(selectLeft());
      else dispatch(goLeft());
    } else if (e.key === 'z' && ctrlOrCmdKey) {
      dispatch(ActionCreators.undo());
    } else if (e.key === 'Z' && ctrlOrCmdKey) {
      dispatch(ActionCreators.redo());
    } else if (e.key === 'y' && ctrlOrCmdKey) {
      dispatch(ActionCreators.redo());
    } else if (e.key === 's' && ctrlOrCmdKey) {
      dispatch(saveDocument(e.shiftKey));
    } else if (e.key === 'Escape') {
      dispatch(unselect());
    } else if (e.key === 'c' && ctrlOrCmdKey) {
      console.log('copying');
      dispatch(copy());
      e.preventDefault();
    } else if (e.key === 'v' && ctrlOrCmdKey) {
      console.log('pasting');
      dispatch(paste());
      e.preventDefault();
    }
  };

  const fileName = useSelector((state: RootState) => state.editor.present?.path) || '';
  const speakerIndices = Object.fromEntries(
    Array.from(new Set(content.map((p) => p.speaker))).map((name, i) => [name, i])
  );

  return (
    <DocumentContainer
      displaySpeakerNames={displaySpeakerNames}
      tabIndex={0}
      onKeyDown={handleKeyPress}
      ref={(ref) => ref?.focus()}
    >
      <Cursor />
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
