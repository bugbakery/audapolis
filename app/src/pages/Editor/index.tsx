import * as React from 'react';
import { AppContainer, MainCenterColumn } from '../../components/Util';
import styled from 'styled-components';
import { EditorTitleBar } from './TitleBar';
import { Document } from './Document';

const MainContainer = styled(MainCenterColumn)`
  justify-content: start;
  overflow-y: auto;
`;
export function EditorPage(): JSX.Element {
  return (
    <AppContainer>
      <EditorTitleBar />

      <MainContainer>
        <Document />
      </MainContainer>
    </AppContainer>
  );
}
