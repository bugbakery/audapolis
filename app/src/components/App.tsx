import * as React from 'react';
import { RootState, store } from '../state';
import { Provider, useSelector } from 'react-redux';
import { Page } from '../state/nav';
import { LandingPage } from '../pages/Landing';
import { TranscribePage } from '../pages/Transcribe';
import { EditorPage } from '../pages/Editor';
import { TranscribingPage } from '../pages/Transcribing';
import { ModelManagerPage } from '../pages/ModelManager';
import styled, { ThemeProvider } from 'styled-components';
import { useMediaPredicate } from 'react-media-hook';
import { darkTheme, lightTheme } from './theme';
import { ServersListPage } from '../pages/ServersList';

const AppContainer = styled.div`
  font-family: 'Roboto', sans-serif;
  background-color: ${({ theme }) => theme.bg};
  color: ${({ theme }) => theme.fg};
  width: 100%;
  height: 100%;
`;
export default function App(): JSX.Element {
  const isDark = useMediaPredicate('(prefers-color-scheme: dark)');
  const theme = isDark ? darkTheme : lightTheme;

  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <AppContainer>
          <CurrentPage />
        </AppContainer>
      </ThemeProvider>
    </Provider>
  );
}

function CurrentPage(): JSX.Element {
  const page = useSelector((state: RootState) => state.nav.page);

  switch (page) {
    case Page.Landing:
      return <LandingPage />;
    case Page.Transcribe:
      return <TranscribePage />;
    case Page.Editor:
      return <EditorPage />;
    case Page.Transcribing:
      return <TranscribingPage />;
    case Page.ServersList:
      return <ServersListPage />;
    case Page.ModelManager:
      return <ModelManagerPage />;
  }
}
