import { getSetupStatus } from "@njinlabs/njin-admin/sdk";
import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import { client } from "../lib/client";

// Until the first admin exists there is nothing to sign in to, so every page leads to the setup
// page, and once one exists the setup page leads away.
export const Root = () => {
  const onSetup = useRouterState({
    select: (state) =>
      state.matches.some(({ routeId }) => routeId === "/setup"),
  });

  const { data, isPending } = useQuery({
    queryKey: ["setup-status"],
    queryFn: () => getSetupStatus(client),
  });

  if (isPending) return null;
  if (data?.needsSetup && !onSetup) return <Navigate to="/setup" />;
  if (data && !data.needsSetup && onSetup) return <Navigate to="/login" />;

  return <Outlet />;
};
