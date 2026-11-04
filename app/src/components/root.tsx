import { getSetupStatus } from "@njinlabs/njin-admin/sdk";
import { useQuery } from "@tanstack/react-query";
import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { client } from "../lib/client";
import { Status } from "./status";

// Until the first admin exists there is nothing to sign in to, so every page leads to the setup
// page, and once one exists the setup page leads away.
export const Root = () => {
  const onSetup = useRouterState({
    select: (state) =>
      state.matches.some(({ routeId }) => routeId === "/setup"),
  });

  // No retries: with the server down they kept the page waiting for several seconds.
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["setup-status"],
    queryFn: () => getSetupStatus(client),
    retry: false,
  });

  // Once per target (see Protected): `Navigate` fires again on every render.
  const navigate = useNavigate();
  const target = data?.needsSetup
    ? onSetup
      ? undefined
      : "/setup"
    : data && onSetup
      ? "/login"
      : undefined;
  useEffect(() => {
    if (target) navigate({ to: target, replace: true });
  }, [target, navigate]);

  if (isPending) return <Status>Connecting to the server…</Status>;
  if (isError) {
    return (
      <Status retry={() => refetch()}>The server could not be reached.</Status>
    );
  }
  if (target) return <Status>Redirecting…</Status>;

  return <Outlet />;
};
