import * as React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../state';
import styled from 'styled-components';
import { player } from '../../core/player';
import { Card, FilmIcon, Pane } from 'evergreen-ui';
import { CrossedOutIcon } from '../../components/Util';
import { currentIndex } from '../../state/editor/selectors';

const PlayerContainer = styled.div<{ visible: boolean }>`
  position: absolute;
  bottom: ${({ visible }) => (visible ? 0 : -100)}%;
  transition: bottom 0.3s;
  right: 0;
  display: block;
`;

const VideoTag = styled.video<{ visible: boolean }>`
  max-width: 90vw;
  max-height: calc(300px / 16 * 9);
  height: 100%;
  display: ${({ visible }) => (visible ? 'block' : 'none')};
  position: relative;
  z-index: 2;
`;

const FallbackVideoTag = styled.div<{ visible: boolean }>`
  width: 300px;
  height: calc(300px / 16 * 9);
  display: ${({ visible }) => (visible ? 'block' : 'none')};
  position: relative;
  z-index: 2;
`;

export function Player(): JSX.Element {
  const sources = useSelector((state: RootState) => state.editor.present?.document.sources) || {};
  const currentSource = useSelector((state: RootState) => {
    if (!state.editor.present) {
      return null;
    }
    let cIdx = currentIndex(state.editor.present);
    let cItem = state.editor.present.document.content[cIdx];
    if (cIdx > 0 && cItem && cItem.type == 'paragraph_break') {
      cIdx -= 1;
      cItem = state.editor.present.document.content[cIdx];
    }
    return cItem && 'source' in cItem ? cItem.source : null;
  });
  const displayVideo =
    useSelector((state: RootState) => state.editor.present?.document.metadata.display_video) ||
    false;

  return (
    <PlayerContainer visible={displayVideo}>
      <Pane position={'relative'} marginX={30} marginY={15}>
        <Card
          position={'absolute'}
          top={0}
          left={0}
          display={'flex'}
          justifyContent={'center'}
          alignItems={'center'}
          width={'100%'}
          height={'100%'}
          background={'tint2'}
          zIndex={1}
          elevation={3}
        >
          <CrossedOutIcon icon={FilmIcon} size={50} color={'muted'} />
        </Card>
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
        <FallbackVideoTag
          visible={currentSource === null}
          key={Object.entries(sources).length + 1}
        />
      </Pane>
    </PlayerContainer>
  );
}
