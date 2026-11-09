import {
  type Connection,
  connectionsQuery,
  describeScope,
  everything,
  groupScopes,
  revokeConnectionMutation,
  toApiError,
  updateConnectionMutation,
  useSession,
} from "@njinlabs/njin-admin/sdk";
import {
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  Dialog,
  FieldError,
  Skeleton,
  toast,
} from "@njinlabs/njin-admin/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageTitle } from "../components/header-slot";
import { client } from "../lib/client";
import { grantable } from "../lib/grantable";
import { LoadError } from "./users/shared";

const when = (value: string | null) =>
  value ? new Date(value).toLocaleString() : "never";

const Scopes = ({ scopes }: { scopes: string[] }) =>
  scopes.includes(everything) ? (
    <Badge variant="primary">Everything you can do</Badge>
  ) : (
    <div className="flex flex-wrap gap-1">
      {scopes.map((scope) => (
        <Badge key={scope}>{describeScope(scope)}</Badge>
      ))}
    </div>
  );

// Access can only be narrowed here: the server refuses to widen it.
const NarrowDialog = ({
  connection,
  onClose,
}: {
  connection: Connection | null;
  onClose: () => void;
}) => {
  const queryClient = useQueryClient();
  const { permissions } = useSession();
  const [chosen, setChosen] = useState<string[] | null>(null);

  const update = useMutation(updateConnectionMutation(client, queryClient));

  const options = connection?.scopes.includes(everything)
    ? grantable(permissions)
    : (connection?.scopes ?? []);
  const granted = chosen ?? options;
  const error = update.error && toApiError(update.error).message;

  const toggle = (scope: string, on: boolean) =>
    setChosen(
      on ? [...granted, scope] : granted.filter((entry) => entry !== scope),
    );

  const close = () => {
    update.reset();
    setChosen(null);
    onClose();
  };

  return (
    <Dialog
      open={!!connection}
      onOpenChange={(open) => !open && close()}
      title={connection ? `Access for ${connection.clientName}` : "Access"}
      footer={
        <>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button
            disabled={update.isPending || granted.length === 0}
            onClick={() =>
              connection &&
              update.mutate(
                { id: connection.id, scopes: granted },
                {
                  onSuccess: () => {
                    toast.success("Access updated");
                    close();
                  },
                },
              )
            }
          >
            {update.isPending ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-muted-foreground">
        You can take access away from this app, not give it more. To give it
        more, connect it again.
      </p>
      <div className="min-h-0 space-y-4 overflow-y-auto">
        {groupScopes(options).map(([resource, scopes]) => (
          <div key={resource} className="space-y-2">
            {scopes.map((scope) => (
              <div key={scope} className="flex items-center gap-2 text-sm">
                <Checkbox
                  id={`narrow-${scope}`}
                  checked={granted.includes(scope)}
                  onCheckedChange={(on) => toggle(scope, on)}
                />
                <label htmlFor={`narrow-${scope}`}>
                  {describeScope(scope)}
                </label>
              </div>
            ))}
          </div>
        ))}
      </div>
      {error && <FieldError>{error}</FieldError>}
    </Dialog>
  );
};

const ListSkeleton = () => (
  <div className="space-y-3" role="status" aria-label="Loading">
    {[0, 1].map((key) => (
      <Skeleton key={key} className="h-28 w-full" />
    ))}
  </div>
);

// /connections: the apps (MCP clients such as Claude) the user has let act for them. For anyone
// signed in, since it is about their own session; a token can't open it, the server sees to that.
export const ConnectionsPage = () => {
  const queryClient = useQueryClient();
  const connections = useQuery(connectionsQuery(client));
  const [narrowing, setNarrowing] = useState<Connection | null>(null);
  const [removing, setRemoving] = useState<Connection | null>(null);

  const revoke = useMutation(revokeConnectionMutation(client, queryClient));

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <PageTitle>Connected apps</PageTitle>
      <p className="text-sm text-muted-foreground">
        Apps you have let act on this site as you. Disconnecting one stops it at
        once.
      </p>

      {connections.isPending && <ListSkeleton />}
      {connections.isError && (
        <LoadError
          what="Connected apps"
          onRetry={() => connections.refetch()}
        />
      )}
      {connections.data?.length === 0 && (
        <p className="rounded-control border border-dashed p-6 text-center text-sm text-muted-foreground">
          No app is connected.
        </p>
      )}

      {connections.data?.map((connection) => (
        <section
          key={connection.id}
          className="space-y-3 rounded-control border p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate font-medium">{connection.clientName}</h2>
              <p className="text-sm text-muted-foreground">
                Connected {when(connection.grantedAt)} · last used{" "}
                {when(connection.lastUsedAt)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setNarrowing(connection)}
              >
                Access
              </Button>
              <Button
                size="sm"
                variant="danger-ghost"
                onClick={() => setRemoving(connection)}
              >
                Disconnect
              </Button>
            </div>
          </div>
          <Scopes scopes={connection.scopes} />
        </section>
      ))}

      <NarrowDialog
        key={narrowing?.id}
        connection={narrowing}
        onClose={() => setNarrowing(null)}
      />

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Disconnect ${removing?.clientName ?? "app"}?`}
        description="It stops working at once and has to ask for access again."
        confirmLabel={revoke.isPending ? "Disconnecting…" : "Disconnect"}
        pending={revoke.isPending}
        variant="danger"
        onConfirm={() =>
          removing &&
          revoke.mutate(removing.id, {
            onSuccess: () => {
              toast.success("App disconnected");
              setRemoving(null);
            },
            onError: (error) => toast.error(toApiError(error).message),
          })
        }
      />
    </div>
  );
};
