import styled, { css } from 'styled-components';
import { IconType } from 'react-icons';
import { ButtonHTMLAttributes } from 'react';
import * as React from 'react';
import { Popup } from 'reactjs-popup';

export const Button = styled.button<{ primary?: boolean }>`
  display: inline-block;
  text-align: center;
  border-radius: 5px;
  padding: 0.5rem 0;
  margin: 0.5rem 1rem;
  background: transparent;
  border: 1px solid var(--fg-color);
  color: var(--fg-color);
  font-size: 18px;
  width: 265px;
  height: 40px;

  ${(props) =>
    props.primary &&
    css`
      background: var(--fg-color);
      color: var(--bg-color);
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
      box-shadow: inset 0 0 3px var(--fg-color) !important;
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
            box-shadow: 0 0 3px var(--fg-color);
          `}
    outline: none;
  }

  & > * {
    width: 100%;
    height: 100%;
    filter: var(--filter);
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
  const children = props.icon ? <props.icon /> : <></>;
  const onClick = props.active === false ? undefined : props.onClick;

  const iconButton = (
    <IconButtonContainer {...props} onClick={onClick}>
      {children}
    </IconButtonContainer>
  );
  if ((props.active === undefined || props.active) && props.text) {
    return (
      <StyledPopup
        trigger={() => iconButton}
        closeOnDocumentClick
        keepTooltipInside="#root"
        position={['bottom center', 'left center', 'right center']}
        on={['hover', 'focus']}
      >
        <span>{props.text}</span>
      </StyledPopup>
    );
  } else {
    return iconButton;
  }
}

const StyledPopup = styled(Popup)`
  &-content {
    margin: auto;
    background: var(--bg-color);
    padding: 5px;
    border: 1px solid var(--fg-color-mild);
    box-shadow: 0 0 3px var(--fg-color-mild);
    border-radius: 5px;
  }
  &-arrow {
    filter: drop-shadow(0 -3px 3px var(--fg-color-mild));
    color: var(--bg-color);
    stroke-width: 2px;
    stroke: var(--fg-color-mild);
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
