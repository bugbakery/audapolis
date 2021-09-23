import * as React from 'react';
import { RootState, store } from '../state';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { Page } from '../state/nav';
import { LandingPage } from './Landing';
import { TranscribePage } from './Transcribe';
import { EditorPage } from './Editor';
import { TranscribingPage } from './Transcribing';
import { ManageServerPage } from './ManageServer';
import { SettingsPage } from './Settings';
import { LocalServerStatus, startServer } from '../state/server';

export default function App(): JSX.Element {
  return (
    <Provider store={store}>
      <CurrentPage />
    </Provider>
  );
}

function CurrentPage(): JSX.Element {
  const dispatch = useDispatch();
  const localServerState = useSelector((state: RootState) => state.server.local_state);
  if (localServerState == LocalServerStatus.NotStarted) {
    dispatch(startServer());
  }

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
