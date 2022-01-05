import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../state';
import { DocumentGenerator, getItemsAtTime, Paragraph } from '../../core/document';
import { Pane, useTheme } from 'evergreen-ui';

export function Cursor(): JSX.Element {
  const theme = useTheme();

  const ref = useRef(null as null | HTMLDivElement);

  // we do this to re-render the cursor when the parent container size changes
  const [_, setWindowSize] = useState(null as null | { height: number; width: number });
  useEffect(() => {
    if (!ref.current?.parentElement) return;

    const observer = new ResizeObserver(() => {
      setWindowSize({ height: window.innerHeight, width: window.innerWidth });
    });
    observer.observe(ref.current.parentElement);

    return () => {
      observer.disconnect();
    };
  }, [ref]);

  const content = useSelector((state: RootState) => state.editor.present?.document?.content);
  const time = useSelector((state: RootState) => state.editor.present?.currentTime);
  let left = -100;
  let top = -100;
  if (ref.current?.parentElement && content != null && time != null) {
    const { x, y } = computeCursorPosition(
      content,
      ref.current?.parentElement as HTMLDivElement,
      time
    ) || {
      x: -100,
      y: -100,
    };
    left = x;
    top = y;
  }

  return (
    <Pane
      id={'cursor' /* for joyride */}
      display={'flex'}
      flexDirection={'column'}
      alignItems={'center'}
      justifyContent={'stretch'}
      height={'calc(1em + 8px)'}
      position={'absolute'}
      transform={'translate(calc(-50% + 1px), -6px)'}
      userSelect={'none'}
      pointerEvents={'none'}
      style={{ left, top } /* we inject this directly for performance reasons */}
      ref={ref}
    >
      <Pane
        width={8}
        height={8}
        marginBottom={-2}
        borderRadius={'100%'}
        backgroundColor={theme.colors.selected}
        transition={'all 0.1s'}
      />
      <Pane width={2} height={'100%'} backgroundColor={theme.colors.selected} />
    </Pane>
  );
}

function computeCursorPosition(
  content: Paragraph[],
  ref: HTMLDivElement,
  time: number
): { x: number; y: number } | null {
  const items = getItemsAtTime(DocumentGenerator.fromParagraphs(content).enumerate(), time);
  const item = items[items.length - 1];
  if (!item) return null;
  const itemElement = ref
    .getElementsByClassName('item')
    .item(item.globalIdx) as HTMLDivElement | null;

  if (!itemElement) {
    return null;
  }

  const y = itemElement.offsetTop;
  let x = itemElement.offsetLeft;
  if (item.absoluteStart <= time) {
    const timeInWord = time - item.absoluteStart;
    x += (timeInWord / item.length) * itemElement.offsetWidth;
  }
  return { x, y };
}
