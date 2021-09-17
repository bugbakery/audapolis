import * as React from 'react';
import { useSelector } from 'react-redux';
import { TitleBar } from './TitleBar';
import { AppContainer, MainCenterColumn } from './Util';
import { RootState } from '../state';
import styled from 'styled-components';
import { Line } from 'rc-progress';
const FormRow = styled.div`
  display: flex;
  flex-direction: row;
  padding: 10px;
  font-size: 18px;
`;
const Progress = styled(Line)`
  width: 80%;
`;
export function TranscribingPage(): JSX.Element {
  const file = useSelector((state: RootState) => state.transcribe.file) || '';
  const progress =
    useSelector((state: RootState) => state.transcribe.processed / state.transcribe.total) || 0;
  const server_state = useSelector((state: RootState) => state.transcribe.state) || '';

  return (
    <AppContainer>
      <TitleBar />
      <MainCenterColumn>
        <FormRow>
          <p style={{ opacity: 0.5 }}>Transcribing</p>&nbsp;
          <p> {file.split('/').pop()}</p>
        </FormRow>
        <Progress percent={progress * 100} />
        <FormRow>
          <p>{(progress * 100).toFixed(0)}&nbsp;%&nbsp;-&nbsp;</p>
          <p style={{ opacity: 0.5 }}>{server_state}</p>
        </FormRow>
      </MainCenterColumn>
    </AppContainer>
  );
}
