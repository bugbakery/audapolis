import React from 'react';
import styled from 'styled-components';
import { ArrowLeftIcon, Button, ButtonProps, majorScale, Pane } from 'evergreen-ui';
import { openLanding } from '../state/nav';
import { useDispatch } from 'react-redux';

export const AppContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;

  &:focus {
    outline: none;
  }
`;

export const MainCenterColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-grow: 1;
`;

export function MainMaxWidthContainer({
  children,
  width = 800,
  centerVertically,
}: {
  children: JSX.Element[];
  width?: number;
  centerVertically?: boolean;
}): JSX.Element {
  return (
    <Pane
      width={'100%'}
      padding={20}
      display={'flex'}
      flexDirection={'column'}
      overflowY={'auto'}
      justifyContent={centerVertically ? 'center' : 'start'}
      paddingBottom={centerVertically ? 100 : 0}
      minHeight={'100%'}
    >
      <Pane width={'100%'} maxWidth={width} marginX={'auto'}>
        {children}
      </Pane>
    </Pane>
  );
}

export function BackButton(props: ButtonProps): JSX.Element {
  const dispatch = useDispatch();

  return (
    <Pane>
      <Button
        onClick={() => dispatch(openLanding())}
        iconBefore={ArrowLeftIcon}
        marginY={majorScale(2)}
        appearance={'minimal'}
        {...props}
      >
        back to home screen
      </Button>
    </Pane>
  );
}