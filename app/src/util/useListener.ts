import { DependencyList, useEffect } from 'react';

export function useWindowEvent<K extends keyof WindowEventMap>(
  type: K,
  listener: (this: Window, ev: WindowEventMap[K]) => any,
  deps: DependencyList = []
) {
  useEffect(() => {
    window.addEventListener(type, listener);
    return () => window.removeEventListener(type, listener);
  }, deps);
}

export function useDocumentEvent<K extends keyof DocumentEventMap>(
  type: K,
  listener: (this: Document, ev: DocumentEventMap[K]) => any,
  deps: DependencyList = []
) {
  useEffect(() => {
    document.addEventListener(type, listener);
    return () => document.removeEventListener(type, listener);
  }, deps);
}
