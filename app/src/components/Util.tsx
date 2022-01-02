import React from 'react';
import styled from 'styled-components';
import { Pane } from 'evergreen-ui';

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

export function MainMaxWidthContainer({ children }: { children: JSX.Element[] }): JSX.Element {
  return (
    <Pane width={'100%'} padding={20} display={'flex'} flexDirection={'column'} overflowY={'auto'}>
      <Pane width={'100%'} maxWidth={800} marginX={'auto'}>
        {children}
      </Pane>
    </Pane>
  );
}