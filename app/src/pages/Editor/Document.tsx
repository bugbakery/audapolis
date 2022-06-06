import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../state';
import { V3TimedDocumentItem } from '../../core/document';
import * as React from 'react';
import { KeyboardEventHandler, MouseEventHandler, RefObject, useEffect, useRef } from 'react';
import { Cursor } from './Cursor';
import { Paragraph } from './Paragraph';
import { basename, extname } from 'path';
import { SelectionMenu } from './SelectionMenu';
import { Heading, majorScale, Pane, useTheme } from 'evergreen-ui';
import styled from 'styled-components';
import {
  moveSelectionHeadTo,
  moveSelectionHeadLeft,
  moveSelectionHeadRight,
  setSelection,
} from '../../state/editor/selection';
import { goLeft, goRight, setUserIndex } from '../../state/editor/play';
import { deleteSomething } from '../../state/editor/edit';
import { Theme } from '../../components/theme';
import {
  memoizedMacroItems,
  memoizedSpeakerIndices,
  memoizedTimedDocumentItems,
} from '../../state/editor/selectors';
import { Dispatch } from '@reduxjs/toolkit';
import { startTranscriptCorrection } from '../../state/editor/transcript_correction';

const DocumentContainer = styled.div<{ displaySpeakerNames: boolean }>`
  position: relative;
  width: 100%;
  max-width: ${({ displaySpeakerNames }) => (displaySpeakerNames ? 950 : 800)}px;
  transition: max-width 0.2s;
  line-height: 1.5;
  padding: 30px 30px 200px;

  justify-content: center;

  & > * {
    overflow-x: hidden;
  }
  &:focus {
    outline: none;
  }
`;

export function Document(): JSX.Element {
  const dispatch = useDispatch();
  const content = useSelector((state: RootState) =>
    state.editor.present ? memoizedTimedDocumentItems(state.editor.present.document.content) : []
  );
  const contentMacros = memoizedMacroItems(content);
  console.log('contentMacros', contentMacros, content);
  const displaySpeakerNames =
    useSelector((state: RootState) => state.editor.present?.displaySpeakerNames) || false;
  const fileName = useSelector((state: RootState) => state.editor.present?.path) || '';

  const editingRange = useSelector((state: RootState) => {
    if (state.editor.present?.transcriptCorrectionState != null) {
      return state.editor.present?.selection;
    } else {
      return null;
    }
  });

  const speakerColorIndices = memoizedSpeakerIndices(contentMacros);
  const ref = useRef<HTMLDivElement>(null);
  const theme: Theme = useTheme();

  useEffect(() => {
    ref.current && ref.current.focus();
  }, [ref.current]);

  const mouseDownHandler: MouseEventHandler = (e) => {
    if (e.detail != 1 || e.buttons != 1) return;

    e.preventDefault();
    ref.current?.focus(); // sometimes we loose focus and then it is nice to be able to gain it back

    if (e.detail == 1 && !e.shiftKey) {
      handleWordClick(dispatch, content, e);
    } else if (e.detail == 1 && e.shiftKey) {
      const index = indexAtPosition(content, e.clientX, e.clientY, 50);
      if (index) {
        dispatch(moveSelectionHeadTo(index));
      }
    }
  };

  const mouseMoveHandler: MouseEventHandler = (e) => {
    if (e.buttons != 1) return;
    e.preventDefault();

    const index = indexAtPosition(content, e.clientX, e.clientY);
    if (index) {
      dispatch(moveSelectionHeadTo(index));
    }
  };

  const keyDownHandler: KeyboardEventHandler = (e) => {
    if (e.key === 'Backspace') {
      dispatch(deleteSomething('left'));
    } else if (e.key === 'Delete') {
      dispatch(deleteSomething('right'));
    } else if (e.key == 'ArrowLeft' && e.shiftKey) {
      dispatch(moveSelectionHeadLeft());
      e.preventDefault();
    } else if (e.key == 'ArrowRight' && e.shiftKey) {
      dispatch(moveSelectionHeadRight());
      e.preventDefault();
    } else if (e.key == 'ArrowLeft') {
      dispatch(goLeft());
    } else if (e.key == 'ArrowRight') {
      dispatch(goRight());
    } else if (e.key == 'ArrowUp' || e.key == 'ArrowDown') {
      // TODO: handle properly (see: https://github.com/audapolis/audapolis/issues/228)
      e.preventDefault();
    } else if (e.key == 'i') {
      e.preventDefault();
      dispatch(startTranscriptCorrection('left'));
    } else if (e.key == 'o') {
      e.preventDefault();
      dispatch(startTranscriptCorrection('right'));
    }
  };
  function getSpeakerColor(speaker: string) {
    if (speakerColorIndices[speaker] === undefined) return theme.colors.muted;
    const color_idx = speakerColorIndices[speaker] % Object.keys(theme.colors.speakers).length;
    console.log(speaker, color_idx, theme.colors.speakers);
    return theme.colors.speakers[color_idx];
  }

  return (
    <DocumentContainer
      id={'document'}
      ref={ref}
      displaySpeakerNames={displaySpeakerNames}
      onMouseDown={mouseDownHandler}
      onMouseMove={mouseMoveHandler}
      tabIndex={1}
      onKeyDown={keyDownHandler}
    >
      <Cursor />
      <SelectionMenu documentRef={ref} />
      <SelectionApply documentRef={ref} />

      <Pane display={'flex'} flexDirection={'row'} marginBottom={majorScale(4)}>
        <Pane
          width={displaySpeakerNames ? 150 : 0}
          transition={'width .2s'}
          flexShrink={0}
          marginRight={majorScale(1)}
        />
        <FileNameDisplay path={fileName} />
      </Pane>

      {contentMacros.map((p, i) => {
        switch (p.type) {
          case 'paragraph': {
            const speakerColor = getSpeakerColor(p.speaker);
            const paraBreakIdx = p.endAbsoluteIndex;
            return (
              <Paragraph
                key={i}
                data={p}
                color={speakerColor}
                displaySpeakerNames={displaySpeakerNames}
                paraBreakIdx={paraBreakIdx}
                editingRange={editingRange}
              />
            );
          }
        }
      })}
    </DocumentContainer>
  );
}

function shouldPlaceCursorLeft(x: number, y: number, elem: Element, leftPercentage = 50): boolean {
  const clientRects = elem.getClientRects();
  if (clientRects.length == 1) {
    const rect = clientRects[0];
    return x < rect.left + (rect.right - rect.left) * (leftPercentage / 100);
  } else if (clientRects.length > 1) {
    const rect = clientRects[1];
    return rect.top > y;
  } else {
    return false;
  }
}

function handleWordClick(dispatch: Dispatch, content: V3TimedDocumentItem[], e: React.MouseEvent) {
  const range = document.caretRangeFromPoint(e.clientX, e.clientY);
  if (!range) return;
  const nodeLength = range.startContainer.textContent?.length;
  if (nodeLength != null) {
    const parent = range.startContainer.parentElement;
    const placeLeft = parent == null ? false : shouldPlaceCursorLeft(e.clientX, e.clientY, parent);
    dispatch(setSelection(null));
    const item = itemFromNode(content, range.startContainer, range.startOffset);
    if (item) {
      const idx = item.absoluteIndex + (placeLeft ? 0 : 1);
      dispatch(setUserIndex(idx));
    }
  }
}

const getAbsoluteItemIndex = (element: HTMLElement | null) =>
  parseInt(element?.id?.replace('item-', '') || '');

const getItem = (
  content: V3TimedDocumentItem[],
  element: HTMLElement | null
): V3TimedDocumentItem | null => {
  const itemIdx = getAbsoluteItemIndex(element);
  return content[itemIdx];
};

function indexAtPosition(
  content: V3TimedDocumentItem[],
  x: number,
  y: number,
  leftPercentage = 50
): number | undefined {
  const range = document.caretRangeFromPoint(x, y);
  if (!range) return;
  const item = itemFromNode(content, range.startContainer, range.startOffset);
  if (!item) return;

  const parent = range.startContainer.parentElement;
  const placeLeft = parent == null ? false : shouldPlaceCursorLeft(x, y, parent, leftPercentage);
  const off = placeLeft ? 0 : 1;
  return item.absoluteIndex + off;
}

const itemFromNode = (content: V3TimedDocumentItem[], node: Node, n = 0) => {
  const child = getChild(node, n);
  let itemElement = child?.parentElement;
  while (itemElement) {
    if (itemElement.id.match(/item-/)) break;
    else itemElement = itemElement?.parentElement;
  }
  return getItem(content, itemElement);
};
function SelectionApply({ documentRef }: { documentRef: RefObject<HTMLDivElement> }): JSX.Element {
  const selection = useSelector((state: RootState) => state.editor.present?.selection);
  const transcriptCorrectionState = useSelector(
    (state: RootState) => state.editor.present?.transcriptCorrectionState
  );
  const exportPopupState = useSelector((state: RootState) => state.editor.present?.exportPopup);

  useEffect(() => {
    if (selection) {
      const start = document.getElementById(`item-${selection.startIndex}`);
      const end = document.getElementById(`item-${selection.startIndex + selection.length}`);
      if (start && end) {
        if (selection.headPosition == 'left') {
          window.getSelection()?.setBaseAndExtent(start, 0, end, 0);
        } else {
          window.getSelection()?.setBaseAndExtent(end, 0, start, 0);
        }
      } else {
        window.getSelection()?.removeAllRanges();
      }
    } else {
      window.getSelection()?.removeAllRanges();
    }
  }, [
    selection?.startIndex,
    selection?.length,
    selection?.headPosition,
    documentRef.current,
    transcriptCorrectionState,
    exportPopupState,
  ]);
  return <></>;
}

function getChild(element: Node, n = 0): Node {
  return element?.childNodes.item(n) ? getChild(element?.childNodes.item(n)) : element;
}

function FileNameDisplay({ path }: { path: string }) {
  const extension = extname(path);
  const base = basename(path, extension);

  return (
    <Heading userSelect={'none'} fontWeight={400} size={600}>
      {base}
      <span style={{ fontWeight: 200 }}>{extension}</span>
    </Heading>
  );
}
