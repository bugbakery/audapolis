import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TitleBar } from './TitleBar';
import { AppContainer, CenterColumn } from './Util';
import { RootState } from '../state';
import styled from 'styled-components';
import { FaPause, FaPlay } from 'react-icons/fa';
import { MdPerson, MdSave } from 'react-icons/md';
import {
  computeTimed,
  documentIterator,
  filterItems,
  Paragraph,
  ParagraphGeneric,
  ParagraphItem,
  skipToTime,
  TimedParagraphItem,
} from '../core/document';
import {
  play,
  pause,
  setTime,
  toggleDisplaySpeakerNames,
  togglePlaying,
  saveDocument,
} from '../state/editor';
import { KeyboardEventHandler, useState } from 'react';
import quarterRest from '../res/quarter_rest.svg';

const MainContainer = styled(CenterColumn)`
  justify-content: start;
  overflow-y: auto;
`;
export function EditorPage(): JSX.Element {
  const dispatch = useDispatch();

  const handleKeyPress: KeyboardEventHandler = (e) => {
    console.log(e);
    if (e.key === ' ') {
      dispatch(togglePlaying());
    }
  };

  return (
    <AppContainer onKeyDown={handleKeyPress} tabIndex={-1}>
      <TitleBar>
        <SaveButton />
        <SpeakerNamesButton />
        <PlayerControls />
        <NoButton />
      </TitleBar>

      <MainContainer>
        <Document />
      </MainContainer>
    </AppContainer>
  );
}

const NoButton = styled.div`
  width: 30px;
  height: 30px;
`;
const SpeakerNamesButtonIcon = styled(MdPerson)`
  width: 30px;
  height: 30px;
  padding: 3px;
  -webkit-app-region: no-drag;
  border-radius: 10px;
  transition: all 0.2s;
`;
export function SpeakerNamesButton(): JSX.Element {
  const displaySpeakerNames =
    useSelector((state: RootState) => state.editor?.displaySpeakerNames) || false;
  const dispatch = useDispatch();

  return (
    <SpeakerNamesButtonIcon
      onClick={() => dispatch(toggleDisplaySpeakerNames())}
      style={{ boxShadow: displaySpeakerNames ? 'inset 0 0 3px var(--fg-color)' : 'none' }}
    />
  );
}

const SaveButtonIcon = styled(MdSave)`
  width: 30px;
  height: 30px;
  padding: 3px;
  -webkit-app-region: no-drag;
  border-radius: 10px;
  transition: all 0.2s;
`;
export function SaveButton(): JSX.Element {
  const dispatch = useDispatch();

  return <SaveButtonIcon onClick={() => dispatch(saveDocument())} />;
}

function itemDisplayPredicate(item: ParagraphItem): boolean {
  return !(item.type === 'silence' && item.end - item.start < 0.4);
}

const DocumentContainer = styled.div<{ displaySpeakerNames: boolean }>`
  position: relative;
  margin: 30px;
  line-height: 1.5;

  display: grid;
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
const DocumentTitle = styled.h1`
  text-align: left;
  font-weight: normal;
  font-size: 20px;
  grid-column-start: 2;
`;
function Document() {
  const contentRaw = useSelector((state: RootState) => state.editor?.document?.content);
  const displaySpeakerNames =
    useSelector((state: RootState) => state.editor?.displaySpeakerNames) || false;
  const content = computeTimed(contentRaw || ([] as Paragraph[]));

  const fileName = useSelector((state: RootState) => state.editor?.path) || '';
  const splitLast = (str: string, delim: string) => {
    const idx = str.lastIndexOf(delim);
    return [str.slice(0, idx), str.slice(idx + 1)];
  };
  const [_, last] = splitLast(fileName, '/');
  const [base, extension] = splitLast(last, '.');

  return (
    <DocumentContainer displaySpeakerNames={displaySpeakerNames}>
      <Cursor />

      <DocumentTitle>
        {base}
        <span style={{ fontWeight: 'lighter' }}>.{extension}</span>
      </DocumentTitle>

      {content.map((p, i) => (
        <Paragraph key={i} speaker={p.speaker} content={p.content} />
      ))}
    </DocumentContainer>
  );
}

const ParagraphContainer = styled.div``;
const SpeakerContainer = styled.div`
  overflow-wrap: break-word;
`;
function Silence(): JSX.Element {
  return (
    <img
      className={'word'}
      style={{ height: '1em', filter: 'var(--filter)' }}
      src={quarterRest}
      alt={'quarter rest'}
    />
  );
}
function Paragraph({ speaker, content }: ParagraphGeneric<TimedParagraphItem>): JSX.Element {
  const playing = useSelector((state: RootState) => state.editor?.playing) || false;
  const dispatch = useDispatch();

  return (
    <>
      <SpeakerContainer>{speaker}</SpeakerContainer>
      <ParagraphContainer>
        {content.filter(itemDisplayPredicate).flatMap((item, i) => {
          switch (item.type) {
            case 'word':
              return [
                <span
                  key={i * 2}
                  className={'word'}
                  onMouseDown={async () => {
                    await dispatch(pause());
                    await dispatch(setTime(item.absoluteStart + 0.01));
                    if (playing) {
                      dispatch(play());
                    }
                  }}
                >
                  {item.word}
                </span>,
                <React.Fragment key={i * 2 + 1}> </React.Fragment>,
              ];
            case 'silence':
              return [<Silence key={i * 2} />, <React.Fragment key={i * 2 + 1}> </React.Fragment>];
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
  const time = useSelector((state: RootState) => state.editor?.currentTime) || 0;
  const formatInt = (x: number) => {
    const str = Math.floor(x).toString();
    return (str.length == 1 ? '0' + str : str).substr(0, 2);
  };
  const playing = useSelector((state: RootState) => state.editor?.playing);
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
  transform: translate(calc(-50% - 2px), -6px);
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
  const [ref, setRef] = useState<HTMLDivElement | null>(null);
  const content = useSelector((state: RootState) => state.editor?.document?.content);
  const time = useSelector((state: RootState) => state.editor?.currentTime);
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
  const item = skipToTime(
    time,
    filterItems(itemDisplayPredicate, documentIterator(content)),
    true
  ).next().value || {
    end: 1,
    start: 0,
    globalIdx: 0,
    absoluteStart: time,
  };
  const itemElement = ref
    .getElementsByClassName('word')
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
