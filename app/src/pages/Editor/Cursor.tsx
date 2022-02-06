import * as React from 'react';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../state';
import { Pane } from 'evergreen-ui';
import { useElementSize } from '../../components/useElementSize';
import { useTheme } from '../../components/theme';
import { currentCursorTime, currentItem } from '../../state/editor/selectors';

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
      transform={'translate(calc(-50% + 1px), -6px)'}
      userSelect={'none'}
      pointerEvents={'none'}
      style={{ left, top } /* we inject this directly for performance reasons */}
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
  const item = useSelector((state: RootState) =>
    state.editor.present ? currentItem(state.editor.present) : null
  );
  const time = useSelector((state: RootState) =>
    state.editor.present ? currentCursorTime(state.editor.present) : 0
  );

  // TODO: Caching?
  if (!item) return null;
  const itemElement = document.getElementById(`item-${item.absoluteIndex}`);
  if (!itemElement) return null;
  let left = itemElement.offsetLeft;
  const top = itemElement.offsetTop;
  if (item.absoluteStart <= time && 'length' in item) {
    const timeInWord = time - item.absoluteStart;
    left += (timeInWord / item.length) * itemElement.offsetWidth;
  }
  return { left, top };
}
