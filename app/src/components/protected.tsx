import { checkToken, permissionsQuery } from "@njinlabs/njin-admin/sdk";
import { Button } from "@njinlabs/njin-admin/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useCookies } from "react-cookie";
import { client } from "../lib/client";
import { clearSession, watchExpiry } from "../lib/session";
import { SessionContext } from "./session";
import { Shell } from "./shell";

// The pages behind the login. The token is checked with the server before anything is shown; a
// token it refuses is dropped, which sends the user back to the login page.
export const Protected = () => {
  const [cookies, , removeCookie] = useCookies(["token"]);
  const token: string | undefined = cookies.token;
  const queryClient = useQueryClient();
  // Told to the login page, so someone sent there by a session that ended knows why.
  const [expired, setExpired] = useState(false);

  const { data: user, isError } = useQuery({
    queryKey: ["token", token],
    queryFn: async () => {
      client.defaults.headers.common.Authorization = `Bearer ${token}`;
      return checkToken(client);
    },
    enabled: !!token,
    retry: false,
  });

  // What the user may do shapes every page, so none is shown before it is known. It follows the
  // token: a refused token (above) has already sent the page to the login.
  const permissions = useQuery({
    ...permissionsQuery(client),
    enabled: !!user,
  });

  // A session can end while the page is open (the token expired, or was revoked elsewhere). Any
  // request the server refuses with 401 then signs out, instead of leaving pages that fail one by one.
  useEffect(() => {
    if (!token) return;

    return watchExpiry(client, token, () => {
      setExpired(true);
      clearSession(queryClient);
      removeCookie("token", { path: "/" });
    });
  }, [token, queryClient, removeCookie]);

  useEffect(() => {
    if (token && !isError) return;

    delete client.defaults.headers.common.Authorization;
    if (isError) {
      setExpired(true);
      removeCookie("token", { path: "/" });
    }
  }, [token, isError, removeCookie]);

  if (!token) {
    return (
      <Navigate
        to="/login"
        state={expired ? ({ expired: true } as never) : undefined}
      />
    );
  }
  if (!user) return null;
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
    <SessionContext value={{ user, permissions: permissions.data }}>
      <Shell user={user} />
    </SessionContext>
  );
};
