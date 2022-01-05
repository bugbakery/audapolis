import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../state';
import {
  computeTimed,
  DocumentGenerator,
  getItemsAtTime,
  Paragraph as ParagraphType,
  TimedParagraphItem,
} from '../../core/document';
import * as React from 'react';
import { KeyboardEventHandler, MouseEventHandler, RefObject, useEffect, useRef } from 'react';
import { Cursor } from './Cursor';
import { Paragraph } from './Paragraph';
import { basename, extname } from 'path';
import { SelectionMenu } from './SelectionMenu';
import { EPSILON } from '../../util';
import {
  deleteSomething,
  goLeft,
  goRight,
  selectionIncludeFully,
  selectLeft,
  selectRight,
  setSelection,
  setTime,
} from '../../state/editor';
import { Heading, majorScale, Pane, useTheme } from 'evergreen-ui';
import styled from 'styled-components';

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
  const contentRaw = useSelector((state: RootState) => state.editor.present?.document?.content);
  const displaySpeakerNames =
    useSelector((state: RootState) => state.editor.present?.displaySpeakerNames) || false;
  const content = computeTimed(contentRaw || ([] as ParagraphType[]));
  const fileName = useSelector((state: RootState) => state.editor.present?.path) || '';
  const speakerIndices = Object.fromEntries(
    Array.from(new Set(content.map((p) => p.speaker))).map((name, i) => [name, i])
  );
  const ref = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const setCaret = useRef(false);

  useEffect(() => {
    ref.current && ref.current.focus();
  }, [ref.current]);

  const mouseDownHandler: MouseEventHandler = () => {
    setCaret.current = true;
    dispatch(setSelection(null));
  };

  const getParagraphItemIdx = (element: HTMLElement | null) =>
    element?.dataset?.item?.split('-').map((x) => parseInt(x)) || [];
  const getItem = (element: HTMLElement | null): TimedParagraphItem | null => {
    const [paragraphIdx, itemIdx] = getParagraphItemIdx(element);
    return content[paragraphIdx]?.content[itemIdx];
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
    dispatch(selectionIncludeFully(item));
  };

  const isLastItemInParagraph = (element: Node, offset: number): boolean => {
    const node = getChild(element, offset);
    const parent = node?.parentElement;
    const [paragraphIdx, itemIdx] = getParagraphItemIdx(parent);
    if (paragraphIdx == content.length - 1) return false;
    return itemIdx == content[paragraphIdx]?.content.length - 1;
  };

  const setBrowserRangeToStateRange = (selectionRange: globalThis.Range) => {
    if (selectionRange.collapsed) {
      dispatch(setSelection(null));
      const node =
        selectionRange && getChild(selectionRange.startContainer, selectionRange.startOffset);
      const element = node?.parentElement;
      const nodeLength = element?.textContent?.length;
      const item = getItem(element);
      if (item && nodeLength !== undefined) {
        // two epsilon is the theoretical minimum here but four epsilon seems to be more robust
        const timeSubtract = isLastItemInParagraph(
          selectionRange.startContainer,
          selectionRange.startOffset
        )
          ? 4 * EPSILON
          : 0;
        const timeAdd = selectionRange.startOffset == nodeLength ? item.length : 0;
        dispatch(setTime(item.absoluteStart + timeAdd - timeSubtract));
      }
    } else {
      const startItem = itemFromNode(selectionRange.startContainer, selectionRange.startOffset);
      const endItem = itemFromNode(selectionRange.endContainer, selectionRange.endOffset);
      if (!startItem || !endItem) return;
      const range = {
        start: startItem.absoluteStart,
        length:
          endItem.absoluteStart +
          (selectionRange.endOffset == 0 ? 0 : endItem.length) -
          startItem.absoluteStart,
      };
      dispatch(setSelection({ range, startItem }));
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
      dispatch(deleteSomething());
    } else if (e.key == 'ArrowLeft' && e.shiftKey) {
      dispatch(selectLeft());
    } else if (e.key == 'ArrowRight' && e.shiftKey) {
      dispatch(selectRight());
    } else if (e.key == 'ArrowLeft') {
      dispatch(goLeft());
    } else if (e.key == 'ArrowRight') {
      dispatch(goRight());
    }
  };

  console.log(theme.colors);

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

      {content.length > 0 ? (
        content.map((p, i) => {
          const speakerColor = theme.colors.speakers[speakerIndices[p.speaker]];
          return (
            <Paragraph
              key={i}
              speaker={p.speaker}
              content={p.content}
              paragraphIdx={i}
              color={speakerColor}
              displaySpeakerNames={displaySpeakerNames}
            />
          );
        })
      ) : (
        <Paragraph
          key={0}
          speaker=""
          content={[{ type: 'artificial_silence', absoluteStart: 0, length: 0 }]}
          paragraphIdx={0}
          color={theme.colors.text.info}
          displaySpeakerNames={displaySpeakerNames}
        />
      )}
    </DocumentContainer>
  );
}

function SelectionApply({ documentRef }: { documentRef: RefObject<HTMLDivElement> }): JSX.Element {
  const selection = useSelector((state: RootState) => state.editor.present?.selection);
  const ltr =
    useSelector((state: RootState) => state.editor.present?.selection?.startItem.absoluteStart) ==
    selection?.range.start;
  const content = useSelector((state: RootState) => state.editor.present?.document.content) || [];
  useEffect(() => {
    const nodeFromTime = (time: number, last: boolean): { node: Node; offset: number } | null => {
      const items = getItemsAtTime(DocumentGenerator.fromParagraphs(content).enumerate(), time);
      const item = items[last ? items.length - 1 : 0] || {
        globalIdx: 0,
        absoluteStart: time,
        length: 1,
      };
      const node = documentRef.current?.getElementsByClassName('item').item(item.globalIdx);
      if (!node) return null;
      const child = getChild(node);
      const childLenght = child.childNodes.length || child.textContent?.length || 0;
      return {
        node: child,
        offset: ((time - item.absoluteStart) / item.length) * childLenght,
      };
    };

    if (selection) {
      const start = nodeFromTime(selection.range.start, true);
      const end = nodeFromTime(selection.range.start + selection.range.length, true);
      if (start && end) {
        if (ltr) {
          window.getSelection()?.setBaseAndExtent(start.node, start.offset, end.node, end.offset);
        } else {
          window.getSelection()?.setBaseAndExtent(end.node, end.offset, start.node, start.offset);
        }
      }
    } else {
      window.getSelection()?.removeAllRanges();
    }
  }, [selection?.range.start, selection?.range.length, ltr, documentRef.current]);
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
      <span style={{ fontWeight: 100 }}>{extension}</span>
    </Heading>
  );
}
