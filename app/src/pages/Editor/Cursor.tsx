import * as React from 'react';
import { useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../state';
import {
  DocumentGenerator,
  DocumentGeneratorItem,
  getItemsAtTime,
  Paragraph,
} from '../../core/document';
import { Pane, useTheme } from 'evergreen-ui';
import { useElementSize } from '../../components/useElementSize';

export function Cursor(): JSX.Element {
  const theme = useTheme();

  const [ref, setRef] = useState<HTMLDivElement | null>(null);

  // we do this to re-render the cursor when the parent container size changes
  const _parentSize = useElementSize(ref?.parentElement);

  const { left, top } = useComputeCursorPosition(ref?.parentElement) || {
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

function useComputeCursorPosition(parentElement: HTMLElement | null | undefined): {
  left: number;
  top: number;
} | null {
  const content = useSelector((state: RootState) => state.editor.present?.document?.content);
  const time = useSelector((state: RootState) => state.editor.present?.currentTimePlayer);

  // we use caching here because we have to calculate the cursor position every frame
  const last = useRef<null | {
    content: Paragraph[];
    parentElement: HTMLElement;
    item: DocumentGeneratorItem;
    itemElement: HTMLDivElement;
  }>();
  const lastItem = last.current?.item;

  if (!content || time == undefined || !parentElement) return null;

  if (
    !(
      last &&
      lastItem &&
      last.current?.content == content &&
      last.current?.parentElement == parentElement &&
      lastItem?.absoluteStart <= time &&
      lastItem?.absoluteStart + lastItem?.length >= time
    )
  ) {
    const items = getItemsAtTime(DocumentGenerator.fromParagraphs(content).enumerate(), time);
    const item = items[items.length - 1];
    if (!item) return null;
    const itemElement = parentElement
      .getElementsByClassName('item')
      .item(item.globalIdx) as HTMLDivElement | null;
    if (!itemElement) return null;

    last.current = {
      content,
      parentElement,
      item,
      itemElement,
    };
  }

  if (!last.current) return null;
  const { itemElement, item } = last.current;

  let left = itemElement.offsetLeft;
  const top = itemElement.offsetTop;
  if (item.absoluteStart <= time) {
    const timeInWord = time - item.absoluteStart;
    left += (timeInWord / item.length) * itemElement.offsetWidth;
  }
  return { left, top };
}
