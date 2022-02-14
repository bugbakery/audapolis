import * as React from 'react';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../state';
import { Pane } from 'evergreen-ui';
import { useElementSize } from '../../components/useElementSize';
import { useTheme } from '../../components/theme';
import {
  currentCursorTime,
  currentIndex,
  memoizedTimedDocumentItems,
} from '../../state/editor/selectors';
import { EditorState } from '../../state/editor/types';

export function Cursor(): JSX.Element {
  const theme = useTheme();

  const [ref, setRef] = useState<HTMLDivElement | null>(null);

  // we do this to re-render the cursor when the parent container size changes
  const _parentSize = useElementSize(ref?.parentElement);

  const { left, top } = useComputeCursorPosition() || {
    left: -100,
    top: -100,
  };

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
        transform: `translate(calc(-50% + 1px + ${left}px), calc(${top}px - 6px))`,
      }}
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

function getCursorPositionIndex(state: EditorState): number {
  switch (state.cursor.current) {
    case 'player':
      return currentIndex(state);
    case 'user':
      return state.cursor.userIndex;
  }
}

function useComputeCursorPosition(): {
  left: number;
  top: number;
} | null {
  const itemIdx = useSelector((state: RootState) =>
    state.editor.present ? getCursorPositionIndex(state.editor.present) : null
  );
  const time = useSelector((state: RootState) =>
    state.editor.present ? currentCursorTime(state.editor.present) : 0
  );

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
    const timeInWord = time - item.absoluteStart;
    left += (timeInWord / item.length) * itemElement.offsetWidth;
  }
  return { left, top };
}
