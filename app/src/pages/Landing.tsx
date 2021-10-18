import * as React from 'react';
import { Button, IconButton } from '../components/Controls';
import { useDispatch } from 'react-redux';
import { transcribeFile } from '../state/transcribe';
import { TitleBar } from '../components/TitleBar';
import { AppContainer, MainCenterColumn } from '../components/Util';
import styled from 'styled-components';
import { MdSettings } from 'react-icons/md';
import { openAbout, openModelManager } from '../state/nav';
import { openDocumentFromDisk, openDocumentFromMemory } from '../state/editor';

const BottomRightContainer = styled.div`
  position: absolute;
  bottom: 0;
  right: 0;
  margin: 10px;
  & > * {
    margin: 5px;
  }
`;
export function LandingPage(): JSX.Element {
  const dispatch = useDispatch();

  return (
    <AppContainer>
      <TitleBar />
      <MainCenterColumn>
        <Button primary onClick={() => dispatch(transcribeFile())}>
          Import & Transcribe
        </Button>
        <Button primary onClick={() => dispatch(openDocumentFromDisk())}>
          Open Existing
        </Button>
        <Button onClick={() => dispatch(openDocumentFromMemory({ sources: {}, content: [] }))}>
          New Blank Document
        </Button>
        <Button primary onClick={() => dispatch(openAbout())}>
          About
        </Button>
      </MainCenterColumn>
      <BottomRightContainer>
        <IconButton
          icon={MdSettings}
          onClick={() => dispatch(openModelManager())}
          text={'manage transcription models'}
        />
      </BottomRightContainer>
    </AppContainer>
  );
}
