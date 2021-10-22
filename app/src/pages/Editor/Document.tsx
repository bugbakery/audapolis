import { useDispatch, useSelector, useStore } from 'react-redux';
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
import { Title } from '../../components/Util';
import styled, { useTheme } from 'styled-components';
import { SelectionMenu } from './SelectionMenu';
import { assertSome, EPSILON } from '../../util';
import {
  deleteParagraphBreak,
  deleteSelection,
  selectionIncludeFully,
  setSelection,
  setTime,
} from '../../state/editor';
import { getChild, isSelectionLeftToRight, nodeLength } from './selectionUtil';

const DocumentContainer = styled.div<{ displaySpeakerNames: boolean }>`
  position: relative;
  width: 100%;
  line-height: 1.5;
  padding: 30px 30px 200px;

  display: grid;
  row-gap: 1em;
  column-gap: 1em;
  transition: all 1s;
  grid-template-columns: ${(props) => (props.displaySpeakerNames ? '100' : '0')}px min(
      800px,
      calc(100% - ${(props) => (props.displaySpeakerNames ? '100' : '0')}px)
    );
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
  const store = useStore();
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
    dispatch(selectionIncludeFully({ start: item.absoluteStart, length: item.length }));
  };

  const isLastItemInParagraph = (element: Node, offset: number): boolean => {
    const node = getChild(element, offset);
    const parent = node?.parentElement;
    const [paragraphIdx, itemIdx] = getParagraphItemIdx(parent);
    if (paragraphIdx == content.length - 1) return false;
    return itemIdx == content[paragraphIdx]?.content.length - 1;
  };

  const isFirstItemInParagraph = (element: Node, offset: number): boolean => {
    const node = getChild(element, offset);
    const parent = node?.parentElement;
    const [paragraphIdx, itemIdx] = getParagraphItemIdx(parent);
    if (paragraphIdx == 0) return false;
    return itemIdx == 0;
  };

  const setBrowserRangeToStateRange = (range: globalThis.Range, ltr = true) => {
    if (range.collapsed) {
      dispatch(setSelection(null));
      const node = range && getChild(range.startContainer, range.startOffset);
      const element = node?.parentElement;
      const nodeLength = element?.textContent?.length;
      const item = getItem(element);
      if (item && nodeLength !== undefined) {
        // two epsilon is the theoretical minimum here but four epsilon seems to be more robust
        const timeSubtract = isLastItemInParagraph(range.startContainer, range.startOffset)
          ? 4 * EPSILON
          : 0;
        const timeAdd = range.startOffset == nodeLength ? item.length : 0;
        dispatch(setTime(item.absoluteStart + timeAdd - timeSubtract));
      }
    } else {
      const startItem = itemFromNode(range.startContainer, range.startOffset);
      const endItem = itemFromNode(range.endContainer, range.endOffset);
      if (!startItem || !endItem) return;
      dispatch(
        setSelection({
          ltr,
          start: startItem.absoluteStart,
          length:
            endItem.absoluteStart +
            (range.endOffset == 0 ? 0 : endItem.length) -
            startItem.absoluteStart,
        })
      );
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

  const setCaretToCurrentTime = () => {
    const currentTime = (store.getState() as RootState).editor.present?.currentTime;
    if (currentTime) {
      const items = getItemsAtTime(
        DocumentGenerator.fromParagraphs(content).enumerate(),
        currentTime
      );
      const item = items[items.length - 1];
      const node = ref.current?.getElementsByClassName('item').item(item.globalIdx);
      console.log(node);
      if (node) {
        const child = getChild(node);
        window
          .getSelection()
          ?.setPosition(
            child,
            (nodeLength(child) * (currentTime - item.absoluteStart)) / item.length
          );
      }
    }
  };

  const keyDownHandler: KeyboardEventHandler = (e) => {
    const documentSelection = (store.getState() as RootState).editor.present?.selection;
    const currentTime = (store.getState() as RootState).editor.present?.currentTime;

    let selectLeft = false;
    if (e.key === 'Backspace') {
      if (documentSelection) {
        dispatch(deleteSelection());
      } else {
        setCaretToCurrentTime();
        const range = window.getSelection()?.getRangeAt(0);
        if (
          currentTime &&
          range &&
          isLastItemInParagraph(range.startContainer, range.startOffset)
        ) {
          dispatch(deleteParagraphBreak());
        } else {
          selectLeft = true;
        }
      }
    }

    if (e.key.includes('Arrow') || selectLeft) {
      e.preventDefault();
      if (e.key == 'ArrowLeft' || e.key == 'ArrowRight' || selectLeft) {
        if (!documentSelection) setCaretToCurrentTime();

        const selection = window.getSelection();
        if (!selection || !selection.focusNode) return;

        // this is a fix to allow crossing paragraphs (otherwise the speaker names are in the way)
        let delta = null;
        if (
          isLastItemInParagraph(selection.focusNode, selection.focusOffset) &&
          selection.focusOffset != 0 &&
          e.key == 'ArrowRight'
        ) {
          delta = +4 * EPSILON;
        } else if (
          isFirstItemInParagraph(selection.focusNode, selection.focusOffset) &&
          e.key != 'ArrowRight'
        ) {
          delta = -4 * EPSILON;
        }

        if (delta) {
          assertSome(currentTime);
          if (documentSelection == null) {
            dispatch(setTime(currentTime + delta));
          } else if (documentSelection.ltr) {
            dispatch(
              setSelection({ ...documentSelection, length: documentSelection.length + delta })
            );
          } else {
            dispatch(
              setSelection({ ...documentSelection, start: documentSelection.start + delta })
            );
          }
        } else {
          selection.modify(
            e.shiftKey || selectLeft ? 'extend' : 'move',
            e.key == 'ArrowRight' ? 'right' : 'left',
            'word'
          );
          setBrowserRangeToStateRange(selection.getRangeAt(0), !isSelectionLeftToRight(selection));
        }
      }
    }
  };

  return (
    <DocumentContainer
      ref={ref}
      displaySpeakerNames={displaySpeakerNames}
      onMouseDown={mouseDownHandler}
      onMouseMove={mouseMoveHandler}
      onClick={clickHandler}
      tabIndex={-1}
      onKeyDown={keyDownHandler}
      id={'document-container'}
    >
      <Cursor />
      <SelectionMenu documentRef={ref} />
      <FileNameDisplay path={fileName} />
      <SelectionApply documentRef={ref} />

      {content.length > 0 ? (
        content.map((p, i) => {
          const speakerColor = theme.speakers[speakerIndices[p.speaker]];
          return (
            <Paragraph
              key={i}
              speaker={p.speaker}
              content={p.content}
              paragraphIdx={i}
              color={displaySpeakerNames ? speakerColor : theme.fg}
            />
          );
        })
      ) : (
        <Paragraph
          key={0}
          speaker=""
          content={[{ type: 'artificial_silence', absoluteStart: 0, length: 0 }]}
          paragraphIdx={0}
          color={theme.fg}
        />
      )}
    </DocumentContainer>
  );
}

function SelectionApply({ documentRef }: { documentRef: RefObject<HTMLDivElement> }): JSX.Element {
  const selection = useSelector((state: RootState) => state.editor.present?.selection);
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
      return {
        node: child,
        offset: ((time - item.absoluteStart) / item.length) * nodeLength(child),
      };
    };

    if (selection) {
      const start = nodeFromTime(selection.start, true);
      const end = nodeFromTime(selection.start + selection.length, true);
      if (start && end) {
        if (selection.ltr) {
          window.getSelection()?.setBaseAndExtent(start.node, start.offset, end.node, end.offset);
        } else {
          window.getSelection()?.setBaseAndExtent(end.node, end.offset, start.node, start.offset);
        }
      }
    } else {
      window.getSelection()?.removeAllRanges();
    }
  }, [selection?.start, selection?.length, selection?.ltr, documentRef.current]);
  return <></>;
}

function FileNameDisplay({ path }: { path: string }) {
  const extension = extname(path);
  const base = basename(path, extension);

  return (
    <Title style={{ userSelect: 'none' }}>
      {base}
      <span style={{ fontWeight: 'lighter' }}>{extension}</span>
    </Title>
  );
}
