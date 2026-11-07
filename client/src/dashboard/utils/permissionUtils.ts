import {
  isUserWithPermissionsAndRoles,
  type UndefinedUser,
  type UserWithPermissionsAndRoles,
} from "../../types/bootStrapTypes";
import getBootstrapData from "../../utils/bootstrap";

const bootstrapData = getBootstrapData();
const ADMIN_ROLE_NAME = bootstrapData.common?.conf?.AUTH_ROLE_ADMIN || "Admin";

export const isUserAdmin = (
  user?: UserWithPermissionsAndRoles | UndefinedUser,
) =>
  isUserWithPermissionsAndRoles(user) &&
  Object.keys(user.roles || {}).some(
    (role) => role.toLowerCase() === ADMIN_ROLE_NAME.toLowerCase(),
  );

export function userHasPermission(
  user: UserWithPermissionsAndRoles | UndefinedUser,
  viewName: string,
  permissionName: string,
) {
  return (
    isUserAdmin(user) ||
    (isUserWithPermissionsAndRoles(user) &&
      Object.values(user.roles || {})
        .flat()
        .some(
          (permissionView) =>
            permissionView[0] === permissionName &&
            permissionView[1] === viewName,
        ))
  );
}
