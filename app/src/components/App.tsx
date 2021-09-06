import * as React from 'react';
import { LandingPage } from './Landing';
import { TitleBar } from './TitleBar';
import styled from 'styled-components';

const AppContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
`;
const MainContainer = styled.div`
  overflow: auto;
  align-self: stretch;
  flex-grow: 1;
  display: flex;
`;

export default function App(): JSX.Element {
  return (
    <AppContainer>
      <TitleBar />
      <MainContainer>
        <LandingPage />
      </MainContainer>
    </AppContainer>
  );
}
