import { Form as AntdForm } from "antd";
import type { FormProps } from "./types";

function CustomForm(props: Readonly<FormProps>) {
  return <AntdForm {...(props as any)} />;
}

export const Form = Object.assign(CustomForm, {
  useForm: AntdForm.useForm,
  useWatch: AntdForm.useWatch,
  Item: AntdForm.Item,
  List: AntdForm.List,
  ErrorList: AntdForm.ErrorList,
  Provider: AntdForm.Provider,
});
