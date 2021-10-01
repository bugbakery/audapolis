import styled, { css, useTheme } from 'styled-components';
import { IconType } from 'react-icons';
import { ButtonHTMLAttributes } from 'react';
import * as React from 'react';
import { Popup as RawPopup } from 'reactjs-popup';

export const Button = styled.button<{ primary?: boolean }>`
  display: inline-block;
  text-align: center;
  border-radius: 5px;
  padding: 0.5rem 0;
  margin: 0.5rem 1rem;
  background: transparent;
  border: 1px solid ${({ theme }) => theme.fg};
  color: ${({ theme }) => theme.fg};
  font-size: 18px;
  width: 265px;
  height: 40px;

  ${(props) =>
    props.primary &&
    css`
      background: ${({ theme }) => theme.fg};
      color: ${({ theme }) => theme.bg};
    `}
`;

export const SmallButton = styled.button<{ primary?: boolean }>`
  display: inline-block;
  text-align: center;
  border-radius: 5px;
  padding: 0.25rem;
  margin: 0.5rem 1rem;
  background: transparent;
  border: 1px solid ${({ theme }) => theme.fg};
  color: ${({ theme }) => theme.fg};
  ${(props) =>
    props.primary &&
    css`
      background: ${({ theme }) => theme.fg};
      color: ${({ theme }) => theme.bg};
    `}
`;
const IconButtonContainer = styled.button<{ clicked?: boolean; active?: boolean }>`
  width: 30px;
  height: 30px;
  padding: 3px;
  border-radius: 10px;
  transition: all 0.2s;

  border: none;
  background: none;

  ${(props) =>
    props.clicked &&
    css`
      box-shadow: inset 0 0 3px ${({ theme }) => theme.fg} !important;
    `}

  ${(props) =>
    props.active !== undefined &&
    !props.active &&
    css`
      opacity: 0.5;
    `}

  &:hover, &:focus {
    ${(props) =>
      props.active !== undefined && !props.active
        ? undefined
        : css`
            box-shadow: 0 0 3px ${({ theme }) => theme.fg};
          `}
    outline: none;
  }

  & > * {
    width: 100%;
    height: 100%;
  }
`;

export function IconButton(
  props: {
    clicked?: boolean;
    active?: boolean;
    icon?: IconType;
    text?: string;
  } & ButtonHTMLAttributes<HTMLButtonElement>
): JSX.Element {
  const theme = useTheme();
  const onClick = props.active === false ? undefined : props.onClick;
  const children = props.icon ? <props.icon style={{ color: theme.fg }} /> : <></>;

  const iconButton = (
    <IconButtonContainer {...props} onClick={onClick}>
      {children}
    </IconButtonContainer>
  );
  if ((props.active === undefined || props.active) && props.text) {
    return (
      <Popup
        trigger={() => iconButton}
        position={['bottom center', 'left center', 'right center']}
        on={['hover', 'focus']}
      >
        <span>{props.text}</span>
      </Popup>
    );
  } else {
    return iconButton;
  }
}

export const Popup = styled(RawPopup).attrs({
  closeOnDocumentClick: true,
  keepTooltipInside: '#root',
})`
  &-content {
    font-family: 'Roboto', sans-serif;
    background-color: ${({ theme }) => theme.bg};
    color: ${({ theme }) => theme.fg};
    margin: auto;
    padding: 5px;
    border: 1px solid ${({ theme }) => theme.fg.alpha(0.3).toString()};
    box-shadow: 0 0 3px ${({ theme }) => theme.fg.alpha(0.3).toString()};
    border-radius: 5px;
  }
  &-arrow {
    filter: drop-shadow(0 -3px 3px ${({ theme }) => theme.fg.alpha(0.1).toString()});
    color: ${({ theme }) => theme.bg};
    stroke-width: 2px;
    stroke: ${({ theme }) => theme.fg.alpha(0.3).toString()};
    stroke-dasharray: 30px;
    stroke-dashoffset: -54px;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
  }
  &-overlay {
    background: transparent;
  }
`;

export const Link = styled.a`
  color: ${({ theme }) => theme.linkColor};
  text-decoration: underline;
  cursor: pointer;
`;
