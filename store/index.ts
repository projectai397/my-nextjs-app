import { configureStore } from "@reduxjs/toolkit";
import arrayReducer from "@/hooks/arraySlice"; // your TS slice

export const store = configureStore({
  reducer: {
    array: arrayReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
