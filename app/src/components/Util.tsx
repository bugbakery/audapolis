import React from 'react';
import styled from 'styled-components';
import {
  ArrowLeftIcon,
  Button,
  ButtonProps,
  IconProps,
  majorScale,
  Pane,
  useTheme,
} from 'evergreen-ui';
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
      paddingBottom={centerVertically ? 80 : 0}
      flexGrow={1}
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

export function CrossedOutIcon({
  icon,
  color = 'default',
  ...props
}: IconProps & { icon: React.ElementType }): JSX.Element {
  const Icon = icon;
  const gapPercent = 10;
  const linePercent = 6;

  const theme = useTheme();
  const colorString = theme.colors.icon[color];

  return (
    <Pane position={'relative'} lineHeight={0}>
      <Icon
        {...props}
        color={color}
        style={{
          clipPath: `polygon(
            0 0, 
            ${100 - gapPercent}% 0,
            0 ${100 - gapPercent}%,
            0 100%,
            ${gapPercent}% 100%,
            100% ${gapPercent}%,
            100% 100%, 0 100%
          )`,
        }}
      />
      <svg
        viewBox="0 0 100 100"
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      >
        <line
          x1={linePercent / 2}
          y1={100 - linePercent / 2}
          x2={100 - linePercent / 2}
          y2={linePercent / 2}
          style={{ stroke: colorString, strokeWidth: linePercent, strokeLinecap: 'round' }}
        />
      </svg>
    </Pane>
  );
}
