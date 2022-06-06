import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../state';
import { TitleBar, TitleBarGroup, TitleBarSection } from '../../components/TitleBar';
import { ActionCreators } from 'redux-undo';
import {
  ExportIcon,
  FilmIcon,
  FloppyDiskIcon,
  IconButton,
  IconButtonProps,
  Pane,
  PersonIcon,
  RedoIcon,
  Tooltip,
  UndoIcon,
  Text,
  PlayIcon,
  PauseIcon,
  majorScale,
  PaneProps,
  Button,
} from 'evergreen-ui';
import { ForwardedRef } from 'react';
import {
  setExportPopup,
  toggleDisplaySpeakerNames,
  toggleDisplayVideo,
} from '../../state/editor/display';
import { saveDocument } from '../../state/editor/io';
import { setPlay } from '../../state/editor/play';
import { useTheme } from '../../components/theme';
import { Circle } from 'rc-progress';
import { currentCursorTime, memoizedParagraphItems } from '../../state/editor/selectors';

function ProgressButton({
  progress,
  disabled,
  tooltip = '',
}: {
  progress: number;
  disabled: boolean;
  tooltip?: string;
}) {
  if (tooltip == null) {
    tooltip = `${Math.round(progress * 100)}%`;
  }
  return (
    <Tooltip content={tooltip}>
      <Button padding={0} appearance={'minimal'} disabled={disabled}>
        <Circle
          style={{ height: majorScale(3) }}
          percent={progress * 100}
          strokeWidth={50}
          trailWidth={0}
          strokeLinecap={'butt'}
        />
      </Button>
    </Tooltip>
  );
}
export function EditorTitleBar(): JSX.Element {
  const dispatch = useDispatch();
  const displaySpeakerNames =
    useSelector(
      (state: RootState) => state.editor.present?.document.metadata.display_speaker_names
    ) || false;
  const displayVideo =
    useSelector((state: RootState) => state.editor.present?.document.metadata.display_video) ||
    false;
  const canUndo = useSelector((state: RootState) => state.editor.past.length > 0);
  const canRedo = useSelector((state: RootState) => state.editor.future.length > 0);
  const canSave = useSelector(
    (state: RootState) => state.editor.present?.document != state.editor.present?.lastSavedDocument
  );

  const canExport = useSelector(
    (state: RootState) =>
      state.editor.present?.document.content != undefined &&
      memoizedParagraphItems(state.editor.present?.document.content).length > 0
  );

  const exportState = useSelector(
    (state: RootState) => state.editor.present?.exportState || { running: false, progress: 0 }
  );
  const exportDisabled = exportState.running || !canExport;
  return (
    <TitleBar>
      <TitleBarSection>
        <TitleBarGroup>
          <Tooltip content={'undo'}>
            <TitleBarButton
              disabled={!canUndo}
              icon={UndoIcon}
              onClick={() => dispatch(ActionCreators.undo())}
            />
          </Tooltip>
          <Tooltip content={'redo'}>
            <TitleBarButton
              icon={RedoIcon}
              disabled={!canRedo}
              onClick={() => dispatch(ActionCreators.redo())}
            />
          </Tooltip>
        </TitleBarGroup>
        <TitleBarGroup>
          <Tooltip content={displaySpeakerNames ? 'hide speaker names' : 'display speaker names'}>
            <TitleBarButton
              icon={PersonIcon}
              isActive={displaySpeakerNames}
              onClick={() => dispatch(toggleDisplaySpeakerNames())}
            />
          </Tooltip>
          <Tooltip content={displayVideo ? 'hide video' : 'display video'}>
            <TitleBarButton
              icon={FilmIcon}
              isActive={displayVideo}
              onClick={() => dispatch(toggleDisplayVideo())}
            />
          </Tooltip>
        </TitleBarGroup>
      </TitleBarSection>

      <PlayerControls id={'player-controls' /* for joyride */} />

      <TitleBarSection>
        <TitleBarGroup>
          <Tooltip content={'save document'}>
            <TitleBarButton
              icon={FloppyDiskIcon}
              disabled={!canSave}
              onClick={() => dispatch(saveDocument(false))}
            />
          </Tooltip>
          {exportState.running ? (
            <ProgressButton progress={exportState.progress} disabled={exportDisabled} />
          ) : (
            <Tooltip content={'export document'}>
              <TitleBarButton
                id={'export'}
                icon={ExportIcon}
                disabled={exportDisabled}
                onClick={() => dispatch(setExportPopup('document'))}
              />
            </Tooltip>
          )}
        </TitleBarGroup>
      </TitleBarSection>
    </TitleBar>
  );
}

const TitleBarButton = React.forwardRef(function titleBarButton(
  props: IconButtonProps,
  ref: ForwardedRef<HTMLButtonElement>
) {
  return <IconButton ref={ref} borderRadius={8} appearance={'minimal'} iconSize={16} {...props} />;
});

function PlayerControls(props: PaneProps) {
  const time = useSelector((state: RootState) =>
    state.editor.present ? currentCursorTime(state.editor.present) : 0
  );
  const formatInt = (x: number) => {
    const str = Math.floor(x).toString();
    return (str.length == 1 ? '0' + str : str).substr(0, 2);
  };
  const playing = useSelector((state: RootState) => state.editor.present?.playing);
  const dispatch = useDispatch();

  const theme = useTheme();

  return (
    <Pane
      borderRadius={8}
      border={'default'}
      height={30}
      width={200}
      display={'flex'}
      flexDirection={'row'}
      alignItems={'center'}
      justifyContent={'center'}
      style={{ WebkitAppRegion: 'no-drag' }}
      {...props}
    >
      <Text marginRight={majorScale(2)} style={{ fontVariantNumeric: 'tabular-nums' }} size={500}>
        {formatInt(time / 60)}:{formatInt(time % 60)}:{formatInt((time * 100) % 100)}
      </Text>
      <PlayIcon
        color={playing ? theme.colors.playAccent : 'default'}
        onClick={() => dispatch(setPlay(true))}
        size={19}
      />
      <PauseIcon
        color={playing ? 'default' : theme.colors.playAccent}
        onClick={() => dispatch(setPlay(false))}
        size={19}
      />
    </Pane>
  );
}
