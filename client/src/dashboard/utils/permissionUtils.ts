import type {
  UndefinedUser,
  UserWithPermissionsAndRoles,
} from "../../types/bootStrapTypes";

export function userHasPermission(
  user: UserWithPermissionsAndRoles | UndefinedUser,
  viewName: string,
  permissionName: string,
) {
  return (
    isUserAdmin(user) ||
    (isUserWithPermissionAndRoles(user) &&
      Object.values(user.roles || {})
        .flat()
        .some(
          (permissionView) =>
            permissionView[0] === permissionName &&
            permissionView[1] === viewName,
        ))
  );
}
