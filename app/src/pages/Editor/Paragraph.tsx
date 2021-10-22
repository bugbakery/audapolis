import styled from 'styled-components';
import * as React from 'react';
import { DetailedHTMLProps, HTMLAttributes, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setWord, reassignParagraph, renameSpeaker } from '../../state/editor';
import { Paragraph as ParagraphType, TimedParagraphItem } from '../../core/document';
import { Button, Popup } from '../../components/Controls';
import { assertSome } from '../../util';

const ParagraphContainer = styled.div``;
const LongSilenceSpan = styled.span`
  font-family: 'quarter_rest';
`;

function LongSilence(props: HTMLAttributes<HTMLSpanElement>): JSX.Element {
  return (
    <LongSilenceSpan className={'item'} {...props}>
      {' _'}
    </LongSilenceSpan>
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

const SpeakerPopupButton = styled(Button)`
  border: none;
  display: block;
  padding: 10px;
  width: 100%;
  margin: 0;
  &:hover {
    background: ${({ theme }) => theme.fg.alpha(0.3).toString()};
  }
`;

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
const SpeakerLabel = styled.div`
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  user-select: none;
`;
function Speaker({
  name,
  paragraphIdx,
  ...props
}: HTMLAttributes<HTMLDivElement> & { name: string; paragraphIdx: number }): JSX.Element {
  const [editing, setEditing] = useState(null as SpeakerEditing);
  const dispatch = useDispatch();

  if (!editing) {
    return (
      <div {...props}>
        <Popup
          trigger={() => <SpeakerLabel>{name}</SpeakerLabel>}
          position={['right center', 'bottom center', 'top center']}
          on={['click']}
        >
          <SpeakerPopupButton
            onClick={() => setEditing({ isNew: true, type: EditingType.Rename, currentText: name })}
          >
            Rename Speaker
          </SpeakerPopupButton>
          <SpeakerPopupButton
            onClick={() =>
              setEditing({ isNew: true, type: EditingType.Reassign, currentText: name })
            }
          >
            Reassign Speaker
          </SpeakerPopupButton>
        </Popup>
      </div>
    );
  } else {
    return (
      <div {...props}>
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
      </div>
    );
  }
}

export function Paragraph({
  speaker,
  content,
  paragraphIdx,
  color,
}: ParagraphType<TimedParagraphItem> & { paragraphIdx: number; color: string }): JSX.Element {
  const dispatch = useDispatch();

  return (
    <>
      <Speaker name={speaker} paragraphIdx={paragraphIdx} style={{ color: color }} />
      <ParagraphContainer style={{ color: color }}>
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
      </ParagraphContainer>
    </>
  );
}
