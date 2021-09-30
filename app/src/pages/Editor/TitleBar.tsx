import styled from 'styled-components';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../state';
import { FaPause, FaPlay } from 'react-icons/fa';
import {
  TitleBar,
  TitleBarButton,
  TitleBarGroup,
  TitleBarSection,
} from '../../components/TitleBar';
import { ActionCreators } from 'redux-undo';
import { MdPerson, MdRedo, MdSave, MdShare, MdUndo, MdWatchLater } from 'react-icons/md';
import {
  exportDocument,
  ExportState,
  saveDocument,
  toggleDisplaySpeakerNames,
  play,
  pause,
} from '../../state/editor';
import { DocumentGenerator } from '../../core/document';

export function EditorTitleBar(): JSX.Element {
  const dispatch = useDispatch();
  const displaySpeakerNames =
    useSelector((state: RootState) => state.editor.present?.displaySpeakerNames) || false;
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
          <TitleBarButton
            onClick={() => dispatch(ActionCreators.undo())}
            active={canUndo}
            icon={MdUndo}
          />
          <TitleBarButton
            onClick={() => dispatch(ActionCreators.redo())}
            active={canRedo}
            icon={MdRedo}
          />
        </TitleBarGroup>
        <TitleBarButton
          clicked={displaySpeakerNames}
          onClick={() => dispatch(toggleDisplaySpeakerNames())}
          icon={MdPerson}
        />
      </TitleBarSection>

      <PlayerControls />

      <TitleBarSection>
        <TitleBarButton onClick={() => dispatch(saveDocument())} active={canSave} icon={MdSave} />
        <TitleBarButton
          onClick={() => dispatch(exportDocument())}
          active={!exportRunning && canExport}
          icon={exportRunning ? MdWatchLater : MdShare}
        />
      </TitleBarSection>
    </TitleBar>
  );
}

const PlayerControlsContainer = styled.div`
  background-color: var(--bg-color);
  box-shadow: inset 0 0 3px var(--fg-color-mild);
  border-radius: 20px;
  height: 30px;
  width: 200px;
  font-size: 18px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  -webkit-app-region: no-drag;

  & > div {
    padding-right: 30px;
  }

  & > svg {
    height: 75%;
    width: auto;
    padding: 3px;
  }
`;

function PlayerControls(props: React.HTMLAttributes<HTMLDivElement>) {
  const time = useSelector((state: RootState) => state.editor.present?.currentTime) || 0;
  const formatInt = (x: number) => {
    const str = Math.floor(x).toString();
    return (str.length == 1 ? '0' + str : str).substr(0, 2);
  };
  const playing = useSelector((state: RootState) => state.editor.present?.playing);
  const dispatch = useDispatch();

  return (
    <PlayerControlsContainer {...props}>
      <div>
        {formatInt(time / 60)}:{formatInt(time % 60)}:{formatInt((time * 100) % 100)}
      </div>
      <FaPlay
        color={playing ? 'var(--accent)' : 'var(--fg-color)'}
        onClick={() => dispatch(play())}
      />
      <FaPause
        color={playing ? 'var(--fg-color)' : 'var(--accent)'}
        onClick={() => dispatch(pause())}
      />
    </PlayerControlsContainer>
  );
}
