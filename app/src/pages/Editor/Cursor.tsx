import styled from 'styled-components';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../state';
import { DocumentGenerator, getItemsAtTime, Paragraph } from '../../core/document';

const CursorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: stretch;
  height: calc(1em + 8px);
  position: absolute;
  transform: translate(calc(-50% + 1px), -6px);
  user-select: none;
  pointer-events: none;
`;
const CursorPoint = styled.div`
  width: 8px;
  height: 8px;
  margin-bottom: -2px;
  border-radius: 100%;
  background-color: ${({ theme }) => theme.playAccent};
  transition: all 0.1s;
`;
const CursorNeedle = styled.div`
  width: 2px;
  height: 100%;
  background-color: ${({ theme }) => theme.playAccent};
`;

export function Cursor(): JSX.Element {
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
  const items = getItemsAtTime(DocumentGenerator.fromParagraphs(content).enumerate(), time);
  const item = items[items.length - 1] || {
    globalIdx: 0,
    absoluteStart: time,
    length: 1,
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
    const timeInWord = time - item.absoluteStart;
    x += (timeInWord / item.length) * itemElement.offsetWidth;
  }
  return { x, y };
}
