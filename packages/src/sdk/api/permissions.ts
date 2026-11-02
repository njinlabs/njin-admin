import { queryOptions } from "@tanstack/react-query";
import type { AxiosInstance } from "axios";
import type { Row } from "./model";

// How far an action reaches: every row ("all"), only the caller's own ("own"), or just enough to
// pick a record from a list ("ref", read only: the id and label a relation shows).
export type Level = "ref" | "own" | "all";

// What the caller may do, per resource: a model prefix, "vars.<prefix>", "file", "user",
// "access_group" or "analytics". A resource, or an action, the caller has nothing on is absent.
export type Permissions = {
  resource: string;
  // Whether "own" means anything for it: settings groups and analytics have no per-row owner.
  scoped: boolean;
  actions: Record<string, Level>;
}[];

// GET /api/auth/permissions. The server has already worked out the wildcards and the scopes of
// the token, so this is the answer to use, not the grants to interpret.
export const getPermissions = async (
  client: AxiosInstance,
): Promise<Permissions> => {
  const { data } = await client.get<{ data: Permissions }>(
    "/api/auth/permissions",
  );

  return data.data;
};

export const permissionsQuery = (client: AxiosInstance) =>
  queryOptions({
    queryKey: ["permissions"],
    queryFn: () => getPermissions(client),
  });

// What the caller may do with `action` on `resource`, or false. Models take "read", "create",
// "update", "delete" and "publish" (draftable ones); settings groups ("vars.<prefix>") "read" and
// "write".
export const can = (
  permissions: Permissions,
  resource: string,
  action: string,
): Level | false =>
  permissions.find((entry) => entry.resource === resource)?.actions[action] ??
  false;

// A relation comes expanded, so the creator is either the id or the record.
const creatorOf = (row: Row) => {
  const { createdBy } = row;

  return typeof createdBy === "object" && createdBy !== null
    ? (createdBy as { id?: unknown }).id
    : createdBy;
};

// Whether `userId` may do `action` on this one row: any row at "all", only their own at "own".
// The server decides in the end (someone else's row answers 404); this is for showing only what
// will work.
export const canOn = (
  permissions: Permissions,
  resource: string,
  action: string,
  row: Row,
  userId: string,
) => {
  const level = can(permissions, resource, action);

  return level === "all" || (level === "own" && creatorOf(row) === userId);
};

// Whether the caller can browse a list of `resource`: every row or their own. "ref" only fills a
// relation's dropdown, it is not a list to open.
export const canList = (permissions: Permissions, resource: string) => {
  const level = can(permissions, resource, "read");

  return level === "all" || level === "own";
};
