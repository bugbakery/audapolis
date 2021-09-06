/* the landing page, that gets opened, when the user opens the app without directly opening a file */

import * as React from 'react';
import styled from 'styled-components';
import { Button } from './Controls';

const CenterColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-grow: 1;
`;

export function LandingPage(): JSX.Element {
  return (
    <CenterColumn>
      <Button primary>Import & Transcribe</Button>
      <Button primary>Open Existing</Button>
      <Button>New Blank Document</Button>
    </CenterColumn>
  );
}
