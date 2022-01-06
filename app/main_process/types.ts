import { MenuItemConstructorOptions } from 'electron';

export interface PatchType {
  click?: string;
  submenu?: MenuItemConstructorOptionsIpc[];
}
export type MenuItemConstructorOptionsIpc = Exclude<MenuItemConstructorOptions, PatchType> &
  PatchType;

export interface ServerInfo {
  port: null | number;
  token: null | string;
  state: string;
}
