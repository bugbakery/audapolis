import { useDispatch } from 'react-redux';
import { exportSelection, copySelectionText } from '../../state/editor';
import * as React from 'react';
import { HTMLAttributes, RefObject, useRef, useState } from 'react';
import styled, { css } from 'styled-components';
import { useDocumentEvent } from '../../util/useListener';
import { Button, Group } from 'evergreen-ui';
import { useElementSize } from '../../util/useElementSize';
const SelectionMenuContainer = styled.div<{ noMouse: boolean; centerHorizontally: boolean }>`
  position: absolute;
  display: block;
  transform: translate(${({ centerHorizontally }) => (centerHorizontally ? '-50%' : '0')}, -100%);
  user-select: none;
  ${(props) =>
    props.noMouse &&
    css`
      pointer-events: none;
    `}
`;
export function SelectionMenu({
  documentRef,
  ...props
}: {
  documentRef: RefObject<HTMLDivElement>;
} & HTMLAttributes<HTMLDivElement>): JSX.Element {
  const dispatch = useDispatch();

  const [selection, setSelection] = useState(
    null as null | { left: number; right: number; top: number; firstRowLeft: number }
  );
  const listener = () => {
    const selection = document.getSelection();
    if (selection && !selection?.isCollapsed) {
      const { left, right, top } = selection?.getRangeAt(0).getBoundingClientRect();
      const firstRowLeft =
        getElementFromNode(selection?.getRangeAt(0).startContainer)?.getBoundingClientRect()
          ?.left || 0;
      setSelection({ left, right, top, firstRowLeft });
    } else {
      setSelection(null);
    }
  };
  useDocumentEvent('selectionchange', listener);
  useElementSize(documentRef.current, listener);

  const containerRef = useRef(null as null | HTMLDivElement);
  const containerSize = useElementSize(containerRef.current);

  const [mouseDown, setMouseDown] = useState(false);
  useDocumentEvent('mousedown', () => setMouseDown(true));
  useDocumentEvent('mouseup', () => setMouseDown(false));

  const documentBoundingRect = documentRef.current?.getBoundingClientRect();

  if (selection && documentBoundingRect) {
    return (
      <SelectionMenuContainer
        ref={containerRef}
        style={{
          top: `calc(${selection.top - documentBoundingRect.top}px - 0.5em`,
          left: Math.min(
            Math.max((selection.left + selection.right) / 2, selection.firstRowLeft) -
              documentBoundingRect.left,
            documentBoundingRect.width - (containerSize?.width || 0)
          ),
        }}
        centerHorizontally={(selection.left + selection.right) / 2 > selection.firstRowLeft}
        noMouse={mouseDown}
        {...props}
      >
        <Group>
          <Button onMouseDown={() => dispatch(exportSelection())}>Export</Button>
          <Button onMouseDown={() => dispatch(copySelectionText())}>Copy text</Button>
        </Group>
      </SelectionMenuContainer>
    );
  }
  return <></>;
}

function getElementFromNode(node: Node): Element | null {
  if (node.nodeType == 1) {
    return node as Element;
  } else {
    return node.parentElement;
  }
}
