import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TitleBar } from '../components/TitleBar';
import { AppContainer, BackButton, MainMaxWidthContainer } from '../components/Util';
import { RootState } from '../state';
import { ChevronRightIcon, Heading, Icon, majorScale, Table, Tooltip } from 'evergreen-ui';
import { ModelManagerTour } from '../tour/ModelManagerTour';
import { useTheme } from '../components/theme';
import { openLanguageSettings } from '../state/nav';
import { Model } from '../state/models';

export function ModelManagerPage(): JSX.Element {
  const dispatch = useDispatch();
  const downloaded = useSelector((state: RootState) => state.models.downloaded);
  const languages = useSelector((state: RootState) => state.models.languages);

  const lastColumnProps = {
    flexGrow: 0,
    flexBasis: 60,
  };

  const firstColumnProps = {
    flexBasis: '5%',
  };

  const theme = useTheme();

  return (
    <AppContainer>
      <ModelManagerTour />

      <TitleBar />
      <MainMaxWidthContainer>
        <BackButton id={'back' /* for tour */} />

        <Heading marginTop={majorScale(3)} marginBottom={majorScale(2)} paddingLeft={majorScale(1)}>
          Languages
        </Heading>

        <Table id={'language_table'}>
          <Table.Head padding={0}>
            <Table.TextHeaderCell {...firstColumnProps}>Language</Table.TextHeaderCell>
            <Table.TextHeaderCell>Transcription Models</Table.TextHeaderCell>
            <Table.TextHeaderCell>Punctuation Models</Table.TextHeaderCell>
            <Table.TextHeaderCell {...lastColumnProps} />
          </Table.Head>

          <Table.Body>
            {/*sorting*/}
            {Object.values(languages).map((lang, i) => (
              <Table.Row
                isSelectable
                onSelect={() => {
                  dispatch(openLanguageSettings(lang.lang));
                }}
                id={lang.lang}
                key={i}
              >
                <Table.TextCell {...firstColumnProps}>{lang.lang}</Table.TextCell>
                <ModelNumberTextCell
                  models={lang.transcription_models}
                  lang={lang.lang}
                  downloaded={downloaded}
                />
                <ModelNumberTextCell
                  models={lang.punctuation_models}
                  lang={lang.lang}
                  downloaded={downloaded}
                />
                <Table.Cell {...lastColumnProps}>
                  <Tooltip content={'manage language'}>
                    <Icon color={theme.colors.default} icon={ChevronRightIcon} />
                  </Tooltip>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>

        <BackButton marginY={majorScale(2)} />
      </MainMaxWidthContainer>
    </AppContainer>
  );
}

function ModelNumberTextCell({
  models,
  lang,
  downloaded,
}: {
  models: Model[];
  lang: string;
  downloaded: Record<string, Model>;
}): JSX.Element {
  const downloaded_models = models.filter((x) => x.model_id in downloaded);
  if (models.length == 0) {
    return <Table.TextCell>Unsupported for {lang}</Table.TextCell>;
  } else if (models.length == downloaded_models.length) {
    return (
      <Table.TextCell>
        {models.length > 1 ? `All ${models.length} models downloaded` : 'Downloaded'}
      </Table.TextCell>
    );
  } else {
    return (
      <Table.TextCell>
        {models.length} available
        <br />
        {downloaded_models.length} downloaded
      </Table.TextCell>
    );
  }
}
