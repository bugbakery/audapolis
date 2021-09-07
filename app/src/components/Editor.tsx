import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TitleBar } from './TitleBar';
import { AppContainer, CenterColumn } from './Util';
import { RootState } from '../state';
import styled from 'styled-components';

export function EditorPage(): JSX.Element {
  return (
    <AppContainer>
      <TitleBar />
      <CenterColumn>
        <Document />
      </CenterColumn>
    </AppContainer>
  );
}

const DocumentContainer = styled.div`
  max-width: 800px;
`;
const Word = styled.span``;
function Document() {
  const transcript = useSelector((state: RootState) => state.editor?.document?.transcript) || [];
  const error = useSelector((state: RootState) => state.editor?.error);
  console.log(error);

  if (error) {
    return <>{error}</>;
  }

  return (
    <DocumentContainer>
      {transcript.map((word, i) => (
        <Word key={i}>{word.word + ' '}</Word>
      ))}
    </DocumentContainer>
  );
}
