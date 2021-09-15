import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TitleBar, TitleBarButton, TitleBarGroup, TitleBarSection } from './TitleBar';
import { AppContainer, CenterColumn } from './Util';
import { RootState } from '../state';
import styled, { css } from 'styled-components';
import { FaPause, FaPlay } from 'react-icons/fa';
import { MdPerson, MdRedo, MdSave, MdUndo } from 'react-icons/md';
import {
  computeTimed,
  documentIterator,
  Paragraph,
  ParagraphGeneric,
  skipToTime,
  TimedParagraphItem,
} from '../core/document';
import {
  play,
  pause,
  setTime,
  toggleDisplaySpeakerNames,
  togglePlaying,
  insertParagraph,
  saveDocument,
  goRight,
  goLeft,
  deleteSomething,
  selectLeft,
  selectRight,
  unselect,
  mouseSelectionOver,
  mouseSelectionStart,
  mouseSelectionEnd,
} from '../state/editor';
import {
  HTMLAttributes,
  KeyboardEventHandler,
  MouseEventHandler,
  useEffect,
  useState,
} from 'react';
import quarterRest from '../res/quarter_rest.svg';
import { basename, extname } from 'path';
import { ActionCreators } from 'redux-undo';

const MainContainer = styled(CenterColumn)`
  justify-content: start;
  overflow-y: auto;
`;
export function EditorPage(): JSX.Element {
  return (
    <AppContainer>
      <EditorTitleBar />

      <MainContainer>
        <Document />
      </MainContainer>
    </AppContainer>
  );
}

function EditorTitleBar(): JSX.Element {
  const dispatch = useDispatch();
  const displaySpeakerNames =
    useSelector((state: RootState) => state.editor.present?.displaySpeakerNames) || false;
  const canUndo = useSelector((state: RootState) => state.editor.past.length > 0);
  const canRedo = useSelector((state: RootState) => state.editor.future.length > 0);
  const canSave = useSelector(
    (state: RootState) => state.editor.present?.document != state.editor.present?.lastSavedDocument
  );

  return (
    <TitleBar>
      <TitleBarSection>
        <TitleBarGroup>
          <TitleBarButton
            onClick={() => dispatch(ActionCreators.undo())}
            active={canUndo}
            icon={MdUndo}
          />
          <TitleBarButton
            onClick={() => dispatch(ActionCreators.redo())}
            active={canRedo}
            icon={MdRedo}
          />
        </TitleBarGroup>
        <TitleBarButton
          clicked={displaySpeakerNames}
          onClick={() => dispatch(toggleDisplaySpeakerNames())}
          icon={MdPerson}
        />
      </TitleBarSection>

      <PlayerControls />

      <TitleBarSection>
        <TitleBarButton onClick={() => dispatch(saveDocument())} active={canSave} icon={MdSave} />
      </TitleBarSection>
    </TitleBar>
  );
}

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
function Document() {
  const dispatch = useDispatch();
  const contentRaw = useSelector((state: RootState) => state.editor.present?.document?.content);
  const displaySpeakerNames =
    useSelector((state: RootState) => state.editor.present?.displaySpeakerNames) || false;
  const content = computeTimed(contentRaw || ([] as Paragraph[]));

  const handleKeyPress: KeyboardEventHandler = (e) => {
    if (e.key === ' ') {
      dispatch(togglePlaying());
      e.preventDefault();
    } else if (e.key === 'Enter') {
      dispatch(insertParagraph());
    } else if (e.key === 'Backspace') {
      dispatch(deleteSomething());
    } else if (e.key === 'ArrowRight') {
      if (e.shiftKey) dispatch(selectRight());
      else dispatch(goRight());
    } else if (e.key === 'ArrowLeft') {
      if (e.shiftKey) dispatch(selectLeft());
      else dispatch(goLeft());
    } else if (e.key === 'z' && e.ctrlKey) {
      dispatch(ActionCreators.undo());
    } else if (e.key === 'Z' && e.ctrlKey) {
      dispatch(ActionCreators.redo());
    } else if (e.key === 'y' && e.ctrlKey) {
      dispatch(ActionCreators.redo());
    } else if (e.key === 's' && e.ctrlKey) {
      dispatch(saveDocument());
    } else if (e.key === 'Escape') {
      dispatch(unselect());
    }
  };

  const fileName = useSelector((state: RootState) => state.editor.present?.path) || '';

  return (
    <DocumentContainer
      displaySpeakerNames={displaySpeakerNames}
      tabIndex={0}
      onKeyDown={handleKeyPress}
      ref={(ref) => ref?.focus()}
    >
      <Cursor />
      <FileNameDisplay path={fileName} />

      {content.map((p, i) => (
        <Paragraph key={i} speaker={p.speaker} content={p.content} />
      ))}
    </DocumentContainer>
  );
}

const DocumentTitle = styled.h1`
  text-align: left;
  font-weight: normal;
  font-size: 20px;
  grid-column-start: 2;
`;
function FileNameDisplay({ path }: { path: string }) {
  const extension = extname(path);
  const base = basename(path, extension);

  return (
    <DocumentTitle>
      {base}
      <span style={{ fontWeight: 'lighter' }}>{extension}</span>
    </DocumentTitle>
  );
}

const ParagraphContainer = styled.div`
  user-select: none;
`;
const SpeakerContainer = styled.div`
  text-overflow: ellipsis;
  white-space: nowrap;
`;
const LongSilenceSpan = styled.span<{ selected: boolean }>`
  padding: 0 8px;
  color: transparent;
  background: center / auto 80% no-repeat url(${quarterRest});
  ${(props) =>
    props.selected
      ? css`
          background-color: lightblue;
        `
      : css`
          filter: var(--filter);
        `}
`;
function LongSilence(props: { selected: boolean } & HTMLAttributes<HTMLSpanElement>): JSX.Element {
  return (
    <LongSilenceSpan className={'item'} {...props}>
      {' '}
    </LongSilenceSpan>
  );
}
function ShortSilence(props: { selected: boolean } & HTMLAttributes<HTMLSpanElement>): JSX.Element {
  return (
    <span
      className={'item'}
      style={props.selected ? { backgroundColor: 'lightblue' } : {}}
      {...props}
    >
      {' '}
    </span>
  );
}
const Word = styled.span<{ selected: boolean }>`
  ${(props) =>
    props.selected &&
    css`
      background-color: lightblue;
      color: black;
    `}
`;
function Paragraph({ speaker, content }: ParagraphGeneric<TimedParagraphItem>): JSX.Element {
  const playing = useSelector((state: RootState) => state.editor.present?.playing) || false;
  const selection = useSelector((state: RootState) => state.editor.present?.selection);
  const dispatch = useDispatch();
  const isSelected = (item: TimedParagraphItem) => {
    if (!selection) {
      return false;
    } else {
      return (
        item.absoluteStart >= selection.start &&
        item.absoluteStart + (item.end - item.start) <= selection.start + selection.length
      );
    }
  };

  return (
    <>
      <SpeakerContainer>{speaker}</SpeakerContainer>
      <ParagraphContainer>
        {content.map((item, i) => {
          const onClick = async () => {
            await dispatch(pause());
            await dispatch(setTime(item.absoluteStart));
            if (playing) {
              dispatch(play());
            }
          };
          const onMouseDown: MouseEventHandler = (e) => {
            dispatch(mouseSelectionStart(item));
            const listener = () => {
              dispatch(mouseSelectionEnd());
              e.target.removeEventListener('click', listener);
              document.removeEventListener('click', listener);
            };
            e.target.addEventListener('click', listener, { once: true });
            document.addEventListener('click', listener, { once: true });
          };
          const onMouseMove: MouseEventHandler = () => {
            dispatch(mouseSelectionOver(item));
          };
          const commonProps = {
            onClick,
            onMouseDown,
            onMouseMove,
            selected: isSelected(item),
            className: 'item',
            key: i,
          };
          switch (item.type) {
            case 'word':
              return <Word {...commonProps}>{' ' + item.word}</Word>;
            case 'silence':
              if (item.end - item.start > 0.4) {
                return <LongSilence {...commonProps} selected={isSelected(item)} />;
              } else {
                return <ShortSilence key={i} onClick={onClick} selected={isSelected(item)} />;
              }
          }
        })}
      </ParagraphContainer>
    </>
  );
}

const PlayerControlsContainer = styled.div`
  background-color: var(--bg-color);
  box-shadow: inset 0 0 3px var(--fg-color-mild);
  border-radius: 20px;
  height: 30px;
  width: 200px;
  font-size: 18px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  -webkit-app-region: no-drag;

  & > div {
    padding-right: 30px;
  }

  & > svg {
    height: 75%;
    width: auto;
    padding: 3px;
  }
`;
function PlayerControls(props: React.HTMLAttributes<HTMLDivElement>) {
  const time = useSelector((state: RootState) => state.editor.present?.currentTime) || 0;
  const formatInt = (x: number) => {
    const str = Math.floor(x).toString();
    return (str.length == 1 ? '0' + str : str).substr(0, 2);
  };
  const playing = useSelector((state: RootState) => state.editor.present?.playing);
  const dispatch = useDispatch();

  return (
    <PlayerControlsContainer {...props}>
      <div>
        {formatInt(time / 60)}:{formatInt(time % 60)}:{formatInt((time * 100) % 100)}
      </div>
      <FaPlay
        color={playing ? 'var(--accent)' : 'var(--fg-color)'}
        onClick={() => dispatch(play())}
      />
      <FaPause
        color={playing ? 'var(--fg-color)' : 'var(--accent)'}
        onClick={() => dispatch(pause())}
      />
    </PlayerControlsContainer>
  );
}

const CursorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: stretch;
  height: calc(1em + 8px);
  position: absolute;
  transform: translate(-3px, -6px);
`;
const CursorPoint = styled.div`
  width: 8px;
  height: 8px;
  margin-bottom: -2px;
  border-radius: 100%;
  background-color: var(--accent);
  transition: all 0.1s;
`;
const CursorNeedle = styled.div`
  width: 2px;
  height: 100%;
  background-color: var(--accent);
`;
function Cursor(): JSX.Element {
  // we do this to re-render the cursor when the window resizes
  const [_, setWindowSize] = useState(null as null | { height: number; width: number });
  useEffect(() => {
    window.addEventListener('resize', () =>
      setWindowSize({ height: window.innerHeight, width: window.innerWidth })
    );
  }, []);

  const [ref, setRef] = useState<HTMLDivElement | null>(null);
  const content = useSelector((state: RootState) => state.editor.present?.document?.content);
  const time = useSelector((state: RootState) => state.editor.present?.currentTime);
  let left = -100;
  let top = -100;
  if (ref?.parentElement && content != null && time != null) {
    const { x, y } = computeCursorPosition(content, ref.parentElement as HTMLDivElement, time);
    left = x;
    top = y;
  }

  return (
    <CursorContainer
      style={{ left, top }}
      ref={(newRef) => {
        if (ref != newRef) {
          setRef(newRef);
        }
      }}
    >
      <CursorPoint />
      <CursorNeedle />
    </CursorContainer>
  );
}

function computeCursorPosition(
  content: Paragraph[],
  ref: HTMLDivElement,
  time: number
): { x: number; y: number } {
  const item = skipToTime(time, documentIterator(content), true).next().value || {
    end: 1,
    start: 0,
    globalIdx: 0,
    absoluteStart: time,
  };
  const itemElement = ref
    .getElementsByClassName('item')
    .item(item.globalIdx) as HTMLDivElement | null;

  if (!itemElement) {
    return { x: -100, y: -100 };
  }

  const y = itemElement.offsetTop;
  let x = itemElement.offsetLeft;
  if (item.absoluteStart <= time) {
    const itemLength = item.end - item.start;
    const timeInWord = time - item.absoluteStart;
    x += (timeInWord / itemLength) * itemElement.offsetWidth;
  }
  return { x, y };
}
