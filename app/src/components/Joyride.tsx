import ReactJoyride, { STATUS, Step, Props, StoreHelpers } from 'react-joyride';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Store from 'electron-store';

const store = new Store();
const listeners: Record<string, () => void> = {};

export type ExtendedStoreHelpers = StoreHelpers & { setRun: (run: boolean) => void };

export function Joyride({
  steps,
  page,
  callback,
  getHelpers,
  ...props
}: {
  steps: Step[];
  page: string;
  getHelpers?: (helpers: ExtendedStoreHelpers) => void;
} & Omit<Props, 'getHelpers'>): JSX.Element {
  const wasRunStoreKey = `intro/${page}`;
  const wasRun = (store.get(wasRunStoreKey) as true | undefined) || false;
  const [run, setRun] = useState(!wasRun);
  useEffect(() => {
    const uuid = uuidv4();
    listeners[uuid] = () => {
      setRun(true);
    };
    return () => {
      delete listeners[uuid];
    };
  });
  if (!run) return <></>;

  return (
    <ReactJoyride
      callback={(args) => {
        const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
        if (finishedStatuses.includes(args.status)) {
          setRun(false);
          store.set(wasRunStoreKey, true);
        }

        if (args.index != 0) {
          store.set(wasRunStoreKey, true);
        }
        if (callback) callback(args);
      }}
      scrollOffset={200}
      steps={steps.map((x) => ({ disableBeacon: true, ...x }))}
      run={true}
      continuous={true}
      showSkipButton={true}
      scrollToFirstStep={true}
      spotlightClicks={true}
      disableScrollParentFix={true}
      disableOverlayClose={true}
      getHelpers={(helpers) => {
        if (getHelpers) getHelpers({ ...helpers, setRun: (run: boolean) => setRun(run) });
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        open: 'Open the dialog',
        skip: 'Skip',
      }}
      {...props}
    />
  );
}

export function resetJoyride(): void {
  Object.keys(store.store)
    .filter((x) => x.startsWith('intro/'))
    .forEach((x) => {
      store.delete(x);
      console.log(x);
    });
  Object.values(listeners).forEach((listener) => listener());
}
