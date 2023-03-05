interface Navigator {
  windowControlsOverlay: {
    visible: boolean;
    getTitlebarAreaRect: () => DOMRect;
  };
}
