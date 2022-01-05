import * as React from 'react';
import { RootState, store } from '../state';
import { Provider as ReduxProvider, useDispatch, useSelector } from 'react-redux';
import { openAbout, Page } from '../state/nav';
import { LandingPage } from '../pages/Landing';
import { TranscribePage } from '../pages/Transcribe';
import { EditorPage } from '../pages/Editor';
import { TranscribingPage } from '../pages/Transcribing';
import { ModelManagerPage } from '../pages/ModelManager';
import styled from 'styled-components';
// import { useMediaPredicate } from 'react-media-hook';
import { lightTheme } from './theme';
import { editorMenu, nonEditorMenu, setMenu } from './menu';
import { AboutPage } from '../pages/About';
import { ipcRenderer } from 'electron';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { Theme, ThemeProvider as EvergreenThemeProvider } from 'evergreen-ui';

const AppContainer = styled.div<{ theme: Theme }>`
  width: 100%;
  height: 100%;
  background-color: ${({ theme }) => theme.colors.overlayBackgroundColor};

  & ::-webkit-scrollbar {
    width: 16px; /* width of the entire scrollbar */
  }

  & ::-webkit-scrollbar-track {
    background: transparent; /* color of the tracking area */
  }

  & ::-webkit-scrollbar-thumb {
    background-color: darkgray; /* color of the scroll thumb */
    border-radius: 20px; /* roundness of the scroll thumb */
    border: 5px solid white; /* creates padding around scroll thumb */
  }
`;
export default function App(): JSX.Element {
  // TODO: re-enable dark theme
  // const isDark = useMediaPredicate('(prefers-color-scheme: dark)');
  const theme = lightTheme; //isDark ? darkTheme : lightTheme;

  return (
    <EvergreenThemeProvider value={theme}>
      <ReduxProvider store={store}>
        <AppContainer theme={theme}>
          <CurrentPage />
          <Toaster position="bottom-center" reverseOrder={false} />
        </AppContainer>
      </ReduxProvider>
    </EvergreenThemeProvider>
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
