import {
  authorizationQuery,
  decideAuthorization,
  describeScope,
  groupScopes,
  logout,
  toApiError,
  useSession,
} from "@njinlabs/njin-admin/sdk";
import {
  Button,
  Checkbox,
  FieldError,
  Skeleton,
} from "@njinlabs/njin-admin/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AuthLayout } from "../components/auth-layout";
import { client } from "../lib/client";
import { endSession } from "../lib/session";

// The query string as the client sent it. Read from the address, not from the router's search
// (which would turn a `state` of "123" into a number), because the server checks every part.
export const requestOf = (searchStr: string) =>
  Object.fromEntries(new URLSearchParams(searchStr));

// The client is sent back to an address the server has already checked against what it
// registered; a script or data address is refused here too, since this is where the page leaves.
export const isSafeRedirect = (value: string) => {
  try {
    return !["javascript:", "data:", "vbscript:"].includes(
      new URL(value).protocol,
    );
  } catch {
    return false;
  }
};

// The client is another site (or a native app), so this really leaves the page.
const leave = (redirect: string) => {
  if (!isSafeRedirect(redirect)) return false;

  window.location.assign(redirect);
  return true;
};

const Loading = () => (
  <div className="space-y-4" role="status" aria-label="Loading">
    <Skeleton className="h-5 w-2/3" />
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-9 w-full" />
  </div>
);

// /oauth/authorize: where an app (an MCP client) asks to act as the signed-in user. The user
// chooses what it may do and is sent back to the app. Signing in is the admin's own; nothing about
// it is kept apart for this page.
export const AuthorizePage = () => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const searchStr = useLocation({ select: (location) => location.searchStr });
  const request = useMemo(() => requestOf(searchStr), [searchStr]);

  const authorization = useQuery(authorizationQuery(client, request));
  const { data } = authorization;

  // null until the user has chosen: every scope on offer is then ticked.
  const [chosen, setChosen] = useState<string[] | null>(null);
  const granted = chosen ?? data?.scopes ?? [];

  const [leaving, setLeaving] = useState(false);

  // Approved before, for at least this much: nothing to ask.
  useEffect(() => {
    if (data?.redirect) setLeaving(leave(data.redirect));
  }, [data?.redirect]);

  const decide = useMutation({
    mutationFn: (action: "approve" | "deny") =>
      decideAuthorization(client, request, { action, grant: granted }),
    onSuccess: ({ redirect }) => setLeaving(leave(redirect)),
  });

  const signOut = useMutation({
    mutationFn: () => logout(client),
    // The login page brings the user back here, and asks again for who they are.
    onSettled: () => endSession(queryClient),
  });

  const toggle = (scope: string, on: boolean) =>
    setChosen(
      on
        ? [...granted, scope]
        : granted.filter((existing) => existing !== scope),
    );

  if (authorization.isPending || data?.redirect || leaving) {
    return (
      <AuthLayout title="Authorize access" description="One moment…">
        <Loading />
      </AuthLayout>
    );
  }

  if (authorization.isError || !data) {
    return (
      <AuthLayout
        title="Cannot authorize"
        description="This request cannot be completed."
      >
        <FieldError>{toApiError(authorization.error).message}</FieldError>
        <p className="mt-4 text-sm text-muted-foreground">
          Go back to the app and start again.
        </p>
      </AuthLayout>
    );
  }

  const groups = groupScopes(data.scopes);
  const error = decide.error && toApiError(decide.error).message;
  const busy = decide.isPending || decide.isSuccess;

  return (
    <AuthLayout
      title={`Authorize ${data.client.name}`}
      description={`It wants to act on this site as you, and will return to ${data.host}.`}
    >
      <div className="space-y-6">
        {groups.length > 0 ? (
          <fieldset className="space-y-4">
            <legend className="mb-2 text-sm font-medium">
              It will be able to
            </legend>
            {groups.map(([resource, scopes]) => (
              <div key={resource} className="space-y-2">
                {scopes.map((scope) => (
                  <div key={scope} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      id={`scope-${scope}`}
                      checked={granted.includes(scope)}
                      onCheckedChange={(on) => toggle(scope, on)}
                      disabled={busy}
                    />
                    <label htmlFor={`scope-${scope}`}>
                      {describeScope(scope)}
                    </label>
                  </div>
                ))}
              </div>
            ))}
          </fieldset>
        ) : (
          <p className="text-sm text-muted-foreground">
            Your account has nothing this app could be given.
          </p>
        )}

        {error && <FieldError>{error}</FieldError>}

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            disabled={busy}
            onClick={() => decide.mutate("deny")}
          >
            Deny
          </Button>
          <Button
            className="flex-1"
            disabled={busy || granted.length === 0}
            onClick={() => decide.mutate("approve")}
          >
            {decide.isPending ? "Allowing…" : "Allow"}
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          Signed in as {String(user.email ?? "")}.{" "}
          <button
            type="button"
            className="underline hover:text-foreground"
            onClick={() => signOut.mutate()}
          >
            Not you?
          </button>
        </p>
      </div>
    </AuthLayout>
  );
};
