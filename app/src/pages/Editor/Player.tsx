import * as React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../state';
import styled from 'styled-components';
import { player } from '../../core/player';

const PlayerContainer = styled.div`
  display: none;
`;
export function Player(): JSX.Element {
  const sources = useSelector((state: RootState) => state.editor.present?.document.sources) || {};

  return (
    <PlayerContainer>
      {Object.entries(sources).map(([k, source]) => (
        <video
          key={k}
          src={URL.createObjectURL(new Blob([source.fileContents]))}
          ref={(ref) => {
            if (ref) {
              player.sources[k] = ref;
            }
          }}
        />
      ))}
    </PlayerContainer>
  );
}
