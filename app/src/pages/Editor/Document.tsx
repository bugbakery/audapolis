import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../state';
import { TimedDocumentItem } from '../../core/document';
import * as React from 'react';
import { KeyboardEventHandler, MouseEventHandler, RefObject, useEffect, useRef } from 'react';
import { Cursor } from './Cursor';
import { Paragraph } from './Paragraph';
import { basename, extname } from 'path';
import { SelectionMenu } from './SelectionMenu';
import { Heading, majorScale, Pane, useTheme } from 'evergreen-ui';
import styled from 'styled-components';
import {
  selectionIncludeFully,
  moveHeadLeft,
  moveHeadRight,
  setSelection,
} from '../../state/editor/selection';
import { goLeft, goRight, setUserIndex } from '../../state/editor/play';
import { deleteSomething } from '../../state/editor/edit';
import { Theme } from '../../components/theme';
import { macroItems, speakerIndices, timedDocumentItems } from '../../state/editor/selectors';
import { Selection } from '../../state/editor/types';

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
    state.editor.present ? timedDocumentItems(state.editor.present.document.content) : []
  );
  const contentMacros = macroItems(content);
  const displaySpeakerNames =
    useSelector((state: RootState) => state.editor.present?.displaySpeakerNames) || false;
  const fileName = useSelector((state: RootState) => state.editor.present?.path) || '';

  const speakerColorIndices = speakerIndices(contentMacros);
  const ref = useRef<HTMLDivElement>(null);
  const theme: Theme = useTheme();
  const setCaret = useRef(false);

  useEffect(() => {
    ref.current && ref.current.focus();
  }, [ref.current]);

  const mouseDownHandler: MouseEventHandler = () => {
    setCaret.current = true;
    dispatch(setSelection(null));
  };

  const getAbsoluteItemIndex = (element: HTMLElement | null) =>
    parseInt(element?.id?.replace('item-', '') || '');
  const getItem = (element: HTMLElement | null): TimedDocumentItem | null => {
    const itemIdx = getAbsoluteItemIndex(element);
    return content[itemIdx];
  };
  const itemFromNode = (node: Node, n = 0) => {
    const child = getChild(node, n);
    const element = child?.parentElement;
    return getItem(element);
  };

  const mouseMoveHandler: MouseEventHandler = (e) => {
    setCaret.current = false;
    if (e.buttons == 0) return;
    e.preventDefault();

    const range = document.caretRangeFromPoint(e.clientX, e.clientY);
    if (!range) return;
    const item = itemFromNode(range.startContainer, range.startOffset);
    if (!item) return;
    dispatch(selectionIncludeFully(item.absoluteIndex));
  };

  const setBrowserRangeToStateRange = (selectionRange: globalThis.Range) => {
    if (selectionRange.collapsed) {
      dispatch(setSelection(null));
      const node =
        selectionRange && getChild(selectionRange.startContainer, selectionRange.startOffset);
      const element = node?.parentElement;
      const item = getItem(element);
      if (item) {
        dispatch(setUserIndex(item.absoluteIndex));
      }
    } else {
      const startItem = itemFromNode(selectionRange.startContainer, selectionRange.startOffset);
      const endItem = itemFromNode(selectionRange.endContainer, selectionRange.endOffset);
      if (!startItem || !endItem) return;
      const range: Selection = {
        startIndex: startItem.absoluteIndex,
        length: endItem.absoluteIndex - startItem.absoluteIndex + 1,
        // TODO: calculate this from selection anchor & focus node
        headPosition: 'right',
      };
      dispatch(setSelection(range));
    }
  };

  const clickHandler: MouseEventHandler = (e) => {
    if (e.detail == 1) {
      const range = document.caretRangeFromPoint(e.clientX, e.clientY);
      if (!range) return;
      if (setCaret.current) setBrowserRangeToStateRange(range);
    } else {
      const range = window.getSelection()?.getRangeAt(0);
      if (range) setBrowserRangeToStateRange(range);
    }
  };

  const keyDownHandler: KeyboardEventHandler = (e) => {
    if (e.key === 'Backspace') {
      dispatch(deleteSomething('left'));
    } else if (e.key === 'Delete') {
      dispatch(deleteSomething('right'));
    } else if (e.key == 'ArrowLeft' && e.shiftKey) {
      dispatch(moveHeadLeft());
      e.preventDefault();
    } else if (e.key == 'ArrowRight' && e.shiftKey) {
      dispatch(moveHeadRight());
      e.preventDefault();
    } else if (e.key == 'ArrowLeft') {
      dispatch(goLeft());
    } else if (e.key == 'ArrowRight') {
      dispatch(goRight());
    } else if (e.key == 'ArrowUp' || e.key == 'ArrowDown') {
      // TODO: handle properly (see: https://github.com/audapolis/audapolis/issues/228)
      e.preventDefault();
    }
  };
  function getSpeakerColor(speaker: string | null) {
    // TODO: Handle speaker == null everywhere properly
    const color_idx =
      speakerColorIndices[speaker !== null ? speaker : 'null'] %
      Object.keys(theme.colors.speakers).length;
    return theme.colors.speakers[color_idx];
  }

  return (
    <DocumentContainer
      id={'document'}
      ref={ref}
      displaySpeakerNames={displaySpeakerNames}
      onMouseDown={mouseDownHandler}
      onMouseMove={mouseMoveHandler}
      onClick={clickHandler}
      tabIndex={-1}
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
            // TODO: This is a lie that only works because we do not show headings yet.
            //  Once headings are supported, this needs to be better
            const paraBreak = contentMacros[i + 1];
            const paraBreakIdx = paraBreak !== undefined ? paraBreak.absoluteIndex : content.length;
            return (
              <Paragraph
                key={i}
                data={p}
                color={speakerColor}
                displaySpeakerNames={displaySpeakerNames}
                paraBreakIdx={paraBreakIdx}
              />
            );
          }
          case 'heading': {
            console.error('TODO');
            return <></>;
          }
        }
      })}
    </DocumentContainer>
  );
}

function SelectionApply({ documentRef }: { documentRef: RefObject<HTMLDivElement> }): JSX.Element {
  const selection = useSelector((state: RootState) => state.editor.present?.selection);
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
  }, [selection?.startIndex, selection?.length, selection?.headPosition, documentRef.current]);
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
