import * as React from 'react';
import { Button, IconButton } from './Controls';
import { useDispatch } from 'react-redux';
import { transcribeFile } from '../state/transcribe';
import { TitleBar } from './TitleBar';
import { AppContainer, MainCenterColumn } from './Util';
import { openDocumentFromDisk } from '../state/editor';
import styled from 'styled-components';
import { MdSettings } from 'react-icons/md';
import { openSettings } from '../state/nav';

const SettingsButton = styled(IconButton).attrs({ icon: MdSettings })`
  position: absolute;
  bottom: 0;
  right: 0;
  margin: 10px;
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
        <Button>New Blank Document</Button>
      </MainCenterColumn>
      <SettingsButton onClick={() => dispatch(openSettings())}>
        <MdSettings />
      </SettingsButton>
    </AppContainer>
  );
}
