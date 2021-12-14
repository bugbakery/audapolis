import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TitleBar } from '../components/TitleBar';
import { AppContainer, MainMaxWidthContainer } from '../components/Util';
import { openLanding } from '../state/nav';
import { RootState } from '../state';
import { deleteModel, downloadModel, Model } from '../state/models';
import { Joyride, ExtendedStoreHelpers } from '../components/Joyride';
import { useState } from 'react';
import { assertSome } from '../util';
import {
  Button,
  CloudDownloadIcon,
  Heading,
  IconButton,
  Table,
  Tooltip,
  TrashIcon,
} from 'evergreen-ui';

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

        <Heading>Downloaded Transcription Models</Heading>
        <ModelsTable
          models={downloaded}
          action={{
            icon: TrashIcon,
            text: 'delete model',
            callback: (model) => dispatch(deleteModel(model)),
          }}
        />

        <Heading>Available Transcription Models</Heading>
        <ModelsTable
          models={available}
          action={{
            icon: CloudDownloadIcon,
            text: 'download model',
            callback: (model) => {
              assertSome(helpers);
              helpers.setRun(false);
              helpers.reset(true);
              setSteps(steps_second);
              dispatch(downloadModel(model));
            },
          }}
        />

        <Button id={'back'} onClick={() => dispatch(openLanding())}>
          Home
        </Button>
      </MainMaxWidthContainer>
    </AppContainer>
  );
}

function ModelsTable({
  models,
  action,
}: {
  models: Record<string, (Model & { progress?: number })[]>;
  action: {
    icon: typeof CloudDownloadIcon;
    text: string;
    callback: (model: Model) => void;
  } | null;
}): JSX.Element {
  const flattened = Object.values(models).flatMap((x) => x);

  return (
    <Table>
      <Table.Body>
        {flattened.map((model, i) => (
          <Table.Row id={`${model.lang}-${model.name}`} key={i} /*progress = { model?.progress}*/>
            <Table.TextCell>{model.lang}</Table.TextCell>
            <Table.TextCell>{model.name}</Table.TextCell>
            <Table.TextCell isNumber>{model.size}</Table.TextCell>
            <Table.Cell>
              {model?.progress === undefined && action ? (
                <Tooltip content={action.text}>
                  <IconButton
                    icon={action.icon}
                    onClick={() => action.callback(model)}
                    id={i == 0 ? 'download' : ''}
                  />
                </Tooltip>
              ) : (
                <></>
              )}
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}
