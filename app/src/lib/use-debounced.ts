import { useEffect, useState } from "react";

// `value`, but only after it has stopped changing for `delay` ms, so typing in a search box does
// not send a request per key.
export const useDebounced = <T>(value: T, delay = 400) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delay);

    return () => clearTimeout(timeout);
  }, [value, delay]);

  return debounced;
};
