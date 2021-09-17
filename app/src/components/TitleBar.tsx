import styled from 'styled-components';
import { MdClose } from 'react-icons/md';
import * as React from 'react';
import { IconButton } from './Controls';

function getWindowControlsRect(): DOMRect {
  const windowControlsOverlay = (window.navigator as any).windowControlsOverlay;
  if (windowControlsOverlay.visible) {
    return windowControlsOverlay.getBoundingClientRect();
  } else {
    return new DOMRect(55, 0, window.innerWidth - 2 * 55, 55);
  }
}
const CloseIcon = styled(MdClose)`
  padding: 17px;
  position: absolute;
  top: 0;
  right: 0;
  -webkit-app-region: no-drag;
`;
function FallbackCloseButton() {
  if ((window.navigator as any).windowControlsOverlay.visible) {
    return <></>;
  } else {
    const rect = getWindowControlsRect();
    return (
      <CloseIcon
        onClick={() => {
          window.close();
          console.log('lol');
        }}
        style={{ width: rect.x, height: rect.height }}
      />
    );
  }
}

const TitleBarContainer = styled.div`
  height: 55px;
  flex-shrink: 0;
  padding: 0 ${getWindowControlsRect().left}px;
  display: flex;
  flex-direction: row;
  justify-content: space-evenly;
  align-items: center;
  box-shadow: 0 0 3px var(--fg-color-mild);

  -webkit-app-region: drag;
  -webkit-user-select: none;
`;
export const WindowTitle = styled.h1`
  margin: 0;
  font-size: 18px;
  font-weight: normal;
`;

export function TitleBar({ children }: { children?: React.ReactNode }): JSX.Element {
  if (!children) {
    children = <WindowTitle>audapolis</WindowTitle>;
  }

  return (
    <TitleBarContainer>
      <FallbackCloseButton />
      {children}
    </TitleBarContainer>
  );
}

export const TitleBarButton = styled(IconButton)`
  -webkit-app-region: no-drag;
`;

export const TitleBarSection = styled.div`
  display: flex;
  flex-direction: row;
  flex-basis: 0;
  flex-grow: 1;
  justify-content: space-evenly;
`;

export const TitleBarGroup = styled.div`
  display: flex;
  flex-direction: row;
  flex-grow: 0;
  & > * {
    margin: 0 5px;
  }
`;
