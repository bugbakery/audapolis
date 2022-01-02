import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TitleBar } from '../components/TitleBar';
import { AppContainer, MainMaxWidthContainer } from '../components/Util';
import { RootState } from '../state';
import { deleteModel, downloadModel, Model } from '../state/models';
import {
  ArrowLeftIcon,
  Button,
  CloudDownloadIcon,
  Heading,
  IconButton,
  majorScale,
  Table,
  Tooltip,
  TrashIcon,
} from 'evergreen-ui';
import { Circle } from 'rc-progress';
import { openLanding } from '../state/nav';

export function ModelManagerPage(): JSX.Element {
  const dispatch = useDispatch();
  const all = useSelector((state: RootState) => state.models.all);
  const downloaded = useSelector((state: RootState) => state.models.downloaded);
  const downloading = useSelector((state: RootState) => state.models.downloading);

  const notDownloaded = all.filter((x) => {
    const predicate = (candidate: Model) => candidate.lang == x.lang && candidate.name == x.name;
    const downloadedModel = downloaded.find(predicate);
    const downloadingModel = downloading.find(predicate);
    return !(downloadedModel || downloadingModel);
  });

  const lastColumnProps = {
    flexGrow: 0,
    flexBasis: 60,
  };

  const firstColumnProps = {
    flexBasis: '30%',
  };

  return (
    <AppContainer>
      <TitleBar />
      <MainMaxWidthContainer>
        <Button
          id={'back'}
          onClick={() => dispatch(openLanding())}
          iconBefore={ArrowLeftIcon}
          appearance={'minimal'}
        >
          back to home screen
        </Button>

        <Heading marginTop={majorScale(3)} marginBottom={majorScale(2)} paddingLeft={majorScale(1)}>
          Transcription Models
        </Heading>

        <Table>
          <Table.Head padding={0}>
            <Table.TextHeaderCell {...firstColumnProps}>Language</Table.TextHeaderCell>
            <Table.TextHeaderCell>Variant</Table.TextHeaderCell>
            <Table.TextHeaderCell>Size</Table.TextHeaderCell>
            <Table.TextHeaderCell {...lastColumnProps} />
          </Table.Head>

          <Table.Body>
            {downloaded.map((model, i) => (
              <Table.Row id={`${model.lang}-${model.name}`} key={i}>
                <Table.TextCell {...firstColumnProps}>{model.lang}</Table.TextCell>
                <Table.TextCell>{model.name}</Table.TextCell>
                <Table.TextCell isNumber>{model.size}</Table.TextCell>
                <Table.Cell {...lastColumnProps}>
                  <Tooltip content={'delete model'}>
                    <IconButton icon={TrashIcon} onClick={() => dispatch(deleteModel(model))} />
                  </Tooltip>
                </Table.Cell>
              </Table.Row>
            ))}

            {downloading.map((model, i) => (
              <Table.Row id={`${model.lang}-${model.name}`} key={i}>
                <Table.TextCell {...firstColumnProps}>{model.lang}</Table.TextCell>
                <Table.TextCell>{model.name}</Table.TextCell>
                <Table.TextCell isNumber>{model.size}</Table.TextCell>
                <Table.Cell {...lastColumnProps}>
                  <Tooltip content={`downloading model ${Math.round(model.progress * 100)}%`}>
                    <Button padding={0} appearance={'minimal'}>
                      <Circle
                        style={{ height: majorScale(3) }}
                        percent={model.progress * 100}
                        strokeWidth={50}
                        trailWidth={0}
                        strokeLinecap={'butt'}
                      />
                    </Button>
                  </Tooltip>
                </Table.Cell>
              </Table.Row>
            ))}

            {notDownloaded.map((model, i) => (
              <Table.Row id={`${model.lang}-${model.name}`} key={i}>
                <Table.TextCell {...firstColumnProps}>{model.lang}</Table.TextCell>
                <Table.TextCell>{model.name}</Table.TextCell>
                <Table.TextCell isNumber>{model.size}</Table.TextCell>
                <Table.Cell {...lastColumnProps}>
                  <Tooltip content={'download model'}>
                    <IconButton
                      icon={CloudDownloadIcon}
                      onClick={() => dispatch(downloadModel(model))}
                    />
                  </Tooltip>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>

        <Button
          id={'back'}
          onClick={() => dispatch(openLanding())}
          iconBefore={ArrowLeftIcon}
          marginY={majorScale(2)}
          appearance={'minimal'}
        >
          back to home screen
        </Button>
      </MainMaxWidthContainer>
    </AppContainer>
  );
}
