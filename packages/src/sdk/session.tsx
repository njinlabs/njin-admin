import type { AxiosInstance } from "axios";
import { createContext, use } from "react";
import type { Row } from "./api/model";
import { can, canOn, type Permissions } from "./api/permissions";

// Who is signed in and what they may do. The admin loads both before it shows any page, so a page
// (or a plugin) under it can read them without a loading state of its own. `client` is the admin's
// own axios instance: it carries the session's token, and a 401 on it signs the user out.
type Session = { user: Row; permissions: Permissions; client: AxiosInstance };

export const SessionContext = createContext<Session | null>(null);

export const useSession = () => {
  const session = use(SessionContext);
  if (!session) throw new Error("useSession is used outside a signed-in page");

  return session;
};

export const useClient = () => useSession().client;

// What the signed-in user may do with `action` on `resource` (see `can`).
export const useCan = (resource: string, action: string) =>
  can(useSession().permissions, resource, action);

// Whether they may do it on this one row (see `canOn`).
export const useCanOn = (resource: string, action: string, row: Row) => {
  const { user, permissions } = useSession();

  return canOn(permissions, resource, action, row, String(user.id));
};
