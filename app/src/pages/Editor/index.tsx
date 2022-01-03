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
import { Tour } from '../../components/Tour';

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

  const steps = [
    {
      target: '#document',
      content: (
        <p>
          <b>This is the text that was transcribed from your media file.</b>
        </p>
      ),
    },
    {
      target: '#player-controls',
      content: (
        <p>
          Here you can play / pause the current document. For that you can also use the space key.
        </p>
      ),
    },
    {
      target: '#cursor',
      content: (
        <p>
          <b>This is your cursor.</b>
          It is synchronized with the current playback position.
        </p>
      ),
    },
    {
      target: '#document',
      content: (
        <p>
          To move the cursor, you can click on a word or use the arrow keys on your Keyboard. To
          insert a paragraph at the current cursor position, use the return Key. That should make
          your document a lot more manageable.
        </p>
      ),
    },
    {
      target: '#document',
      content: (
        <p>
          You can delete, words from the transcript - and the audio changes accordingly.{' '}
          <b>its like magic 💫.</b> You can also copy & paste text - try it!
        </p>
      ),
    },
    {
      target: '#export',
      content: (
        <p>
          After you are done editing, you can export the whole document to a media file by clicking
          this button.
        </p>
      ),
    },
  ];

  return (
    <AppContainer tabIndex={-1} onKeyDown={handleKeyPress} ref={(ref) => ref?.focus()}>
      <Tour steps={steps} page={'editor'} />
      <EditorTitleBar />
      {popupState ? <ExportDocumentPopup /> : <></>}

      <MainContainer>
        <Document />
      </MainContainer>

      <Player />
    </AppContainer>
  );
}
