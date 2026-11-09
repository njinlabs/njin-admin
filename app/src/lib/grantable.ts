import type { Permissions } from "@njinlabs/njin-admin/sdk";

// What the user could hand out themselves, as "<resource>:<action>": the choices for a token or an
// app that is made narrower than the user.
export const grantable = (permissions: Permissions) =>
  permissions.flatMap(({ resource, actions }) =>
    Object.entries(actions)
      .filter(([, level]) => level === "all" || level === "own")
      .map(([action]) => `${resource}:${action}`),
  );
