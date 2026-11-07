import {
  applyMiddleware,
  combineReducers,
  legacy_createStore as createStore,
  type UnknownAction,
} from "redux";
import { thunk } from "redux-thunk";
import { ADD_TOAST, REMOVE_TOAST } from "./components/Toast/actions";
import type { ToastMeta } from "./components/Toast/types";

function messageToasts(state: ToastMeta[] = [], action: UnknownAction) {
  const toast = action.payload as ToastMeta;
  switch (action.type) {
    case ADD_TOAST:
      if (toast.noDuplicate && state.some((t) => t.text === toast.text))
        return state;
      return [toast, ...state];
    case REMOVE_TOAST:
      return state.filter((t) => t.id !== toast.id);
    default:
      return state;
  }
}

export const store = createStore(
  combineReducers({ messageToasts }),
  applyMiddleware(thunk),
);

export type RootState = ReturnType<typeof store.getState>;
