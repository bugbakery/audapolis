import * as React from 'react';
import { Button } from './Controls';
import { useDispatch } from 'react-redux';
import { transcribeFile } from '../state/transcribe';
import { TitleBar } from './TitleBar';
import { AppContainer, CenterColumn } from './Util';
import { openDocumentFromDisk } from '../state/editor';

export function LandingPage(): JSX.Element {
  const dispatch = useDispatch();

  return (
    <AppContainer>
      <TitleBar />
      <CenterColumn>
        <Button primary onClick={() => dispatch(transcribeFile())}>
          Import & Transcribe
        </Button>
        <Button primary onClick={() => dispatch(openDocumentFromDisk())}>
          Open Existing
        </Button>
        <Button>New Blank Document</Button>
      </CenterColumn>
    </AppContainer>
  );
}
