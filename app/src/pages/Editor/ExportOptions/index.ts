import { FileFilter } from 'electron';
import { MutableRefObject } from 'react';
import { Document } from '../../../core/document';
import { ProgressCallback } from '../../../core/ffmpeg';

export type ExportType = {
  type: string;
  defaultExtension: string;
  filters: FileFilter[];
  // We pass a ref as onExport which the type specific export component will set to its export function
  component: (props: {
    exportCallbackRef: MutableRefObject<
      (document: Document, path: string, progressCallback: ProgressCallback) => Promise<void>
    >;
    outputPath: string;
    setOutputPath: (path: string) => void;
  }) => JSX.Element;
};
