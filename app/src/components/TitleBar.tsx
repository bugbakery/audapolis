import styled from 'styled-components';
import { MdClose } from 'react-icons/md';
import * as React from 'react';

const CloseIcon = styled(MdClose)`
  display: ${
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.navigator as any).windowControlsOverlay.visible ? 'none' : 'inline'
  };
  margin: 0 12px;
  height: 20px;
  width: auto;
`;
function FallbackCloseButton() {
  // TODO(anuejn) test how this behaves on different platforms (win, macos)
  // and implement better handling (i.e. a dummy container) for the cases where the os renders the buttons

  return (
    <CloseIcon
      onClick={() => {
        window.close();
        console.log('lol');
      }}
    />
  );
}

const TitleBarContainer = styled.div`
  height: 40px;
  display: grid;
  grid-auto-columns: 1fr auto 1fr;
  grid-auto-flow: column;
`;
const WindowTitle = styled.h1`
  margin: 0;
  font-size: 20px;
  font-weight: normal;
  height: 100%;
  display: flex;
  align-items: center;
  -webkit-app-region: drag;
  -webkit-user-select: none;
`;
const Department = styled.div<{ side: 'left' | 'center' | 'right' }>`
  display: flex;
  align-items: center;
  flex-direction: row;
  justify-content: ${(props) => props.side};
`;
const DragHandle = styled.div`
  -webkit-app-region: drag;
  -webkit-user-select: none;
  flex-grow: 1;
  height: 100%;
`;

export function TitleBar(): JSX.Element {
  return (
    <TitleBarContainer>
      <Department side={'left'}>
        <DragHandle />
      </Department>
      <Department side={'center'}>
        <WindowTitle>audapolis</WindowTitle>
      </Department>
      <Department side={'right'}>
        <DragHandle />
        <FallbackCloseButton />
      </Department>
    </TitleBarContainer>
  );
}
