import { useDispatch } from 'react-redux';
import { exportSelection } from '../../state/editor';
import * as React from 'react';
import { HTMLAttributes, RefObject, useState } from 'react';
import styled, { css } from 'styled-components';
import { useDocumentEvent, useWindowEvent } from '../../util/useListener';
import { Button } from 'evergreen-ui';
const SelectionMenuContainer = styled.div<{ noMouse: boolean }>`
  position: absolute;
  display: block;
  transform: translate(-50%, -100%);
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
    null as null | { left: number; right: number; top: number }
  );
  const listener = () => {
    const selection = document.getSelection();
    if (selection && !selection?.isCollapsed) {
      const { left, right, top } = selection?.getRangeAt(0).getBoundingClientRect();
      setSelection({ left, right, top });
    } else {
      setSelection(null);
    }
  };
  useDocumentEvent('selectionchange', listener);
  useWindowEvent('resize', listener);

  const [mouseDown, setMouseDown] = useState(false);
  useDocumentEvent('mousedown', () => setMouseDown(true));
  useDocumentEvent('mouseup', () => setMouseDown(false));

  const documentBoundingRect = documentRef.current?.getBoundingClientRect();

  if (selection && documentBoundingRect) {
    return (
      <SelectionMenuContainer
        style={{
          top: selection.top - documentBoundingRect.top,
          left: (selection.left + selection.right) / 2,
        }}
        noMouse={mouseDown}
        {...props}
      >
        <Button onMouseDown={() => dispatch(exportSelection())} appearance="primary">
          Export
        </Button>
      </SelectionMenuContainer>
    );
  }
  return <></>;
}
