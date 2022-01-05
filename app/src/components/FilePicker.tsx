import { FileFilter, ipcRenderer } from 'electron';
import React from 'react';
import { FolderOpenIcon, Group, IconButton, TextInput, Tooltip } from 'evergreen-ui';

export function FilePicker({
  value,
  onChange,
  filters,
  save,
}: {
  value: string;
  filters: FileFilter[];
  onChange: (newValue: string) => void;
  save: boolean;
}): JSX.Element {
  const onClick = async () => {
    const newPath = await ipcRenderer
      .invoke(save ? 'save-file' : 'open-file', {
        defaultPath: value,
        title: 'Save file as...',
        properties: ['saveFile'],
        filters: [...filters, { name: 'All Files', extensions: ['*'] }],
      })
      .then((x) => x.filePath);

    if (newPath) onChange(newPath);
  };

  return (
    <Tooltip content="choose location...">
      <IconButton icon={FolderOpenIcon} onClick={onClick} />
    </Tooltip>
  );
}

export function FilePickerWithText(props: {
  value: string;
  onChange: (newValue: string) => void;
  save: boolean;
  filters: FileFilter[];
}): JSX.Element {
  return (
    <Group width={'100%'}>
      <TextInput readOnly value={props.value} flex={1} textOverflow="ellipsis" paddingRight={0} />
      <FilePicker {...props} />
    </Group>
  );
}
