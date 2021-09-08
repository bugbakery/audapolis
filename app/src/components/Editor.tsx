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
  Paragraph,
  ParagraphGeneric,
  skipToTime,
  TimedParagraphItem,
} from '../core/document';
import { play, pause, setTime } from '../state/editor';
import { RefObject, useRef } from 'react';

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

const DocumentContainer = styled.div``;
const DocumentOuterContainer = styled.div`
  position: relative;
  max-width: 800px;
  margin: 30px;
  line-height: 1.5;
`;
function Document() {
  const contentRaw = useSelector((state: RootState) => state.editor?.document?.content);
  const content = computeTimed(contentRaw || ([] as Paragraph[]));
  const ref = useRef(null);

  return (
    <DocumentOuterContainer>
      <Cursor documentContainerRef={ref} />
      <DocumentContainer ref={ref}>
        {content.map((p, i) => (
          <Paragraph key={i} speaker={p.speaker} content={p.content} />
        ))}
      </DocumentContainer>
    </DocumentOuterContainer>
  );
}

const Word = styled.span`
  transition: background-color 0.3s;
`;
const ParagraphContainer = styled.div``;
function Paragraph({ content }: ParagraphGeneric<TimedParagraphItem>): JSX.Element {
  const dispatch = useDispatch();

  return (
    <ParagraphContainer>
      {content.flatMap((item, i) => {
        switch (item.type) {
          case 'word':
            return [
              <Word key={i * 2} onMouseDown={() => dispatch(setTime(item.absoluteStart))}>
                {item.word}
              </Word>,
              <span key={i * 2 + 1}> </span>,
            ];
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
  const time = useSelector((state: RootState) => state.editor.currentTime);
  const formatInt = (x: number) => {
    const str = Math.floor(x).toString();
    return (str.length == 1 ? '0' + str : str).substr(0, 2);
  };
  const playing = useSelector((state: RootState) => state.editor.playing);
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
function Cursor({
  documentContainerRef,
}: {
  documentContainerRef: RefObject<HTMLDivElement>;
}): JSX.Element {
  const content = useSelector((state: RootState) => state.editor?.document?.content) || [];
  const time = useSelector((state: RootState) => state.editor?.currentTime) || 0;
  const { x, y } = computeCursorPosition(content, documentContainerRef, time);

  return (
    <CursorContainer style={{ left: x, top: y }}>
      <CursorPoint />
      <CursorNeedle />
    </CursorContainer>
  );
}

function computeCursorPosition(
  content: Paragraph[],
  ref: RefObject<HTMLDivElement>,
  time: number
): { x: number; y: number } {
  const item = skipToTime(time, documentIterator(content)).next().value;
  if (!item) {
    return { x: 0, y: 0 };
  }

  const itemElement = ref.current?.children
    .item(item.paragraphIdx)
    ?.children.item(item.itemIdx * 2) as HTMLDivElement;
  if (!itemElement) {
    return { x: 0, y: 0 };
  }

  const y = itemElement.offsetTop;
  const itemLength = item.end - item.start;
  const timeInWord = time - item.absoluteStart;
  const x = itemElement.offsetLeft + (timeInWord / itemLength) * itemElement.offsetWidth;
  return { x, y };
}
