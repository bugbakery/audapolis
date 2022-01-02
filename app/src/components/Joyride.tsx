import ReactJoyride, { STATUS, Step, Props, StoreHelpers, TooltipRenderProps } from 'react-joyride';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button, CrossIcon, Heading, IconButton, majorScale, Pane } from 'evergreen-ui';

const listeners: Record<string, () => void> = {};

export type ExtendedStoreHelpers = StoreHelpers & { setRun: (run: boolean) => void };

const Tooltip = ({
  index,
  step,
  backProps,
  closeProps,
  primaryProps,
  tooltipProps,
}: TooltipRenderProps) => {
  return (
    <Pane
      {...tooltipProps}
      role="dialog"
      backgroundColor="white"
      elevation={4}
      borderRadius={8}
      display="flex"
      flexDirection="column"
      width={560}
    >
      <Pane
        flexShrink={0}
        display="flex"
        alignItems="center"
        margin={step.title ? majorScale(2) : 0}
      >
        <Heading is="h4" size={600} flex="1">
          {step.title}
        </Heading>
        <IconButton appearance="minimal" icon={CrossIcon} {...closeProps} />
      </Pane>

      <Pane display="flex" overflow="auto" flexDirection="column" margin={majorScale(2)}>
        <Pane>{step.content}</Pane>
      </Pane>

      <Pane display="flex" justifyContent="flex-end" margin={majorScale(2)}>
        {index > 0 && <Button {...backProps}>Back</Button>}

        <Button tabIndex={0} marginLeft={8} appearance="primary" {...primaryProps}>
          Next
        </Button>
      </Pane>
    </Pane>
  );
};

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
  const wasRun = (localStorage.getItem(wasRunStoreKey) as 'true' | undefined) || false;
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
          localStorage.setItem(wasRunStoreKey, 'true');
        }

        if (args.index != 0) {
          localStorage.setItem(wasRunStoreKey, 'true');
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
      tooltipComponent={Tooltip}
      {...props}
    />
  );
}

export function resetJoyride(): void {
  Object.keys(localStorage)
    .filter((x) => x.startsWith('intro/'))
    .forEach((x) => {
      localStorage.removeItem(x);
      console.log(x);
    });
  Object.values(listeners).forEach((listener) => listener());
}
