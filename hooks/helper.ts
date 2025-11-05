// src/hooks/useArrayHelper.ts
import { useState, useCallback, useRef } from "react";

export type UseArrayHelperOptions<T> = {
  /** Seed values (used on mount) */
  initialItems?: T[];
  /** Prevent duplicates (default: true) */
  unique?: boolean;
  /** Custom equality (used when unique=true or removing by value) */
  equals?: (a: T, b: T) => boolean;
};

export function useArrayHelper<T = string>(options?: UseArrayHelperOptions<T>) {
  const { initialItems = [], unique = true, equals } = options ?? {};
  // keep the original seed around for reset()
  const seedRef = useRef<T[]>(initialItems);
  const [items, setItems] = useState<T[]>(seedRef.current);

  const isEqual = useCallback(
    (a: T, b: T) => (equals ? equals(a, b) : Object.is(a, b)),
    [equals]
  );

  const addItem = useCallback(
    (item: T) => {
      setItems(prev => {
        if (!unique) return [...prev, item];
        return prev.some(x => isEqual(x, item)) ? prev : [...prev, item];
      });
    },
    [unique, isEqual]
  );

  const toggleItem = useCallback(
    (item: T) => {
      setItems(prev => {
        const idx = prev.findIndex(x => isEqual(x, item));
        if (idx >= 0) return prev.filter((_, i) => i !== idx);
        return unique && prev.some(x => isEqual(x, item)) ? prev : [...prev, item];
      });
    },
    [unique, isEqual]
  );

  const removeItemAt = useCallback((index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const removeItem = useCallback(
    (item: T) => {
      setItems(prev => prev.filter(x => !isEqual(x, item)));
    },
    [isEqual]
  );

  const clear = useCallback(() => setItems([]), []);
  const reset = useCallback(() => setItems(seedRef.current), []);

  const contains = useCallback((item: T) => items.some(x => isEqual(x, item)), [items, isEqual]);

  return {
    items,
    setItems,     // escape hatch
    addItem,
    toggleItem,   // new
    removeItemAt,
    removeItem,
    clear,
    reset,        // new
    contains,     // new
    length: items.length,
  };
}
// Safe sessionStorage helpers (won't crash in SSR/tests)
 export const ssGet = (key: string): string | null => {
  try {
    if (typeof window === "undefined") return null;
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

export const ssGetJSON = <T = unknown>(key: string, fallback: T): T => {
  try {
    if (typeof window === "undefined") return fallback;
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
