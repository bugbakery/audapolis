import { FileFilter, ipcRenderer } from 'electron';
import { IconButton } from './Controls';
import { MdFolderOpen } from 'react-icons/md';
import React from 'react';
import styled from 'styled-components';

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
    <IconButton
      icon={MdFolderOpen}
      text={'choose location...'}
      style={{ marginLeft: 10 }}
      onClick={onClick}
    />
  );
}

const FilePickerContainer = styled.span`
  display: flex;
`;
export function FilePickerWithText(props: {
  value: string;
  onChange: (newValue: string) => void;
  save: boolean;
  filters: FileFilter[];
}): JSX.Element {
  return (
    <FilePickerContainer>
      <input
        type="text"
        value={props.value}
        ref={(element) => {
          if (element) element.scrollLeft = element.scrollWidth;
        }}
        onChange={(e) => props.onChange(e.target.value)}
      />
      <FilePicker {...props} />
    </FilePickerContainer>
  );
}
