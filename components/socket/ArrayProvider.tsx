"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Item = unknown;

type ArrayState = {
  items: Item[];
  addItem: (item: Item) => void;
  removeItem: (index: number) => void;
  clear: () => void;
};

const ArrayCtx = createContext<ArrayState | null>(null);

export function ArrayProvider({
  children,
  initialItems = [],
}: {
  children: ReactNode;
  initialItems?: Item[];
}) {
  const [items, setItems] = useState<Item[]>(initialItems);

  const addItem = useCallback((item: Item) => {
    setItems((prev) => (prev.includes(item) ? prev : [...prev, item]));
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({ items, addItem, removeItem, clear }),
    [items, addItem, removeItem, clear]
  );

  return <ArrayCtx.Provider value={value}>{children}</ArrayCtx.Provider>;
}

export function useArray() {
  const ctx = useContext(ArrayCtx);
  if (!ctx) throw new Error("useArray must be used within <ArrayProvider>");
  return ctx;
}
