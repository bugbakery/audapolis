import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../state';
import { TitleBar, TitleBarGroup, TitleBarSection } from '../../components/TitleBar';
import { ActionCreators } from 'redux-undo';
import {
  ExportState,
  saveDocument,
  toggleDisplaySpeakerNames,
  play,
  toggleDisplayVideo,
  setExportPopup,
  pause,
} from '../../state/editor';
import { DocumentGenerator } from '../../core/document';
import {
  ExportIcon,
  FilmIcon,
  FloppyDiskIcon,
  IconButton,
  IconButtonProps,
  Pane,
  PersonIcon,
  RedoIcon,
  TimeIcon,
  Tooltip,
  UndoIcon,
  Text,
  PlayIcon,
  PauseIcon,
  majorScale,
  PaneProps,
  useTheme,
} from 'evergreen-ui';
import { ForwardedRef } from 'react';

export function EditorTitleBar(): JSX.Element {
  const dispatch = useDispatch();
  const displaySpeakerNames =
    useSelector((state: RootState) => state.editor.present?.displaySpeakerNames) || false;
  const displayVideo =
    useSelector((state: RootState) => state.editor.present?.displayVideo) || false;
  const canUndo = useSelector((state: RootState) => state.editor.past.length > 0);
  const canRedo = useSelector((state: RootState) => state.editor.future.length > 0);
  const canSave = useSelector(
    (state: RootState) => state.editor.present?.document != state.editor.present?.lastSavedDocument
  );

  const canExport = useSelector(
    (state: RootState) =>
      state.editor.present?.document.content != undefined &&
      !DocumentGenerator.fromParagraphs(state.editor.present?.document.content).next().done
  );

  const exportRunning = useSelector(
    (state: RootState) => state.editor.present?.exportState == ExportState.Running
  );

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

          <Tooltip content={'export document'}>
            {/* TODO: add circular progressbar here */}
            <TitleBarButton
              icon={exportRunning ? TimeIcon : ExportIcon}
              disabled={exportRunning && canExport}
              onClick={() => dispatch(setExportPopup(true))}
            />
          </Tooltip>
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
  const time = useSelector((state: RootState) => state.editor.present?.currentTime) || 0;
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
        onClick={() => dispatch(play())}
        size={19}
      />
      <PauseIcon
        color={playing ? 'default' : theme.colors.playAccent}
        onClick={() => dispatch(pause())}
        size={19}
      />
    </Pane>
  );
}
