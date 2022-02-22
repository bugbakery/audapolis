import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TitleBar } from '../components/TitleBar';
import { AppContainer, BackButton, MainMaxWidthContainer } from '../components/Util';
import { RootState } from '../state';
import {
  cancelDownload,
  deleteModel,
  downloadModel,
  getDefaultModel,
  Model,
  setDefaultModel,
} from '../state/models';
import {
  Button,
  CloudDownloadIcon,
  Heading,
  IconButton,
  majorScale,
  Radio,
  Table,
  Tooltip,
  TrashIcon,
} from 'evergreen-ui';
import { Circle } from 'rc-progress';
import { openModelManager } from '../state/nav';
import { useEffect, useState } from 'react';

function ModelTable({
  models,
  lang,
  type,
}: {
  models: Model[];
  lang: string;
  type: string;
}): JSX.Element {
  const dispatch = useDispatch();
  const all_downloaded = useSelector((state: RootState) => state.models.downloaded);
  const downloading_list = useSelector((state: RootState) => state.models.downloading);

  const model_ids = new Set(models.map((x) => x.model_id));

  const downloaded = models.filter((x) => x.model_id in all_downloaded);
  const downloading = downloading_list.filter((x) => model_ids.has(x.model_id));

  const notDownloaded = models.filter((x) => {
    const predicate = (candidate: Model) => candidate.model_id == x.model_id;
    const downloadedModel = downloaded.find(predicate);
    const downloadingModel = downloading.find(predicate);
    return !(downloadedModel || downloadingModel);
  });

  const lastColumnProps = {
    flexGrow: 0,
    flexBasis: 60,
  };

  const nameColumnsProps = {
    flexBasis: '10%',
  };

  const [defaultModel, setLocalDefaultModel] = useState(getDefaultModel(lang, type));
  if (defaultModel == null && downloaded.length > 0) {
    setLocalDefaultModel(downloaded[0].model_id);
    setDefaultModel(lang, type, downloaded[0].model_id);
  }
  useEffect(() => {
    if (defaultModel == null && downloaded.length > 0) {
      setLocalDefaultModel(downloaded[0].model_id);
      setDefaultModel(lang, type, downloaded[0].model_id);
    }
  }, [defaultModel, downloaded]);

  const rows = (
    <>
      {downloaded.map((model, i) => (
        <Table.Row
          id={`${model.lang}-${model.name}` /* for tour */}
          className={'downloaded' /* for tour */}
          key={i}
        >
          <Table.Cell>
            <Radio
              checked={defaultModel == model.model_id}
              name={`default-${lang}-${type}`}
              onChange={() => {
                setDefaultModel(lang, type, model.model_id);
                setLocalDefaultModel(model.model_id);
              }}
            />
          </Table.Cell>
          <Table.TextCell {...nameColumnsProps}>{model.name}</Table.TextCell>
          <Table.TextCell isNumber>{model.size}</Table.TextCell>
          <Table.TextCell flexBasis={'55%'}>{model.description}</Table.TextCell>
          {/*<Table.TextCell>{model.lang}</Table.TextCell>*/}
          <Table.Cell {...lastColumnProps}>
            <Tooltip content={'delete model'}>
              <IconButton icon={TrashIcon} onClick={() => dispatch(deleteModel(model))} />
            </Tooltip>
          </Table.Cell>
        </Table.Row>
      ))}
      {downloading.map((model, i) => (
        <Table.Row id={`${model.lang}-${model.name}` /* for tour */} key={i}>
          <Table.TextCell {...nameColumnsProps}>{model.name}</Table.TextCell>
          <Table.TextCell isNumber>{model.size}</Table.TextCell>
          <Table.TextCell flexBasis={'55%'}>{model.description}</Table.TextCell>
          {/*<Table.TextCell>{model.lang}</Table.TextCell>*/}
          <Table.Cell {...lastColumnProps}>
            <Tooltip content={`downloading model ${Math.round(model.progress * 100)}%`}>
              <Button
                padding={0}
                appearance={'minimal'}
                onClick={() => dispatch(cancelDownload(model.task_uuid))}
              >
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
        <Table.Row id={`${model.lang}-${model.name}` /* for tour */} key={i}>
          <Table.TextCell {...nameColumnsProps}>{model.name}</Table.TextCell>
          <Table.TextCell isNumber>{model.size}</Table.TextCell>
          <Table.TextCell flexBasis={'55%'}>{model.description}</Table.TextCell>
          {/*<Table.TextCell>{model.lang}</Table.TextCell>*/}
          <Table.Cell {...lastColumnProps}>
            <Tooltip content={'download model'}>
              <IconButton
                className={'download' /* for tour */}
                icon={CloudDownloadIcon}
                onClick={() => dispatch(downloadModel(model))}
              />
            </Tooltip>
          </Table.Cell>
        </Table.Row>
      ))}
    </>
  );

  return (
    <Table>
      <Table.Head padding={0}>
        <Table.TextHeaderCell>⭐</Table.TextHeaderCell>
        <Table.TextHeaderCell {...nameColumnsProps}>Name</Table.TextHeaderCell>
        <Table.TextHeaderCell>Size</Table.TextHeaderCell>
        <Table.TextHeaderCell flexBasis={'55%'}>Description</Table.TextHeaderCell>
        {/*<Table.TextHeaderCell>Languages</Table.TextHeaderCell>*/}
        <Table.TextHeaderCell {...lastColumnProps} />
      </Table.Head>

      <Table.Body>
        {models.length > 0 ? (
          rows
        ) : (
          <>
            <Table.Row>
              <Table.TextCell {...nameColumnsProps}>No models available for {lang}</Table.TextCell>
            </Table.Row>
          </>
        )}
      </Table.Body>
    </Table>
  );
}

export function LanguageSettingsPage(): JSX.Element {
  const dispatch = useDispatch();
  const selectedLanguage = useSelector((state: RootState) => state.models.selectedLanguage);

  if (selectedLanguage == null) {
    dispatch(openModelManager());
    return <></>;
  }
  const languages = useSelector((state: RootState) => state.models.languages);
  const language = languages[selectedLanguage];

  return (
    <AppContainer>
      {/*<ModelManagerTour hasDownloaded={Object.keys(downloaded).length > 0} />*/}

      <TitleBar />
      <MainMaxWidthContainer>
        <BackButton id={'back' /* for tour */} />

        <Heading marginTop={majorScale(3)} marginBottom={majorScale(2)} paddingLeft={majorScale(1)}>
          Transcription Models for {language.lang}
        </Heading>
        <ModelTable
          models={language.transcription_models}
          lang={language.lang}
          type={'transcription'}
        />

        <Heading marginTop={majorScale(3)} marginBottom={majorScale(2)} paddingLeft={majorScale(1)}>
          Punctuation Models for {language.lang}
        </Heading>
        <ModelTable
          models={language.punctuation_models}
          lang={language.lang}
          type={'punctuation'}
        />

        <BackButton marginY={majorScale(2)} />
      </MainMaxWidthContainer>
    </AppContainer>
  );
}
