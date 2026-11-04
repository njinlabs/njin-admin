import { permissionsQuery, SessionContext } from "@njinlabs/njin-admin/sdk";
import { Button } from "@njinlabs/njin-admin/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { client } from "../lib/client";
import { endSession, sessionQuery, watchExpiry } from "../lib/session";
import { Shell } from "./shell";

// The pages behind the login. The session (an HttpOnly cookie the page cannot see) is checked with
// the server before anything is shown; if it is refused, the user goes back to the login page.
// `bare` is for a page that needs the session but not the sidebar (authorizing an app).
export const Protected = ({ bare }: { bare?: boolean }) => {
  const queryClient = useQueryClient();
  // Where the login page brings the user back to: the page they were on, not always the dashboard.
  const here = useLocation({
    select: ({ href }) => (href === "/" ? undefined : href),
  });
  // Told to the login page, so someone sent there by a session that ended knows why.
  const [expired, setExpired] = useState(false);

  const session = useQuery(sessionQuery());
  const user = session.data;

  // What the user may do shapes every page, so none is shown before it is known. It follows the
  // session: one that was refused (above) has already sent the page to the login.
  const permissions = useQuery({
    ...permissionsQuery(client),
    enabled: !!user,
  });

  // A session can end while the page is open (it expired, or was revoked elsewhere). Any request
  // the server refuses with 401 then signs out, instead of leaving pages that fail one by one.
  useEffect(
    () =>
      watchExpiry(client, () => {
        setExpired(true);
        endSession(queryClient);
      }),
    [queryClient],
  );

  if (session.isPending) return null;
  if (session.isError) {
    return (
      <div className="grid min-h-screen place-items-center p-6">
        <div className="flex flex-col items-start gap-3 text-sm text-muted-foreground">
          <p>The server could not be reached.</p>
          <Button variant="outline" onClick={() => session.refetch()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }
  if (!user) {
    return (
      <Navigate
        to="/login"
        search={here ? ({ redirect: here } as never) : undefined}
        state={expired ? ({ expired: true } as never) : undefined}
      />
    );
  }
  if (permissions.isError) {
    return (
      <div className="grid min-h-screen place-items-center p-6">
        <div className="flex flex-col items-start gap-3 text-sm text-muted-foreground">
          <p>Your access could not be loaded.</p>
          <Button variant="outline" onClick={() => permissions.refetch()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }
  if (!permissions.data) return null;

  return (
    <SessionContext value={{ user, permissions: permissions.data, client }}>
      {bare ? <Outlet /> : <Shell user={user} />}
    </SessionContext>
  );
};

export const ProtectedBare = () => <Protected bare />;
