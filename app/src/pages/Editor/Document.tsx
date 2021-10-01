import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../state';
import {
  computeTimed,
  DocumentGenerator,
  Paragraph as ParagraphType,
  ParagraphGeneric,
  TimedParagraphItem,
} from '../../core/document';
import * as React from 'react';
import { KeyboardEventHandler, useRef } from 'react';
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
  exportSelection,
} from '../../state/editor';
import { ActionCreators } from 'redux-undo';
import { Cursor } from './Cursor';
import { Paragraph } from './Paragraph';
import { basename, extname } from 'path';
import { Title } from '../../components/Util';
import styled, { useTheme } from 'styled-components';
import { SmallButton } from '../../components/Controls';

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

function SelectionMenu({
  show,
  anchorPoint,
}: {
  show: boolean;
  anchorPoint: { top: number; left: number };
}): JSX.Element {
  const dispatch = useDispatch();
  return (
    <SmallButton
      style={{
        top: `calc(${anchorPoint.top}px - 2.5em)`,
        left: anchorPoint.left,
        position: 'fixed',
        display: show ? 'block' : 'hidden',
        transform: 'translateX(-50%)',
      }}
      onClick={() => dispatch(exportSelection())}
      primary
    >
      Export
    </SmallButton>
  );
}

function computeWordBbox(
  content: ParagraphGeneric<TimedParagraphItem>[],
  ref: HTMLDivElement,
  start: number,
  length: number
): { top: number; bottom: number; left: number; right: number } {
  const itemElements = ref.getElementsByClassName('item');
  const items = new DocumentGenerator(DocumentGenerator.fromParagraphs(content).enumerate())
    .enumerate()
    .filter((item) => item.absoluteStart >= start && item.absoluteStart < start + length)
    .filterMap((item) => itemElements.item(item.globalIdx) || undefined)
    .collect();
  const bboxes = items.map((item) => item.getBoundingClientRect());
  const { left, right, top, bottom } = bboxes.reduce(
    (
      val: { top: number | null; bottom: number | null; left: number | null; right: number | null },
      current
    ) => {
      if (val.bottom == null || val.bottom < current.bottom) {
        val.bottom = current.bottom;
      }
      if (val.right == null || val.right < current.right) {
        val.right = current.right;
      }
      if (val.top == null || val.top > current.top) {
        val.top = current.top;
      }
      if (val.left == null || val.left > current.left) {
        val.left = current.left;
      }
      return val;
    },
    { left: null, right: null, top: null, bottom: null }
  );
  if (left == null || right == null || top == null || bottom == null) {
    throw new Error('bbox is null');
  } else {
    return { left, right, top, bottom };
  }
}

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
  const selection = useSelector((state: RootState) => state.editor.present?.selection);
  const ref = useRef<HTMLDivElement>(null);
  let anchorLeft = -100;
  let anchorTop = -100;

  if (selection) {
    if (ref.current?.parentElement) {
      const { left, right, top } = computeWordBbox(
        content,
        ref.current?.parentElement as HTMLDivElement,
        selection.start,
        selection.length
      );
      anchorLeft = (left + right) / 2;
      anchorTop = top;
    }
  }

  return (
    <DocumentContainer
      displaySpeakerNames={displaySpeakerNames}
      tabIndex={0}
      onKeyDown={handleKeyPress}
      ref={ref}
    >
      <Cursor />
      <SelectionMenu show={anchorLeft > 0} anchorPoint={{ left: anchorLeft, top: anchorTop }} />
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
