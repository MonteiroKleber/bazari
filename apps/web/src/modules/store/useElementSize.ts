import { useEffect, useState } from 'react';

export function useElementSize<T extends HTMLElement>(element: T | null) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!element) return;

    const updateSize = () => {
      setSize({ width: element.offsetWidth, height: element.offsetHeight });
    };

    updateSize();

    const observer = new ResizeObserver(() => updateSize());
    observer.observe(element);

    return () => observer.disconnect();
  }, [element]);

  return size;
}

export default useElementSize;
