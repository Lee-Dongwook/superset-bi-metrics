export interface UserListModalProps {
  show: boolean;
  onHide: () => void;
  onSave: () => void;
}

export type FormValuesReturnType =
  | string
  | number
  | boolean
  | string[]
  | number[];

export type FormValues = {
  [key: string]: FormValuesReturnType;
};
