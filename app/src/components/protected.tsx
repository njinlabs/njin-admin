import { checkToken } from "@njinlabs/njin-admin/sdk";
import { useQuery } from "@tanstack/react-query";
import { Navigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useCookies } from "react-cookie";
import { client } from "../lib/client";
import { loadSchema } from "../lib/registry";
import { Shell } from "./shell";

// The pages behind the login. The token is checked with the server before anything is shown; a
// token it refuses is dropped, which sends the user back to the login page.
export const Protected = () => {
  const [cookies, , removeCookie] = useCookies(["token"]);
  const token: string | undefined = cookies.token;

  const { isError, isSuccess } = useQuery({
    queryKey: ["token", token],
    queryFn: async () => {
      client.defaults.headers.common.Authorization = `Bearer ${token}`;
      const user = await checkToken(client);
      // The menu comes from the schema, which needs the session.
      await loadSchema().catch(console.error);

      return user;
    },
    enabled: !!token,
    retry: false,
  });

  useEffect(() => {
    if (token && !isError) return;

    delete client.defaults.headers.common.Authorization;
    if (isError) removeCookie("token", { path: "/" });
  }, [token, isError, removeCookie]);

  if (!token) return <Navigate to="/login" />;
  if (!isSuccess) return null;

  return <Shell />;
};
