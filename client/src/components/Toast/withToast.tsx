import type { ComponentType } from "react";
import { useMemo } from "react";
import { bindActionCreators } from "redux";
import { connect, useDispatch } from "react-redux";

import {
  addDangerToast,
  addInfoToast,
  addSuccessToast,
  addWarningToast,
} from "./actions";

export interface ToastProps {
  addDangerToast: typeof addDangerToast;
  addInfoToast: typeof addInfoToast;
  addSuccessToast: typeof addSuccessToast;
  addWarningToast: typeof addWarningToast;
}

export const toasters = {
  addInfoToast,
  addSuccessToast,
  addWarningToast,
  addDangerToast,
};

export default function withToasts(BaseComponent: ComponentType<any>) {
  return connect(null, (dispatch) => bindActionCreators(toasters, dispatch))(
    BaseComponent,
  ) as any;
}

export function useToasts() {
  const dispatch = useDispatch();
  return useMemo(() => bindActionCreators(toasters, dispatch), [dispatch]);
}
