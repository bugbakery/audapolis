import * as React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../state';
import styled from 'styled-components';
import { player } from '../../core/player';
import { DocumentGenerator } from '../../core/document';
import { MdVideocamOff } from 'react-icons/md';

const PlayerContainer = styled.div<{ visible: boolean }>`
  position: absolute;
  bottom: 0;
  right: 0;
  display: ${({ visible }) => (visible ? 'block' : 'none')};
`;
const PlayerContainerInner = styled.div`
  position: relative;
  margin: 15px 30px;
`;
const VideoTag = styled.video<{ visible: boolean }>`
  width: 300px;
  display: ${({ visible }) => (visible ? 'block' : 'none')};
  position: relative;
  z-index: 2;
`;
const NoVideoContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  font-size: 40px;
  background: ${({ theme }) => theme.bgAccent};
  z-index: 1;
`;
export function Player(): JSX.Element {
  const sources = useSelector((state: RootState) => state.editor.present?.document.sources) || {};
  const currentSource = useSelector((state: RootState) => {
    const currentItem =
      state.editor.present &&
      DocumentGenerator.fromParagraphs(state.editor.present.document.content).getItemsAtTime(
        state.editor.present.currentTime
      )[0];
    return currentItem && 'source' in currentItem ? currentItem.source : null;
  });
  const displayVideo =
    useSelector((state: RootState) => state.editor.present?.displayVideo) || false;

  return (
    <PlayerContainer visible={displayVideo}>
      <PlayerContainerInner>
        <NoVideoContainer>
          <MdVideocamOff />
        </NoVideoContainer>
        {Object.entries(sources).map(([k, source]) => (
          <VideoTag
            visible={currentSource === k}
            key={k}
            src={source.objectUrl}
            ref={(ref) => {
              if (ref) {
                player.sources[k] = ref;
              }
            }}
          />
        ))}
      </PlayerContainerInner>
    </PlayerContainer>
  );
}
