// src/hooks/arraySlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type ArrayState = string[];

const initialState: ArrayState = [];

const arraySlice = createSlice({
  name: "array",
  initialState,
  reducers: {
    addItem: (state, action: PayloadAction<string>) => {
      const value = action.payload;
      if (!state.includes(value)) {
        state.push(value);
      }
    },
    removeItem: (state, action: PayloadAction<number>) => {
      return state.filter((_, index) => index !== action.payload);
    },
    // optional: remove by value
    removeValue: (state, action: PayloadAction<string>) => {
      return state.filter((v) => v !== action.payload);
    },
    // optional: reset
    resetArray: () => initialState,
  },
});

export const { addItem, removeItem, removeValue, resetArray } = arraySlice.actions;
export default arraySlice.reducer;
