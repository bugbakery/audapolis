import * as React from 'react';
import { AppContainer, MainCenterColumn } from '../../components/Util';
import styled from 'styled-components';
import { EditorTitleBar } from './TitleBar';
import { Document } from './Document';
import { Player } from './Player';

const MainContainer = styled(MainCenterColumn)`
  justify-content: start;
  overflow-y: auto;
  padding-bottom: 200px;
`;
export function EditorPage(): JSX.Element {
  return (
    <AppContainer>
      <EditorTitleBar />

      <MainContainer>
        <Document />
      </MainContainer>

      <Player />
    </AppContainer>
  );
}
