import * as React from 'react';
import { Button } from './Controls';
import { useDispatch, useSelector } from 'react-redux';
import { abortTranscription, startTranscription } from '../state/transcribe';
import { TitleBar } from './TitleBar';
import { AppContainer, CenterColumn } from './Util';
import { RootState } from '../state';
import styled from 'styled-components';

const FormRow = styled.div`
  display: flex;
  flex-direction: row;
  padding: 10px;
  font-size: 18px;
`;

export function TranscribePage(): JSX.Element {
  const dispatch = useDispatch();
  const file = useSelector((state: RootState) => state.transcribe.file) || '';

  return (
    <AppContainer>
      <TitleBar />
      <CenterColumn>
        <FormRow>
          <p style={{ opacity: 0.5 }}>opened</p>&nbsp;
          <p> {file.split('/').pop()}</p>
        </FormRow>
        <Button primary onClick={() => dispatch(startTranscription())}>
          Start Transcribing
        </Button>
        <Button onClick={() => dispatch(abortTranscription())}>abort</Button>
      </CenterColumn>
    </AppContainer>
  );
}
