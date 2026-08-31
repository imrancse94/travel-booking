'use client';

import { useEffect, useState } from 'react';

/** Returns `value`, delayed by `delay` ms after the last change. Use for search inputs so requests fire once typing pauses. */
export function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export default useDebounce;
