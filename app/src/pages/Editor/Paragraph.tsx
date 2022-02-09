import * as React from 'react';
import { DetailedHTMLProps, HTMLAttributes, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Paragraph as ParagraphType, TimedItemExtension } from '../../core/document';
import { assertSome } from '../../util';
import {
  Button,
  majorScale,
  Pane,
  PaneProps,
  Popover,
  Position,
  Text,
  TextInput,
} from 'evergreen-ui';
import { reassignParagraph, renameSpeaker, setWord } from '../../state/editor/edit';
import { RootState } from '../../state';

export function Paragraph({
  data,
  color,
  displaySpeakerNames,
  paraBreakIdx,
}: {
  data: ParagraphType & TimedItemExtension;
  color: string;
  displaySpeakerNames: boolean;
  paraBreakIdx: number;
}): JSX.Element {
  const dispatch = useDispatch();
  const selection = useSelector((state: RootState) => state.editor.present?.selection);
  const showParSign =
    data.content.length == 0 ||
    (selection !== null &&
      selection !== undefined &&
      selection.startIndex <= paraBreakIdx &&
      selection.startIndex + selection.length > paraBreakIdx);
  return (
    <Pane display={'flex'} flexDirection={'row'} marginBottom={majorScale(2)}>
      <Speaker
        name={data.speaker}
        paragraphBreakAbsoluteIndex={data.absoluteIndex}
        color={color.toString()}
        width={displaySpeakerNames ? 150 : 0}
        transition={'width 0.2s'}
        flexShrink={0}
        marginRight={majorScale(1)}
      />
      {data.absoluteIndex == 0 ? (
        <ParagraphSign key={data.content.length} id={`item-0`} shown={false} />
      ) : (
        <></>
      )}
      <Pane color={displaySpeakerNames ? color : 'none'} transition={'color 0.5s'}>
        {data.content.map((item, i) => {
          const commonProps = {
            key: i,
            id: `item-${item.absoluteIndex}`,
          };

          if (item.type == 'word') {
            return (
              <Word
                word={item.word}
                changehandler={(text: string) => {
                  dispatch(setWord({ text, absoluteIndex: item.absoluteIndex }));
                }}
                {...commonProps}
              />
            );
          } else if (item.type == 'silence' || item.type == 'artificial_silence') {
            if (item.length > 0.4) {
              return <LongSilence {...commonProps} />;
            } else {
              return (
                <ShortSilence preserve={i == 0 || i == data.content.length - 1} {...commonProps} />
              );
            }
          }
        })}
        <ParagraphSign key={data.content.length} id={`item-${paraBreakIdx}`} shown={showParSign} />
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

function ParagraphSign({
  shown,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { shown: boolean }): JSX.Element {
  return (
    <span className={'item'} style={{ color: 'gray' }} {...props}>
      {shown ? ' ¶' : ''}
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
  currentText: string | null;
  isNew: boolean;
};

const EditingStartButton = ({
  type,
  bottom,
  setEditing,
  name,
  ...props
}: {
  setEditing: (next: SpeakerEditing) => void;
  name: string | null;
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

function Speaker({
  name,
  paragraphBreakAbsoluteIndex,
  color,
  ...props
}: PaneProps & {
  name: string | null;
  paragraphBreakAbsoluteIndex: number;
}): JSX.Element {
  const [editing, setEditing] = useState(null as SpeakerEditing);
  const dispatch = useDispatch();

  if (!editing) {
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
              <EditingStartButton type={EditingType.Rename} setEditing={setEditing} name={name}>
                Rename Speaker
              </EditingStartButton>
              <EditingStartButton
                type={EditingType.Reassign}
                setEditing={setEditing}
                name={name}
                bottom
              >
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
            onContextMenu={(e: React.MouseEvent<HTMLSpanElement>) =>
              (e.target as HTMLSpanElement).click()
            }
          >
            {name}
          </Text>
        </Popover>
      </Pane>
    );
  } else {
    return (
      <Pane {...props}>
        <TextInput
          width={'100%'}
          placeholder={'Enter speaker name'}
          value={editing.currentText || ''}
          ref={(ref: HTMLInputElement) => {
            if (editing.isNew) {
              ref?.focus();
              ref?.select();
              setEditing({ ...editing, isNew: false });
            }
          }}
          onKeyDown={(e: React.KeyboardEvent) => {
            e.stopPropagation();
            if (e.key == 'Enter') {
              if (editing.type == EditingType.Reassign) {
                dispatch(
                  reassignParagraph({
                    absoluteIndex: paragraphBreakAbsoluteIndex,
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
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
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
