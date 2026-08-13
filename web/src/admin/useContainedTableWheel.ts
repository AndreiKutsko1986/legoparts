import { useCallback, type WheelEvent } from 'react';

export function useContainedTableWheel() {
  return useCallback((event: WheelEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    if (container.scrollHeight <= container.clientHeight) {
      return;
    }

    const delta = event.deltaY;
    const atTop = container.scrollTop <= 0;
    const atBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 1;

    if ((delta < 0 && atTop) || (delta > 0 && atBottom)) {
      return;
    }

    event.stopPropagation();
  }, []);
}
