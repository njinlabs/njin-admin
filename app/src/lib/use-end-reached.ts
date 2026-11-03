import { type RefObject, useEffect, useRef } from "react";

// Calls `onEnd` whenever the end of the scroll container is near. The observer is made again
// when the number of rows changes, so a page that did not fill the container still asks for more.
// Put the returned ref on an element at the end of the list.
export const useEndReached = (
  root: RefObject<HTMLElement | null>,
  enabled: boolean,
  onEnd: (() => void) | undefined,
  rows: number,
) => {
  const sentinel = useRef<HTMLDivElement>(null);
  const callback = useRef(onEnd);
  callback.current = onEnd;

  // biome-ignore lint/correctness/useExhaustiveDependencies: `rows` only restarts the observer.
  useEffect(() => {
    if (!enabled || !sentinel.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => entry?.isIntersecting && callback.current?.(),
      { root: root.current, rootMargin: "200px" },
    );
    observer.observe(sentinel.current);

    return () => observer.disconnect();
  }, [root, enabled, rows]);

  return sentinel;
};
