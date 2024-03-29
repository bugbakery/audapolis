import React, { ChangeEvent, useState } from 'react';
import { RootState } from '../../../state';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Checkbox, Dialog, FormField, Group, majorScale, TextInput } from 'evergreen-ui';
import { setFilterPopup } from '../../../state/editor/display';
import { useTheme } from '../../../components/theme';
import { filterContent } from '../../../state/editor/edit';

export function FilterDialog(): JSX.Element {
  const dispatch = useDispatch();

  const popupState = useSelector((state: RootState) => state.editor.present?.filterPopup);

  const [formState, setFormState] = useState<{
    searchString: string;
    level: 'word' | 'paragraph';
    caseInsensitive: boolean;
    useRegex: boolean;
  }>({ searchString: '', level: 'word', caseInsensitive: false, useRegex: false });

  const theme = useTheme();
  return (
    <Dialog
      onCloseComplete={() => dispatch(setFilterPopup(false))}
      isShown={popupState}
      title={`Filter document`}
      containerProps={{ backgroundColor: theme.colors.overlayBackgroundColor }}
      footer={({ close }) => (
        <>
          <Button onClick={() => dispatch(setFilterPopup(false))}>abort</Button>
          <Button
            marginLeft={majorScale(1)}
            appearance={'primary'}
            onClick={() => {
              dispatch(filterContent(formState));
              close();
            }}
          >
            Filter
          </Button>
        </>
      )}
    >
      <FormField label="Search string" marginBottom={majorScale(3)}>
        <TextInput
          width={'100%'}
          value={formState.searchString}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            console.log(`val: "${e.target.value}"`);
            setFormState((state) => ({ ...state, searchString: e.target.value }));
          }}
        />
      </FormField>
      <FormField
        marginBottom={majorScale(3)}
        label="Filter level"
        description="Setting this to 'Word' means that all words which match the search strings are kept in the document. Setting this to 'Paragraph' that the entire paragraph matching the search string is kept."
      >
        <Group width={'100%'}>
          <Button
            flex={1}
            isActive={formState.level == 'word'}
            onClick={() => {
              setFormState((state) => ({ ...state, level: 'word' }));
            }}
          >
            Word
          </Button>
          <Button
            flex={1}
            isActive={formState.level == 'paragraph'}
            onClick={() => {
              setFormState((state) => ({ ...state, level: 'paragraph' }));
            }}
          >
            Paragraph
          </Button>
        </Group>
      </FormField>
      <Checkbox
        label="Case-insensitive"
        checked={formState.caseInsensitive}
        onChange={(e) => setFormState((state) => ({ ...state, caseInsensitive: e.target.checked }))}
      />
      <Checkbox
        label="Use regular expressions"
        checked={formState.useRegex}
        onChange={(e) => setFormState((state) => ({ ...state, useRegex: e.target.checked }))}
      />
    </Dialog>
  );
}
