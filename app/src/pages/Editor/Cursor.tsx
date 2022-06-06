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
  const isCorrection = useSelector(
    (state: RootState) => state.editor.present?.transcriptCorrectionState != null
  );

  const [ref, setRef] = useState<HTMLDivElement | null>(null);
  const now = Date.now();
  const [scrollBlockedLast, setScrollBlockedLast] = useState(now);

  // we do this to re-render the cursor when the parent container size changes
  const _parentSize = useElementSize(ref?.parentElement);

  const cursorPosition = useComputeCursorPosition(ref?.parentElement);
  if (isCorrection || cursorPosition == null) {
    return <div style={{ display: 'none' }} ref={(ref: HTMLDivElement) => setRef(ref)} />;
  }

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
    (state: RootState) => state.editor.present?.document.metadata.display_speaker_names
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
  const itemElement = document.getElementById(`item-${item?.uuid}`);
  if (!itemElement) return null;

  if (item && item.absoluteStart <= showTime && 'length' in item) {
    if (!parentElement) return null;

    const parentClientRect = parentElement.getBoundingClientRect();

    // each rect is one line. An item can span multiple lines because of line-wrapping
    // "a multiline inline element (such as a multiline <span> element, by default) has a border box around each line."
    // - https://developer.mozilla.org/en-US/docs/Web/API/Element/getClientRects
    const rects = Array.from(itemElement.getClientRects());

    const totalWidth = _.sum(rects.map((r) => r.width));
    const timeInWord = showTime - item.absoluteStart;

    // `target` is the offset in px into the word pretending there is no line-wrapping going on
    let target = (timeInWord / item.length) * totalWidth;

    // we then iterate over the wrapped lines and subtract the width of each line before the cursor until the cursor fits into the line
    for (const rect of rects) {
      if (target <= rect.width) {
        // we subtract the parentClientRect from the calculated cursor position to have a position that is relative to the parent
        return {
          left: rect.left + target - parentClientRect.left,
          top: rect.top - parentClientRect.top,
        };
      } else {
        target -= rect.width;
      }
    }
    const lastRect = rects[rects.length - 1];
    // we subtract the parentClientRect from the calculated cursor position to have a position that is relative to the parent
    return {
      left: lastRect.left + lastRect.width - parentClientRect.left,
      top: lastRect.top - parentClientRect.top,
    };
  } else {
    // this is triggered when we are in an element that does not have a length
    return {
      left: itemElement.offsetLeft,
      top: itemElement.offsetTop,
    };
  }
}
