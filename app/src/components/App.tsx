import * as React from 'react';
import { RootState, store } from '../state';
import { Provider, useSelector } from 'react-redux';
import { Page } from '../state/nav';
import { LandingPage } from './Landing';
import { TranscribePage } from './Transcribe';
import { EditorPage } from './Editor';
import { TranscribingPage } from './Transcribing';
import { SettingsPage } from './Settings';

export default function App(): JSX.Element {
  return (
    <Provider store={store}>
      <CurrentPage />
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
    case Page.Settings:
      return <SettingsPage />;
  }
}
