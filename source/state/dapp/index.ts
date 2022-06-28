import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { IDAppState, IDAppInfo } from './types';

export const initialState: IDAppState = {
  listening: {},
  whitelist: {},
};

const DAppState = createSlice({
  name: 'dapp',
  initialState,
  reducers: {
    registerListeningSite(
      state: IDAppState,
      action: PayloadAction<{ eventName: string; origin: string }>
    ) {
      const { origin, eventName } = action.payload;

      const originState = Object.prototype.hasOwnProperty.call(
        state.listening,
        origin
      )
        ? state.listening[origin].filter((item: string) => item !== eventName)
        : [];

      return {
        ...state,
        listening: {
          ...state.listening,
          [origin]: [...originState, eventName],
        },
      };
    },
    deregisterListeningSite(
      state: IDAppState,
      action: PayloadAction<{ eventName: string; origin: string }>
    ) {
      const { origin, eventName } = action.payload;

      const hasOriginListening = Object.prototype.hasOwnProperty.call(
        state.listening,
        origin
      );

      if (!hasOriginListening) return state;

      const originState = state.listening[origin].filter(
        (val: string) => val !== eventName
      );

      const retState = {
        ...state,
        listening: {
          ...state.listening,
          [origin]: originState,
        },
      };

      if (originState.length === 0) {
        delete retState.listening[origin];
      }

      return retState;
    },
    listNewDapp(
      state: IDAppState,
      action: PayloadAction<{
        accountId: number;
        dapp: IDAppInfo;
        id: string;
      }>
    ) {
      const { dapp, accountId } = action.payload;

      const id = action.payload.id.replace(/(^\w+:|^)\/\//, '');

      return {
        ...state,
        whitelist: {
          ...state.whitelist,
          [id]: {
            id,
            ...dapp,
            accountId,
          },
        },
      };
    },
    unlistDapp(state: IDAppState, action: PayloadAction<{ id: string }>) {
      delete state.whitelist[action.payload.id];
      delete state.listening[action.payload.id];
    },
  },
});

export const {
  listNewDapp,
  unlistDapp,
  registerListeningSite,
  deregisterListeningSite,
} = DAppState.actions;

export default DAppState.reducer;
