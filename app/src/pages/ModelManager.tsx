import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TitleBar } from '../components/TitleBar';
import { AppContainer, MainMaxWidthContainer, StyledTable, Title } from '../components/Util';
import { Button, IconButton } from '../components/Controls';
import { openLanding } from '../state/nav';
import { RootState } from '../state';
import { deleteModel, downloadModel, Model } from '../state/models';
import { IconType } from 'react-icons';
import { MdCloudDownload, MdDelete } from 'react-icons/md';
import styled, { css } from 'styled-components';
import { Joyride, ExtendedStoreHelpers } from '../components/Joyride';
import { HTMLProps, useState } from 'react';
import { assertSome } from '../util';

export function ModelManagerPage(): JSX.Element {
  const dispatch = useDispatch();
  const all_available = useSelector((state: RootState) => state.models.available);
  const downloaded = useSelector((state: RootState) => state.models.downloaded);
  const downloading = useSelector((state: RootState) => state.models.downloading);

  const steps_first = [
    {
      target: 'body',
      placement: 'center' as const,
      content: (
        <p>
          Here you can download so called "transcription models". These models will help the
          computer transcribe audio into text. For Each language you want to work with you need at
          least one model
        </p>
      ),
    },
    {
      target: '#English-small',
      content: <p>Small models are fast to download and use not much disk space.</p>,
    },
    {
      target: '#English-big',
      content: (
        <p>
          Big models take longer to load, consume more disk space but generally give better results.
        </p>
      ),
    },
    {
      target: '#download',
      content: (
        <p>You should now download at least one transcription model. This might take some time.</p>
      ),
    },
  ];

  const steps_second = [
    {
      target: '#downloaded',
      content: <p>Congratulations 🎉. You Now have a transcription model...</p>,
    },
    {
      target: '#back',
      content: (
        <p>...and can go back and transcribe your media file. Do you remember how to do that?</p>
      ),
    },
  ];

  const [helpers, setHelpers] = useState(null as null | ExtendedStoreHelpers);
  const [steps, setSteps] = useState(steps_first);

  const flattened_downloaded = Object.values(downloaded).flatMap((x) => x);
  const available = Object.fromEntries(
    Object.entries(all_available).map(([lang, models]) => {
      return [
        lang,
        models.flatMap((model) => {
          const predicate = (candidate: Model) =>
            candidate.lang == lang && candidate.name == model.name;
          const downloadedModel = flattened_downloaded.find(predicate);
          const downloadingModel = downloading.find(predicate);
          return downloadedModel ? [] : downloadingModel ? [downloadingModel] : [model];
        }),
      ];
    })
  );

  let downloadedRender = <></>;
  if (Object.keys(downloaded).length) {
    if (helpers && steps[0].target == '#downloaded' && helpers.info().index == 0) {
      helpers.setRun(true);
    }
    downloadedRender = (
      <>
        <TableTitle>Downloaded Transcription Models</TableTitle>
        <ModelsTable
          id={'downloaded'}
          models={downloaded}
          actionIcon={MdDelete}
          onAction={(model) => dispatch(deleteModel(model))}
        />
      </>
    );
  }

  return (
    <AppContainer>
      <TitleBar />
      <MainMaxWidthContainer>
        <Joyride
          steps={steps}
          page={'model-manager'}
          getHelpers={(helpers) => setHelpers(helpers)}
          callback={(state) => {
            if (
              steps[0].target == 'body' &&
              state.index == state.size - 1 &&
              state.action == 'next'
            ) {
              assertSome(helpers);
              helpers.setRun(false);
              helpers.reset(true);
              setSteps(steps_second);
            }
          }}
        />
        <StyledTable>
          {downloadedRender}

          <TableTitle>Available Transcription Models</TableTitle>
          <ModelsTable
            models={available}
            actionIcon={MdCloudDownload}
            onAction={(model) => {
              assertSome(helpers);
              helpers.setRun(false);
              helpers.reset(true);
              setSteps(steps_second);
              dispatch(downloadModel(model));
            }}
            canDownload={true}
          />
        </StyledTable>

        <Button id={'back'} onClick={() => dispatch(openLanding())}>
          Home
        </Button>
      </MainMaxWidthContainer>
    </AppContainer>
  );
}

function TableTitle({ children }: { children: string }): JSX.Element {
  return (
    <thead>
      <tr>
        <th colSpan={1000}>
          <Title>{children}</Title>
        </th>
      </tr>
    </thead>
  );
}

const ProgressTr = styled.tr<{ progress?: number }>`
  ${(props) =>
    props.progress &&
    css`
      background-image: linear-gradient(
        to right,
        ${({ theme }) => theme.bgSelection},
        ${({ theme }) => theme.bgSelection}
      );
      background-size: ${props.progress * 100}%;
      background-repeat: no-repeat;
    `}
`;

function ModelsTable({
  models,
  actionIcon,
  onAction,
  canDownload,
  ...props
}: {
  models: Record<string, (Model & { progress?: number })[]>;
  actionIcon: IconType;
  onAction: (model: Model) => void;
  canDownload?: boolean;
} & HTMLProps<HTMLTableSectionElement>): JSX.Element {
  const flattened = Object.values(models).flatMap((x) => x);

  return (
    <tbody {...props}>
      {flattened.map((model, i) => (
        <ProgressTr id={`${model.lang}-${model.name}`} key={i} progress={model?.progress}>
          <td>{model.lang}</td>
          <td>{model.name}</td>
          <td>{model.size}</td>
          <td>
            {model?.progress === undefined ? (
              <IconButton
                icon={actionIcon}
                onClick={() => onAction(model)}
                id={i == 0 && canDownload ? 'download' : ''}
              />
            ) : (
              <IconButton active={false} />
            )}
          </td>
        </ProgressTr>
      ))}
    </tbody>
  );
}
