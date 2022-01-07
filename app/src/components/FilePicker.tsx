import { FileFilter } from 'electron';
import React from 'react';
import { FolderOpenIcon, Group, IconButton, TextInput, Tooltip } from 'evergreen-ui';
import { openFile, saveFile } from '../../ipc/ipc_renderer';

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
    if (save) {
      const newPath = await saveFile({
        defaultPath: value,
        title: 'Save file as...',
        properties: ['createDirectory', 'showOverwriteConfirmation'],
        filters: [...filters, { name: 'All Files', extensions: ['*'] }],
      }).then((x) => x.filePath);
      if (newPath) onChange(newPath);
    } else {
      if (save) {
        const newPath = await openFile({
          defaultPath: value,
          title: 'Save file as...',
          properties: ['createDirectory', 'openFile', 'promptToCreate'],
          filters: [...filters, { name: 'All Files', extensions: ['*'] }],
        }).then((x) => x.filePaths[0]);
        if (newPath) onChange(newPath);
      }
    }
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
