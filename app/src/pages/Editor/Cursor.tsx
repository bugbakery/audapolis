import * as React from 'react';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../state';
import { Pane } from 'evergreen-ui';
import { useElementSize } from '../../components/useElementSize';
import { useTheme } from '../../components/theme';
import {
  currentCursorTime,
  getIndexAtTime,
  memoizedTimedDocumentItems,
} from '../../state/editor/selectors';

export function Cursor(): JSX.Element {
  const theme = useTheme();

  const [ref, setRef] = useState<HTMLDivElement | null>(null);
  const now = Date.now();
  const [scrollBlockedLast, setScrollBlockedLast] = useState(now);

  // we do this to re-render the cursor when the parent container size changes
  const _parentSize = useElementSize(ref?.parentElement);

  const cursorPosition = useComputeCursorPosition();
  if (cursorPosition == null) return <></>;

  const scrollContainer = document.getElementById('scroll-container');
  if (
    scrollContainer &&
    now - scrollBlockedLast > 1000 &&
    (scrollContainer.scrollTop > cursorPosition.top - 20 ||
      scrollContainer.scrollTop + scrollContainer.clientHeight - 20 < cursorPosition.top)
  ) {
    setTimeout(() => {
      scrollContainer.scrollTo({ top: cursorPosition.top - 30, behavior: 'smooth' });
      setScrollBlockedLast(now);
    });
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
      userSelect={'none'}
      pointerEvents={'none'}
      top={0}
      left={0}
      style={{
        transform: `translate(calc(-50% + 1px + ${cursorPosition.left}px), calc(${cursorPosition.top}px - 6px))`,
      }}
      transition={'transform .1s linear'}
      ref={(ref: HTMLDivElement) => setRef(ref)}
    >
      <Pane
        width={8}
        height={8}
        marginBottom={-2}
        borderRadius={'100%'}
        backgroundColor={theme.colors.playAccent}
      />
      <Pane width={2} height={'100%'} backgroundColor={theme.colors.playAccent} />
    </Pane>
  );
}

function useComputeCursorPosition(): {
  left: number;
  top: number;
} | null {
  const time = useSelector((state: RootState) =>
    state.editor.present ? currentCursorTime(state.editor.present) : 0
  );
  const useRoundedTime = useSelector((state: RootState) => state.editor.present?.playing);
  const roundedTime = Math.ceil(time * 10) / 10;
  const showTime = useRoundedTime ? roundedTime : time;
  const itemIdx = useSelector((state: RootState) => {
    if (state.editor.present == null) return null;
    switch (state.editor.present.cursor.current) {
      case 'player': {
        return getIndexAtTime(state.editor.present.document.content, showTime);
      }
      case 'user':
        return state.editor.present.cursor.userIndex;
    }
  });

  const item = useSelector((state: RootState) =>
    state.editor.present && itemIdx !== null
      ? memoizedTimedDocumentItems(state.editor.present.document.content)[itemIdx]
      : null
  );

  // TODO: Caching?
  if (itemIdx == null) return null;
  const itemElement = document.getElementById(`item-${itemIdx}`);
  if (!itemElement) return null;
  let left = itemElement.offsetLeft;
  const top = itemElement.offsetTop;
  if (item && item.absoluteStart <= time && 'length' in item) {
    const timeInWord = showTime - item.absoluteStart;
    left += (timeInWord / item.length) * itemElement.offsetWidth;
  }
  return { left, top };
}
