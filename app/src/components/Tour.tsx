import * as React from 'react';
import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button, CrossIcon, Heading, IconButton, majorScale, Pane, Popover } from 'evergreen-ui';
import { useElemRect } from '@reactour/utils';
import Mask from '@reactour/mask';

export interface Step {
  title?: JSX.Element;
  body: JSX.Element;

  target?: string;

  showDependency?: string /* this makes the tour pause before this step until the given dependency is met */;
}

export interface TourProps {
  steps: Step[];
  page: string;
  dependencyStates?: Record<string, boolean | undefined>;
}

// we have to reset all tour instances when the user requests to redo the tour
// therefore we keep record of listeners that are called on reset.
const listeners: Record<string, () => void> = {};

export function resetTour(): void {
  Object.keys(localStorage)
    .filter((x) => x.startsWith('intro/'))
    .forEach((x) => {
      localStorage.removeItem(x);
      console.log(x);
    });
  Object.values(listeners).forEach((listener) => listener());
}

export function Tour({ steps, page, dependencyStates = {} }: TourProps): JSX.Element {
  const wasRunStoreKey = `intro/${page}`;
  const wasRun = (localStorage.getItem(wasRunStoreKey) as 'true' | undefined) || false;
  const [stepIndex, setStepIndex] = useState(wasRun ? steps.length : 0);

  useEffect(() => {
    const uuid = uuidv4();
    listeners[uuid] = () => {
      setStepIndex(0);
    };
    return () => {
      delete listeners[uuid];
    };
  });

  const step = steps[stepIndex];

  const done = stepIndex >= steps.length;
  const awaitingShowDependency =
    step &&
    step.showDependency &&
    !Object.entries(dependencyStates).some(
      ([depName, depState]) => step.showDependency == depName && depState
    );
  if (done || awaitingShowDependency) return <></>;

  return (
    <StepComponent step={steps[stepIndex]}>
      <Pane
        flexShrink={0}
        display="flex"
        alignItems="center"
        margin={step.title ? majorScale(2) : majorScale(1)}
      >
        <Heading is="h4" size={600} flex="1">
          {step.title}
        </Heading>
        <IconButton
          appearance="minimal"
          icon={CrossIcon}
          onClick={() => {
            setStepIndex(steps.length);
            localStorage.setItem(wasRunStoreKey, 'true');
          }}
        />
      </Pane>

      <Pane display="flex" overflow="auto" flexDirection="column" margin={majorScale(2)}>
        <Pane>{step.body}</Pane>
      </Pane>

      <Pane display="flex" justifyContent="flex-end" margin={majorScale(2)}>
        {stepIndex > 0 && (
          <Button
            onClick={() => {
              setStepIndex(stepIndex - 1);
            }}
          >
            Back
          </Button>
        )}

        <Button
          tabIndex={0}
          marginLeft={8}
          appearance="primary"
          onClick={() => {
            setStepIndex(stepIndex + 1);
            localStorage.setItem(wasRunStoreKey, 'true');
          }}
        >
          Next
        </Button>
      </Pane>
    </StepComponent>
  );
}

export function StepComponent({
  step,
  children,
}: {
  step: Step;
  children: JSX.Element[];
}): JSX.Element {
  const target = step.target ? document.querySelector(step.target) || undefined : undefined;
  // there is no really nice way to know when we have to rerender, so we simply rerender as long as stuff changes
  const [rerenderCounter, setRerenderCounter] = useState(0);
  const computedRect = useElemRect(target, rerenderCounter);
  const targetRect = target
    ? computedRect
    : {
        top: window.innerHeight / 2 - 100,
        left: window.innerWidth / 2,
        width: 0,
        height: 0,
        bottom: 0,
        right: 0,
      };
  const padding = !target || target == document.body ? 0 : majorScale(2);

  const [renderPopup, setRenderPopup] = useState(false);
  let timeout: NodeJS.Timeout | undefined = undefined;
  if (!renderPopup) {
    timeout = setTimeout(() => setRenderPopup(true), 100);
  }
  useEffect(() => {
    setRenderPopup(false);
    setTimeout(() => {
      setRerenderCounter((x) => x + 1);
      if (timeout != undefined) clearTimeout(timeout);
    }, 10);
  }, [JSON.stringify(targetRect)]);

  return (
    <>
      <Mask
        sizes={targetRect}
        padding={padding}
        styles={{
          maskWrapper: () => ({
            zIndex: 1000,
            opacity: 0.5,
            position: 'fixed',
            pointerEvents: 'none',
          }),
        }}
      />
      {renderPopup && (
        <Popover content={children} isShown={true} statelessProps={{ zIndex: 1001, maxWidth: 560 }}>
          <div style={{ position: 'fixed', pointerEvents: 'none', ...targetRect }} />
        </Popover>
      )}
    </>
  );
}
