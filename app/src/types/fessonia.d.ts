import '@tedconf/fessonia';
declare module '@tedconf/fessonia' {
  // the typings for the FilterNode constructor of fessonia are horribly wrong :(
  // TODO: fix upstream
  declare class FilterNode {
    constructor(filterName: string, args?: Record<string, string | number>);
  }
}
