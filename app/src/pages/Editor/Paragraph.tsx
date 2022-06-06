import * as React from 'react';
import { HTMLAttributes, HTMLProps, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  V3Paragraph as ParagraphType,
  TimedItemExtension,
  V3TimedParagraphItem,
} from '../../core/document';
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
import { reassignParagraph, renameSpeaker } from '../../state/editor/edit';
import { RootState } from '../../state';
import { useTheme } from '../../components/theme';
import { Selection } from '../../state/editor/types';
import {
  abortTranscriptCorrection,
  finishTranscriptCorrection,
  setTranscriptCorrectionText,
} from '../../state/editor/transcript_correction';
import { assertSome } from '../../util';

export function Paragraph({
  data,
  color,
  displaySpeakerNames,
  paraBreakIdx,
  editingRange,
}: {
  data: ParagraphType & TimedItemExtension;
  color: string;
  displaySpeakerNames: boolean;
  paraBreakIdx: number;
  editingRange: Selection | null;
}): JSX.Element {
  const theme = useTheme();

  const displayConfidence = useSelector(
    (state: RootState) => state.editor.present?.displayConfidence || false
  );

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
      {data.absoluteIndex == 0 ? <span key={data.content.length} id={`item-0`} /> : <></>}
      <Pane color={displaySpeakerNames ? color : theme.colors.default} transition={'color 0.5s'}>
        {data.content.map((item, i) => {
          const commonProps = {
            key: i,
            id: `item-${item.absoluteIndex}`,
          };
          if (editingRange && editingRange.startIndex == item.absoluteIndex) {
            return <TranscriptCorrectionEntry {...commonProps} />;
          } else if (
            editingRange &&
            editingRange.startIndex <= item.absoluteIndex &&
            editingRange.startIndex + editingRange.length > item.absoluteIndex
          ) {
            return; // we are handling the rendering in the first element
          } else {
            const preserve = i == 0 || i == data.content.length - 1;
            return renderParagraphItem(item, displayConfidence, commonProps, preserve);
          }
        })}
        <ParagraphSign
          key={data.content.length}
          id={`item-${paraBreakIdx}`}
          data={data}
          paraBreakIdx={paraBreakIdx}
        />
      </Pane>
    </Pane>
  );
}

function renderParagraphItem(
  item: V3TimedParagraphItem,
  displayConfidence: boolean,
  commonProps: HTMLProps<HTMLSpanElement>,
  preserve: boolean
): JSX.Element {
  if (item.type == 'text') {
    if (displayConfidence) {
      return (
        <span {...commonProps}>
          {' '}
          <span
            style={{
              backgroundColor: `rgba(255, 0, 0, ${1 - item.conf})`,
            }}
          >
            {item.text}
          </span>
        </span>
      );
    } else {
      return <span {...commonProps}>{' ' + item.text}</span>;
    }
  } else if (item.type == 'non_text' || item.type == 'artificial_silence') {
    if (item.length > 0.4) {
      return (
        <span style={{ fontFamily: 'quarter_rest' }} {...commonProps}>
          {' _'}
        </span>
      );
    } else {
      return (
        <span
          style={{
            ...(preserve && { whiteSpace: 'pre' }),
          }}
          {...commonProps}
        >
          {' '}
        </span>
      );
    }
  } else {
    throw Error(`unknown paragraph-item '${item}'`);
  }
}

function TranscriptCorrectionEntry(props: HTMLProps<HTMLSpanElement>): JSX.Element {
  const editingState = useSelector(
    (state: RootState) => state.editor.present?.transcriptCorrectionState
  );
  const dispatch = useDispatch();
  const focusDocument = () => {
    const el = document.getElementById('document');
    el?.focus();
  };

  return (
    <span {...props}>
      {' '}
      <span
        tabIndex={0}
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key == 'Enter') {
            dispatch(setTranscriptCorrectionText(e.currentTarget.innerHTML));
            dispatch(finishTranscriptCorrection());
            focusDocument();
            e.preventDefault();
          } else if (e.key == 'Escape') {
            dispatch(abortTranscriptCorrection());
            e.preventDefault();
            focusDocument();
          }

          e.stopPropagation();
        }}
        contentEditable={true}
        suppressContentEditableWarning={true}
        onBlur={() => {
          dispatch(abortTranscriptCorrection());
          focusDocument();
        }}
        ref={(ref) => {
          if (ref)
            setTimeout(() => {
              const range = document.createRange();
              range.selectNodeContents(ref);
              const sel = window.getSelection();
              assertSome(sel);
              sel.removeAllRanges();
              sel.addRange(range);
              ref?.focus();
            });
        }}
      >
        {editingState}
      </span>
    </span>
  );
}

function ParagraphSign({
  paraBreakIdx,
  data,
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  paraBreakIdx: number;
  data: ParagraphType & TimedItemExtension;
}): JSX.Element {
  const theme = useTheme();
  const selection = useSelector((state: RootState) => state.editor.present?.selection);
  const showParSign =
    data.content.length == 0 ||
    (selection !== null &&
      selection !== undefined &&
      selection.startIndex <= paraBreakIdx &&
      selection.startIndex + selection.length > paraBreakIdx);
  return (
    <span style={{ color: theme.colors.muted }} {...props}>
      {showParSign ? ' ¶' : ''}
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

const EditingStartButton = ({
  type,
  bottom,
  setEditing,
  name,
  ...props
}: {
  setEditing: (next: SpeakerEditing) => void;
  name: string;
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
              <EditingStartButton
                type={EditingType.Rename}
                setEditing={setEditing}
                name={name || ''}
              >
                Rename Speaker
              </EditingStartButton>
              <EditingStartButton
                type={EditingType.Reassign}
                setEditing={setEditing}
                name={name || ''}
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
            {name || 'click to set speaker'}
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
          value={editing.currentText}
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
