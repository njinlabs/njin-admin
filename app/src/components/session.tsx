import type { Permissions, Row } from "@njinlabs/njin-admin/sdk";
import { createContext, use } from "react";

// Who is signed in and what they may do. `Protected` loads both before it shows any page, so a
// page under it can read them without a loading state of its own.
type Session = { user: Row; permissions: Permissions };

export const SessionContext = createContext<Session | null>(null);

export const useSession = () => {
  const session = use(SessionContext);
  if (!session) throw new Error("useSession is used outside a signed-in page");

  return session;
};
