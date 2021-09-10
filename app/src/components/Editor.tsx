import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TitleBar } from './TitleBar';
import { AppContainer, CenterColumn } from './Util';
import { RootState } from '../state';
import styled from 'styled-components';
import { FaPause, FaPlay } from 'react-icons/fa';
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
import { useState } from 'react';
import quarterRest from '../res/quarter_rest.svg';
import { pause, play, setTime } from '../state/editor';

const MainContainer = styled(CenterColumn)`
  justify-content: start;
  overflow-y: auto;
`;
export function EditorPage(): JSX.Element {
  return (
    <AppContainer>
      <TitleBar />
      <MainContainer>
        <Document />
      </MainContainer>
      <PlayerControls />
    </AppContainer>
  );
}

function itemDisplayPredicate(item: ParagraphItem): boolean {
  return !(item.type === 'silence' && item.end - item.start < 0.4);
}

const DocumentContainer = styled.div`
  position: relative;
  max-width: 800px;
  margin: 30px;
  line-height: 1.5;
`;
function Document() {
  const contentRaw = useSelector((state: RootState) => state.editor?.document?.content);
  const content = computeTimed(contentRaw || ([] as Paragraph[]));

  return (
    <DocumentContainer>
      <Cursor />
      {content.map((p, i) => (
        <Paragraph key={i} speaker={p.speaker} content={p.content} />
      ))}
    </DocumentContainer>
  );
}

const ParagraphContainer = styled.div``;
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
function Paragraph({ content }: ParagraphGeneric<TimedParagraphItem>): JSX.Element {
  const playing = useSelector((state: RootState) => state.editor?.playing) || false;
  const dispatch = useDispatch();

  return (
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
  );
}

const PlayerControlsContainer = styled.div`
  border: 1px solid var(--fg-color);
  background-color: var(--bg-color);
  box-shadow: 0 0 30px var(--bg-color);
  border-radius: 20px;
  height: 30px;
  width: 160px;
  font-size: 18px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;

  position: absolute;
  bottom: 0;
  right: 0;
  margin: 20px;

  & > div {
    padding-right: 15px;
  }

  & > svg {
    height: 80%;
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
      <FaPlay color={playing ? 'red' : 'var(--fg-color)'} onClick={() => dispatch(play())} />
      <FaPause color={playing ? 'var(--fg-color)' : 'red'} onClick={() => dispatch(pause())} />
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
  background-color: red;
  transition: all 0.1s;
`;
const CursorNeedle = styled.div`
  width: 2px;
  height: 100%;
  background-color: red;
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
