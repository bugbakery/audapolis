import * as React from 'react';
import { AppContainer, MainCenterColumn } from '../../components/Util';
import styled from 'styled-components';
import { EditorTitleBar } from './TitleBar';
import { Document } from './Document';
import { Player } from './Player';
import { KeyboardEventHandler } from 'react';
import { insertParagraphBreak, togglePlaying } from '../../state/editor';
import { useDispatch, useSelector } from 'react-redux';
import { ExportDocumentPopup } from './ExportDocumentPopup';
import { RootState } from '../../state';
import { EditorTour } from '../../tour/EditorTour';

const MainContainer = styled(MainCenterColumn)`
  justify-content: start;
  overflow-y: auto !important;

  &:focus {
    outline: none;
  }
`;
export function EditorPage(): JSX.Element {
  const dispatch = useDispatch();
  const popupState = useSelector((state: RootState) => state.editor.present?.exportPopup);

  const handleKeyPress: KeyboardEventHandler = (e) => {
    if (e.key === ' ') {
      dispatch(togglePlaying());
      e.preventDefault();
    } else if (e.key === 'Enter') {
      dispatch(insertParagraphBreak());
    }
  };

  return (
    <AppContainer tabIndex={-1} onKeyDown={handleKeyPress} ref={(ref) => ref?.focus()}>
      <EditorTour />
      <Player />

      <EditorTitleBar />
      {popupState ? <ExportDocumentPopup /> : <></>}

      <MainContainer>
        <Document />
      </MainContainer>
    </AppContainer>
  );
}
