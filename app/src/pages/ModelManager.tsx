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

export function ModelManagerPage(): JSX.Element {
  const dispatch = useDispatch();
  const all_available = useSelector((state: RootState) => state.models.available);
  const downloaded = useSelector((state: RootState) => state.models.downloaded);
  const downloading = useSelector((state: RootState) => state.models.downloading);

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

  return (
    <AppContainer>
      <TitleBar />
      <MainMaxWidthContainer>
        <StyledTable>
          {Object.keys(downloaded).length ? (
            <>
              <TableTitle>Downloaded Transcription Models</TableTitle>
              <ModelsTable
                models={downloaded}
                actionIcon={MdDelete}
                onAction={(model) => dispatch(deleteModel(model))}
              />
            </>
          ) : (
            <></>
          )}

          <TableTitle>Available Transcription Models</TableTitle>
          <ModelsTable
            models={available}
            actionIcon={MdCloudDownload}
            onAction={(model) => dispatch(downloadModel(model))}
          />
        </StyledTable>

        <Button onClick={() => dispatch(openLanding())}>Home</Button>
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
}: {
  models: Record<string, (Model & { progress?: number })[]>;
  actionIcon: IconType;
  onAction: (model: Model) => void;
}): JSX.Element {
  const flattened = Object.values(models).flatMap((x) => x);

  return (
    <tbody>
      {flattened.map((model, i) => (
        <ProgressTr key={i} progress={model?.progress}>
          <td>{model.lang}</td>
          <td>{model.name}</td>
          <td>{model.size}</td>
          <td>
            {model?.progress === undefined ? (
              <IconButton icon={actionIcon} onClick={() => onAction(model)} />
            ) : (
              <IconButton active={false} />
            )}
          </td>
        </ProgressTr>
      ))}
    </tbody>
  );
}
