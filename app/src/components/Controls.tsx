import { CloudDownloadIcon, IconButton, Tooltip } from 'evergreen-ui';
import * as React from 'react';

export function ToggleIconButton(props: {
  clicked?: boolean;
  disabled?: boolean;
  icon: typeof CloudDownloadIcon;
  text: string;
  onClick: any;
}): JSX.Element {
  // TODO
  return (
    <Tooltip content={props.text}>
      <IconButton icon={props.icon} onClick={props.onClick} />
    </Tooltip>
  );
}
