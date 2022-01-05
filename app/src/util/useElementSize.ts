import { useEffect, useState } from 'react';

export function useElementSize(
  element: HTMLElement | undefined | null
): { width: number; height: number } | null {
  const [size, setSize] = useState(null as null | { height: number; width: number });
  useEffect(() => {
    if (!element) return;

    const observer = new ResizeObserver(() => {
      const rect = element.getClientRects().item(0);
      if (!rect) return;
      const { width, height } = rect;
      setSize({ height, width });
    });
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [element]);

  return size;
}
