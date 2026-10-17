import { t } from "@bi-metrics/core/translation";
import { getClientErrorObject, Client } from "";
import { SelectOption } from "";
import { Actions } from "";
import { FormValues } from "./types";

type AddDangerToast = (message: string) => void;

type GetUserDisplayLabelType = {
  first_name?: string;
  last_name?: string;
  username?: string;
};

type FieldToCheck = "roles" | "groups";
type GetFieldValue = { getFieldValue: (field: string) => Array<SelectOption> };

export const handleUserError = async (
  error: Response,
  action: Actions.CREATE | Actions.DELETE,
  addDangerToast: AddDangerToast,
): Promise<never> => {
  let errorMsg =
    action === Actions.CREATE
      ? t("There was an error caused on creating user.")
      : t("There was an error caused on updating user.");

  if (error.status === 400 || error.status === 422) {
    const errorData = await getClientErrorObject(error);
    const { message } = errorData;

    if (error.status === 400 && message && errorData.error) {
      errorMsg = errorData.error;
    } else if (
      error.status === 422 &&
      errorData.error?.includes("duplicate key value")
    ) {
      if (errorData.error.includes("ab_user_username_key")) {
        errorMsg = t("This username is already taken.");
      } else if (errorData.error.includes("ab_user_email_key")) {
        errorMsg = t("This email is already associated with an account.");
      }
    }
  }

  addDangerToast(errorMsg);
  throw error;
};

export const createUser = async (values: FormValues) => {
  const { confirmPassword: _confirmPassword, ...payload } = values;
  if (payload.active == null) {
    payload.active = false;
  }

  await Client.post({
    endpoint: "/api/v1/security/users/",
    jsonPayload: { ...payload },
  });
};

export const updateUser = async (userId: number, values: FormValues) => {
  const { confirmPassword: _confirmPassword, password, ...payload } = values;
  const user_Id = userId;

  await Client.put({
    endpoint: `/api/v1/security/users/${user_Id}`,
    jsonPayload: password ? { ...payload, password } : payload,
  });
};

export const deleteUser = async (userId: number) =>
  Client.delete({
    endpoint: `/api/v1/security/users/${userId}`,
  });

export const getUserDisplayLabel = (user: GetUserDisplayLabelType): string =>
  [user.first_name, user.last_name].filter(Boolean).join(" ") ||
  user.username ||
  t("N/A");

export const atLeastOneRoleOrGroup =
  (fieldToCheck: FieldToCheck) =>
  ({ getFieldValue }: GetFieldValue) => ({
    validator(_: object, value: Array<SelectOption>) {
      const current = value || [];
      const other = getFieldValue(fieldToCheck) || [];

      if (current.length === 0 && other.length === 0) {
        return Promise.reject(
          new Error(t("Please select at least one role or group")),
        );
      }
      return Promise.resolve();
    },
  });
