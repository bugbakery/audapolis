import styled from 'styled-components';
import * as React from 'react';
import { DetailedHTMLProps, HTMLAttributes, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setWord, reassignParagraph, renameSpeaker } from '../../state/editor';
import { Paragraph as ParagraphType, TimedParagraphItem } from '../../core/document';
import { assertSome } from '../../util';
import { Button, majorScale, Pane, PaneProps, Popover, Position, Text } from 'evergreen-ui';

export function Paragraph({
  speaker,
  content,
  paragraphIdx,
  color,
  displaySpeakerNames,
}: ParagraphType<TimedParagraphItem> & {
  paragraphIdx: number;
  color: string;
  displaySpeakerNames: boolean;
}): JSX.Element {
  const dispatch = useDispatch();

  return (
    <Pane display={'flex'} flexDirection={'row'} marginBottom={majorScale(2)}>
      <Speaker
        name={speaker}
        paragraphIdx={paragraphIdx}
        color={color.toString()}
        width={displaySpeakerNames ? 150 : 0}
        transition={'width 0.2s'}
        flexShrink={0}
        marginRight={majorScale(1)}
      />
      <Pane color={displaySpeakerNames ? color : 'none'} transition={'color 0.5s'}>
        {content.map((item, i) => {
          const commonProps = {
            key: i,
            'data-item': `${paragraphIdx}-${i}`,
          };

          if (item.type == 'word') {
            return (
              <Word
                word={item.word}
                changehandler={(text: string) => {
                  dispatch(setWord({ text, absoluteStart: item.absoluteStart }));
                }}
                {...commonProps}
              />
            );
          } else if (item.type == 'silence' || item.type == 'artificial_silence') {
            if (item.length > 0.4) {
              return <LongSilence {...commonProps} />;
            } else {
              return <ShortSilence preserve={i == 0 || i == content.length - 1} {...commonProps} />;
            }
          }
        })}
      </Pane>
    </Pane>
  );
}

function LongSilence(props: HTMLAttributes<HTMLSpanElement>): JSX.Element {
  return (
    <span style={{ fontFamily: 'quarter_rest' }} className={'item'} {...props}>
      {' _'}
    </span>
  );
}

function ShortSilence({
  preserve,
  ...props
}: { preserve: boolean } & HTMLAttributes<HTMLSpanElement>): JSX.Element {
  return (
    <span
      className={'item'}
      style={{
        ...(preserve && { whiteSpace: 'pre' }),
      }}
      {...props}
    >
      {' '}
    </span>
  );
}

export function Word({
  word,
  changehandler,
  ...props
}: DetailedHTMLProps<HTMLAttributes<HTMLSpanElement>, HTMLSpanElement> & {
  word: string;
  changehandler: (x: string) => void;
}): JSX.Element {
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  const startEditing = () => {
    console.log('ref current', ref.current);
    setEditing(true);
    const range = document.createRange();
    assertSome(ref.current);
    range.selectNodeContents(ref.current);
    const sel = window.getSelection();
    assertSome(sel);
    sel.removeAllRanges();
    sel.addRange(range);
    setTimeout(function () {
      ref.current?.focus();
    }, 0);
  };

  const stopEditing = () => {
    setEditing(false);
    const text = ref.current?.innerText;
    assertSome(text);
    if (text != word) {
      changehandler(text);
    }
  };
  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    if (editing) {
      stopEditing();
    } else {
      startEditing();
    }
  };
  const editableProps = editing
    ? {
        onKeyDown: (e: React.KeyboardEvent) => {
          e.stopPropagation();
          if (e.key == 'Enter') {
            stopEditing();
          }
        },
        contentEditable: editing,
        suppressContentEditableWarning: true,
        onBlur: () => {
          stopEditing();
        },
      }
    : {};

  return (
    <span
      {...props}
      {...editableProps}
      ref={ref}
      onContextMenu={handleContextMenu}
      className={'item'}
    >
      {' ' + word}
    </span>
  );
}

enum EditingType {
  Reassign,
  Rename,
}
type SpeakerEditing = null | {
  type: EditingType;
  currentText: string;
  isNew: boolean;
};

const SpeakerInput = styled.input`
  width: 100%;
  font-size: inherit;
`;

function Speaker({
  name,
  paragraphIdx,
  color,
  ...props
}: PaneProps & {
  name: string;
  paragraphIdx: number;
}): JSX.Element {
  const [editing, setEditing] = useState(null as SpeakerEditing);
  const dispatch = useDispatch();

  if (!editing) {
    const EditingStartButton = ({
      type,
      bottom,
      ...props
    }: {
      type: EditingType;
      children: string;
      bottom?: boolean;
    }) => (
      <Button
        {...props}
        onClick={() => setEditing({ isNew: true, type, currentText: name })}
        display={'block'}
        margin={majorScale(1)}
        marginBottom={bottom ? majorScale(1) : 0}
      />
    );

    return (
      <Pane
        {...props}
        textOverflow={'ellipsis'}
        overflow={'hidden'}
        whiteSpace={'nowrap'}
        userSelect={'none'}
      >
        <Popover
          position={Position.RIGHT}
          content={
            <Pane display={'flex'} flexDirection={'column'}>
              <EditingStartButton type={EditingType.Rename}>Rename Speaker</EditingStartButton>
              <EditingStartButton type={EditingType.Reassign} bottom>
                Reassign Speaker
              </EditingStartButton>
            </Pane>
          }
        >
          <Text
            maxWidth={props.width}
            paddingRight={majorScale(2)}
            display={'inline-block'}
            color={color}
          >
            {name}
          </Text>
        </Popover>
      </Pane>
    );
  } else {
    return (
      <Pane {...props}>
        <SpeakerInput
          value={editing.currentText}
          ref={(ref) => {
            if (editing.isNew) {
              ref?.focus();
              ref?.select();
              setEditing({ ...editing, isNew: false });
            }
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key == 'Enter') {
              if (editing.type == EditingType.Reassign) {
                dispatch(
                  reassignParagraph({
                    paragraphIdx: paragraphIdx,
                    newSpeaker: editing.currentText,
                  })
                );
              } else if (editing.type == EditingType.Rename) {
                dispatch(renameSpeaker({ oldName: name, newName: editing.currentText }));
              }
              setEditing(null);
            } else if (e.key == 'Escape') {
              setEditing(null);
            }
          }}
          onChange={(e) => {
            setEditing({ ...editing, currentText: e.target.value });
          }}
          onBlur={() => {
            setEditing(null);
          }}
        />
      </Pane>
    );
  }
}
