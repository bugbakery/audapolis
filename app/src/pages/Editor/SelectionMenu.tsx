import { useDispatch, useSelector } from 'react-redux';
import { SmallButton } from '../../components/Controls';
import { exportSelection } from '../../state/editor';
import * as React from 'react';
import { DocumentGenerator, ParagraphGeneric, TimedParagraphItem } from '../../core/document';
import { RootState } from '../../state';
import { RefObject, useEffect, useState } from 'react';
import styled from 'styled-components';
const SelectionMenuContainer = styled.div<{ anchorTop: number; anchorLeft: number }>`
  top: ${(props) => props.anchorTop}px;
  left: ${(props) => props.anchorLeft}px;
  position: absolute;
  display: block;
  transform: translateX(-50%) translateY(-100%);
`;
export function SelectionMenu({
  documentRef,
  content,
}: {
  documentRef: RefObject<HTMLDivElement>;
  content: ParagraphGeneric<TimedParagraphItem>[];
}): JSX.Element {
  // we do this to re-render the cursor when the window resizes
  const [_, setWindowSize] = useState(null as null | { height: number; width: number });
  useEffect(() => {
    window.addEventListener('resize', () =>
      setWindowSize({ height: window.innerHeight, width: window.innerWidth })
    );
  }, []);
  const dispatch = useDispatch();

  const selection = useSelector((state: RootState) => state.editor.present?.selection);
  if (selection) {
    if (documentRef.current?.parentElement) {
      const bbox = computeWordBbox(
        content,
        documentRef.current?.parentElement as HTMLDivElement,
        selection.start,
        selection.length
      );
      if (bbox) {
        const { left, right, top } = bbox;
        const anchorLeft = (left + right) / 2;
        const anchorTop = top;
        return (
          <SelectionMenuContainer anchorTop={anchorTop} anchorLeft={anchorLeft}>
            <SmallButton onClick={() => dispatch(exportSelection())} primary>
              Export
            </SmallButton>
          </SelectionMenuContainer>
        );
      }
    }
  }
  return <></>;
}

export function computeWordBbox(
  content: ParagraphGeneric<TimedParagraphItem>[],
  ref: HTMLDivElement,
  start: number,
  length: number
): { top: number; bottom: number; left: number; right: number } | null {
  const itemElements = ref.getElementsByClassName('item');
  const items = DocumentGenerator.fromParagraphs(content)
    .enumerate()
    .filter((item) => item.absoluteStart >= start && item.absoluteStart < start + length)
    .filterMap((item) => (itemElements.item(item.globalIdx) as HTMLElement) || undefined)
    .collect();
  const { left, right, top, bottom } = items.reduce(
    (
      val: { top: number | null; bottom: number | null; left: number | null; right: number | null },
      current
    ) => {
      const bottom = current.offsetTop + current.offsetHeight;
      const right = current.offsetLeft + current.offsetWidth;
      if (val.bottom == null || val.bottom < bottom) {
        val.bottom = bottom;
      }
      if (val.right == null || val.right < right) {
        val.right = right;
      }
      if (val.top == null || val.top > current.offsetTop) {
        val.top = current.offsetTop;
      }
      if (val.left == null || val.left > current.offsetLeft) {
        val.left = current.offsetLeft;
      }
      return val;
    },
    { left: null, right: null, top: null, bottom: null }
  );
  if (left == null || right == null || top == null || bottom == null) {
    console.log('bbox is null', left, right, top, bottom);
    return null;
  } else {
    return { left, right, top, bottom };
  }
}
