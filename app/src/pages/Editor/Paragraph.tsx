import styled, { css } from 'styled-components';
import quarterRest from '../../resources/quarter_rest.svg';
import * as React from 'react';
import { HTMLAttributes, MouseEventHandler } from 'react';
import { ParagraphGeneric, TimedParagraphItem } from '../../core/document';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../state';
import {
  mouseSelectionEnd,
  mouseSelectionOver,
  mouseSelectionStart,
  setTime,
  play,
  pause,
} from '../../state/editor';

const ParagraphContainer = styled.div`
  user-select: none;
`;
const SpeakerContainer = styled.div`
  text-overflow: ellipsis;
  white-space: nowrap;
`;
const LongSilenceSpan = styled.span<{ selected: boolean }>`
  padding: 0 8px;
  color: transparent;
  background: center / auto 80% no-repeat url(${quarterRest});
  ${(props) =>
    props.selected
      ? css`
          background-color: lightblue;
        `
      : css`
          filter: var(--filter);
        `}
`;

function LongSilence(props: { selected: boolean } & HTMLAttributes<HTMLSpanElement>): JSX.Element {
  return (
    <LongSilenceSpan className={'item'} {...props}>
      {' '}
    </LongSilenceSpan>
  );
}

function ShortSilence(props: { selected: boolean } & HTMLAttributes<HTMLSpanElement>): JSX.Element {
  return (
    <span
      className={'item'}
      style={props.selected ? { backgroundColor: 'lightblue' } : {}}
      {...props}
    >
      {' '}
    </span>
  );
}

const Word = styled.span<{ selected: boolean }>`
  ${(props) =>
    props.selected &&
    css`
      background-color: lightblue;
      color: black;
    `}
`;

export function Paragraph({ speaker, content }: ParagraphGeneric<TimedParagraphItem>): JSX.Element {
  const playing = useSelector((state: RootState) => state.editor.present?.playing) || false;
  const selection = useSelector((state: RootState) => state.editor.present?.selection);
  const dispatch = useDispatch();
  const isSelected = (item: TimedParagraphItem) => {
    if (!selection) {
      return false;
    } else {
      return (
        item.absoluteStart >= selection.start &&
        item.absoluteStart + item.length <= selection.start + selection.length
      );
    }
  };

  return (
    <>
      <SpeakerContainer>{speaker}</SpeakerContainer>
      <ParagraphContainer>
        {content.map((item, i) => {
          const onClick = async () => {
            await dispatch(pause());
            await dispatch(setTime(item.absoluteStart));
            if (playing) {
              dispatch(play());
            }
          };
          const onMouseDown: MouseEventHandler = (e) => {
            dispatch(mouseSelectionStart(item));
            const listener = () => {
              dispatch(mouseSelectionEnd());
              e.target.removeEventListener('click', listener);
              document.removeEventListener('click', listener);
            };
            e.target.addEventListener('click', listener, { once: true });
            document.addEventListener('click', listener, { once: true });
          };
          const onMouseMove: MouseEventHandler = () => {
            dispatch(mouseSelectionOver(item));
          };
          const commonProps = {
            onClick,
            onMouseDown,
            onMouseMove,
            selected: isSelected(item),
            className: 'item',
            key: i,
          };
          switch (item.type) {
            case 'word':
              return <Word {...commonProps}>{' ' + item.word}</Word>;
            case 'silence':
              if (item.length > 0.4) {
                return <LongSilence {...commonProps} selected={isSelected(item)} />;
              } else {
                return <ShortSilence key={i} onClick={onClick} selected={isSelected(item)} />;
              }
            case 'artificial_silence':
              if (item.length > 0.4) {
                return <LongSilence {...commonProps} selected={isSelected(item)} />;
              } else {
                return <ShortSilence key={i} onClick={onClick} selected={isSelected(item)} />;
              }
          }
        })}
      </ParagraphContainer>
    </>
  );
}
