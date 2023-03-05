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
  Pane,
  PaneProps,
  Radio,
  StopIcon,
  Table,
  TableCellProps,
  TextTableCellProps,
  Tooltip,
  TrashIcon,
} from 'evergreen-ui';
import { Circle } from 'rc-progress';
import { openModelManager } from '../state/nav';
import { useEffect, useState } from 'react';
import { LanguageSettingsTour } from '../tour/LanguageSettingsTour';

function ModelTable({
  models,
  lang,
  type,
  id,
}: {
  models: Model[];
  lang: string;
  type: string;
  id?: string;
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

  const rows = [
    ...downloaded.map((model) => (
      <ModelTableRow
        row_model={model}
        className={'downloaded'}
        isDefault={defaultModel == model.model_id}
        action={
          <Tooltip content={'delete model'}>
            <IconButton icon={TrashIcon} onClick={() => dispatch(deleteModel(model))} />
          </Tooltip>
        }
        key={model.model_id}
        {...{ type, lang, setLocalDefaultModel, nameColumnsProps, lastColumnProps }}
      />
    )),
    ...downloading.map((model) => (
      <ModelTableRow
        row_model={model}
        isDefault={null}
        action={
          <Tooltip content={`downloading model ${Math.round(model.progress * 100)}%`}>
            <HoverSwitcher
              onClick={() => dispatch(cancelDownload(model.task_uuid))}
              hoverChild={<IconButton icon={StopIcon} />}
              defaultChild={
                <Button appearance={'minimal'} padding={0}>
                  <Circle
                    style={{ height: majorScale(3) }}
                    percent={model.progress * 100}
                    strokeWidth={50}
                    trailWidth={0}
                    strokeLinecap={'butt'}
                  />
                </Button>
              }
            />
          </Tooltip>
        }
        key={model.model_id}
        {...{ type, lang, setLocalDefaultModel, nameColumnsProps, lastColumnProps }}
      />
    )),
    ...notDownloaded.map((model) => (
      <ModelTableRow
        key={model.model_id}
        row_model={model}
        isDefault={null}
        action={
          <Tooltip content={'download model'}>
            <IconButton
              className={'download' /* for tour */}
              icon={CloudDownloadIcon}
              onClick={() => dispatch(downloadModel(model))}
            />
          </Tooltip>
        }
        {...{ type, lang, setLocalDefaultModel, nameColumnsProps, lastColumnProps }}
      />
    )),
  ];

  return (
    <Table id={id}>
      <Table.Head padding={0}>
        <Table.TextHeaderCell>⭐</Table.TextHeaderCell>
        <Table.TextHeaderCell {...nameColumnsProps}>Name</Table.TextHeaderCell>
        <Table.TextHeaderCell>Size</Table.TextHeaderCell>
        <Table.TextHeaderCell flexBasis={'55%'}>Description</Table.TextHeaderCell>
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

function ModelTableRow({
  row_model,
  className,
  isDefault,
  action,
  type,
  lang,
  setLocalDefaultModel,
  nameColumnsProps,
  lastColumnProps,
}: {
  row_model: Model;
  className?: string;
  isDefault: boolean | null;
  action: JSX.Element;
  type: string;
  lang: string;
  setLocalDefaultModel: (_arg0: string) => void;
  nameColumnsProps: TextTableCellProps;
  lastColumnProps: TableCellProps;
}): JSX.Element {
  return (
    <Table.Row id={row_model.name} className={className}>
      <Table.Cell>
        {isDefault !== null ? (
          <Radio
            checked={isDefault}
            name={`default-${type}`}
            onChange={() => {
              setDefaultModel(lang, type, row_model.model_id);
              setLocalDefaultModel(row_model.model_id);
            }}
          />
        ) : (
          <></>
        )}
      </Table.Cell>
      <Table.TextCell {...nameColumnsProps}>{row_model.name}</Table.TextCell>
      <Table.TextCell isNumber>{row_model.size}</Table.TextCell>
      <Table.TextCell flexBasis={'55%'}>{row_model.description}</Table.TextCell>
      <Table.Cell {...lastColumnProps}>{action}</Table.Cell>
    </Table.Row>
  );
}

function HoverSwitcher({
  hoverChild,
  defaultChild,
  ...switcherProps
}: PaneProps & {
  hoverChild: JSX.Element;
  defaultChild: JSX.Element;
}): JSX.Element {
  const [shownChild, setShownChild] = useState(defaultChild);

  return (
    <Pane
      {...switcherProps}
      onMouseLeave={() => {
        setShownChild(defaultChild);
      }}
      onMouseOver={() => {
        setShownChild(hoverChild);
      }}
    >
      {shownChild}
    </Pane>
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

  const all_downloaded = useSelector((state: RootState) => state.models.downloaded);
  const transcription_downloaded = language.transcription_models.filter(
    (x) => x.model_id in all_downloaded
  );

  return (
    <AppContainer>
      <LanguageSettingsTour hasDownloaded={transcription_downloaded.length > 0} />

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
          id={'transcription_table'}
        />

        <Heading marginTop={majorScale(3)} marginBottom={majorScale(2)} paddingLeft={majorScale(1)}>
          Punctuation Models for {language.lang}
        </Heading>
        <ModelTable
          models={language.punctuation_models}
          lang={language.lang}
          type={'punctuation'}
          id={'punctuation_table'}
        />

        <BackButton marginY={majorScale(2)} />
      </MainMaxWidthContainer>
    </AppContainer>
  );
}
