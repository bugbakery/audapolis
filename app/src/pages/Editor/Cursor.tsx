import * as React from 'react';
import { useEffect, useState } from 'react';
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
import _ from 'lodash';

export function Cursor(): JSX.Element {
  const theme = useTheme();

  const [ref, setRef] = useState<HTMLDivElement | null>(null);
  const now = Date.now();
  const [scrollBlockedLast, setScrollBlockedLast] = useState(now);

  // we do this to re-render the cursor when the parent container size changes
  const _parentSize = useElementSize(ref?.parentElement);

  const cursorPosition = useComputeCursorPosition(ref?.parentElement);
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

function useComputeCursorPosition(parentElement: HTMLElement | null | undefined): {
  left: number;
  top: number;
} | null {
  const time = useSelector((state: RootState) =>
    state.editor.present ? currentCursorTime(state.editor.present) : 0
  );
  const useRoundedTime = useSelector((state: RootState) => state.editor.present?.playing);
  const stateDisplaySpeakerNames = useSelector(
    (state: RootState) => state.editor.present?.displaySpeakerNames
  );
  const [_speakerNamesDisplayed, setSpeakerNamesDisplayed] = useState(stateDisplaySpeakerNames);
  useEffect(() => {
    setTimeout(() => {
      setSpeakerNamesDisplayed(stateDisplaySpeakerNames);
    }, 200);
  }, [stateDisplaySpeakerNames]);

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

  if (item && item.absoluteStart <= time && 'length' in item) {
    if (!parentElement) return null;
    const parentClientRect = parentElement.getBoundingClientRect();
    const rects = Array.from(itemElement.getClientRects());
    const totalWidth = _.sum(rects.map((r) => r.width));
    const timeInWord = showTime - item.absoluteStart;

    const target = (timeInWord / item.length) * totalWidth;
    let offset = 0;
    for (const rect of rects) {
      if (target - offset <= rect.width) {
        return {
          left: rect.left + target - offset - parentClientRect.left,
          top: rect.top - parentClientRect.top,
        };
      } else {
        offset += rect.width;
      }
    }
    const lastRect = rects[rects.length - 1];
    return {
      left: lastRect.left + lastRect.width - parentClientRect.left,
      top: lastRect.top - parentClientRect.top,
    };
  } else {
    return {
      left: itemElement.offsetLeft,
      top: itemElement.offsetTop,
    };
  }
}
