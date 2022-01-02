import * as React from 'react';
import { RootState, store } from '../state';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { openAbout, Page } from '../state/nav';
import { LandingPage } from '../pages/Landing';
import { TranscribePage } from '../pages/Transcribe';
import { EditorPage } from '../pages/Editor';
import { TranscribingPage } from '../pages/Transcribing';
import { ModelManagerPage } from '../pages/ModelManager';
import styled, { ThemeProvider } from 'styled-components';
import { useMediaPredicate } from 'react-media-hook';
import { darkTheme, lightTheme } from './theme';
import { editorMenu, nonEditorMenu, setMenu } from './menu';
import { AboutPage } from '../pages/About';
import { ipcRenderer } from 'electron';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';

const AppContainer = styled.div`
  width: 100%;
  height: 100%;
  background-color: ${({ theme }) => theme.bg};
`;
export default function App(): JSX.Element {
  const isDark = useMediaPredicate('(prefers-color-scheme: dark)');
  const theme = lightTheme; //isDark ? darkTheme : lightTheme;

  return (
    <ThemeProvider theme={theme}>
      <Provider store={store}>
        <AppContainer>
          <CurrentPage />
          <Toaster position="bottom-center" reverseOrder={false} />
        </AppContainer>
      </Provider>
    </ThemeProvider>
  );
}

function CurrentPage(): JSX.Element {
  const page = useSelector((state: RootState) => state.nav.page);

  setMenu(page == Page.Editor ? editorMenu : nonEditorMenu);

  const dispatch = useDispatch();

  useEffect(() => {
    const func = () => {
      dispatch(openAbout());
    };
    ipcRenderer.on('open-about', func);
    return () => {
      ipcRenderer.removeListener('open-about', func);
    };
  });

  switch (page) {
    case Page.Landing:
      return <LandingPage />;
    case Page.Transcribe:
      return <TranscribePage />;
    case Page.Editor:
      return <EditorPage />;
    case Page.Transcribing:
      return <TranscribingPage />;
    case Page.ModelManager:
      return <ModelManagerPage />;
    case Page.About:
      return <AboutPage />;
  }
}
