import * as React from 'react';
import { RootState, store } from '../state';
import { Provider, useSelector } from 'react-redux';
import { Page } from '../state/nav';
import { LandingPage } from '../pages/Landing';
import { TranscribePage } from '../pages/Transcribe';
import { EditorPage } from '../pages/Editor';
import { TranscribingPage } from '../pages/Transcribing';
import { ManageServerPage } from '../pages/ManageServer';
import { SettingsPage } from '../pages/Settings';

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
    case Page.ManageServer:
      return <ManageServerPage />;
  }
}
