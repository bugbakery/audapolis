import { useEffect, useState } from 'react';

export function useElementSize(
  element: HTMLElement | undefined | null,
  callback?: (size: { width: number; height: number }) => void
): { width: number; height: number } | null {
  const [size, setSize] = useState(null as null | { height: number; width: number });
  useEffect(() => {
    if (!element) return;

    const observer = new ResizeObserver(() => {
      const rect = element.getClientRects().item(0);
      if (!rect) return;
      const { width, height } = rect;
      if (callback) callback({ width, height });
      setSize({ width, height });
    });
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [element, callback]);

  return size;
}
