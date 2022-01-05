interface Navigator {
  windowControlsOverlay: {
    visible: boolean;
    getBoundingClientRect: () => DOMRect;
  };
}
