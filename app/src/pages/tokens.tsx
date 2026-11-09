import { zodResolver } from "@hookform/resolvers/zod";
import {
  type CreatedToken,
  createTokenMutation,
  describeScope,
  everything,
  groupScopes,
  revokeTokenMutation,
  type Token,
  toApiError,
  tokensQuery,
  useSession,
} from "@njinlabs/njin-admin/sdk";
import {
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  Dialog,
  Field,
  FieldError,
  FieldLabel,
  Input,
  Skeleton,
  toast,
} from "@njinlabs/njin-admin/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import z from "zod";
import { PageTitle } from "../components/header-slot";
import { client } from "../lib/client";
import { grantable } from "../lib/grantable";
import { LoadError } from "./users/shared";

const schema = z.object({
  name: z.string().trim().min(1, "Required").max(100, "At most 100 characters"),
  scopes: z.array(z.string()).min(1, "Choose what the token may do"),
});

type Values = z.infer<typeof schema>;

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

// The token's name and what it may do. The token itself comes back from the server once created.
const CreateDialog = ({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (created: CreatedToken) => void;
}) => {
  const queryClient = useQueryClient();
  const { permissions } = useSession();
  const create = useMutation(createTokenMutation(client, queryClient));

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", scopes: [] },
  });

  const options = grantable(permissions);
  const error = create.error && toApiError(create.error).message;

  const close = () => {
    create.reset();
    form.reset();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !next && close()}
      title="New personal token"
      footer={
        <>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form="token-form" disabled={create.isPending}>
            {create.isPending ? "Creating…" : "Create"}
          </Button>
        </>
      }
    >
      <form
        id="token-form"
        noValidate
        onSubmit={form.handleSubmit((values) =>
          create.mutate(values, {
            onSuccess: (created) => {
              close();
              onCreated(created);
            },
          }),
        )}
        className="min-h-0 space-y-4 overflow-y-auto"
      >
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <Field invalid={fieldState.invalid}>
              <FieldLabel>Name</FieldLabel>
              <Input {...field} placeholder="Deploy script" />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="scopes"
          render={({ field: { value, onChange }, fieldState }) => {
            const all = value.includes(everything);

            return (
              <div className="space-y-3">
                <p className="text-sm font-medium">Access</p>
                <p className="text-sm text-muted-foreground">
                  A token can never do more than you can. To change its access
                  later, make a new one.
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <Checkbox
                    id="token-everything"
                    checked={all}
                    onCheckedChange={(on) => onChange(on ? [everything] : [])}
                  />
                  <label htmlFor="token-everything">
                    {describeScope(everything)}
                  </label>
                </div>
                {!all &&
                  groupScopes(options).map(([resource, scopes]) => (
                    <div key={resource} className="space-y-2">
                      {scopes.map((scope) => (
                        <div
                          key={scope}
                          className="flex items-center gap-2 text-sm"
                        >
                          <Checkbox
                            id={`token-${scope}`}
                            checked={value.includes(scope)}
                            onCheckedChange={(on) =>
                              onChange(
                                on
                                  ? [...value, scope]
                                  : value.filter((entry) => entry !== scope),
                              )
                            }
                          />
                          <label htmlFor={`token-${scope}`}>
                            {describeScope(scope)}
                          </label>
                        </div>
                      ))}
                    </div>
                  ))}
                <FieldError errors={[fieldState.error]} />
              </div>
            );
          }}
        />

        {error && <FieldError>{error}</FieldError>}
      </form>
    </Dialog>
  );
};

// The only time the token can be read: the server keeps a hash of it, not the token.
const CreatedDialog = ({
  created,
  onClose,
}: {
  created: CreatedToken | null;
  onClose: () => void;
}) => (
  <Dialog
    open={!!created}
    onOpenChange={(open) => !open && onClose()}
    title="Copy your token"
    footer={<Button onClick={onClose}>Done</Button>}
  >
    <p className="mb-3 text-sm text-muted-foreground">
      This is the only time it is shown. Store it somewhere safe; if it is lost,
      revoke it and make a new one.
    </p>
    <div className="flex gap-2">
      <Input readOnly value={created?.token ?? ""} aria-label="Token" />
      <Button
        variant="outline"
        onClick={() =>
          created &&
          navigator.clipboard
            .writeText(created.token)
            .then(() => toast.success("Token copied"))
            .catch(() => toast.error("Could not copy. Select it and copy."))
        }
      >
        Copy
      </Button>
    </div>
    <p className="mt-3 text-sm text-muted-foreground">
      Send it as <code>Authorization: Bearer &lt;token&gt;</code>.
    </p>
  </Dialog>
);

const ListSkeleton = () => (
  <div className="space-y-3" role="status" aria-label="Loading">
    {[0, 1].map((key) => (
      <Skeleton key={key} className="h-24 w-full" />
    ))}
  </div>
);

// /tokens: personal access tokens, for a script or service that needs the REST API as this user,
// limited to what is chosen here. For anyone signed in; the server lets only a session manage them.
export const TokensPage = () => {
  const queryClient = useQueryClient();
  const tokens = useQuery({
    ...tokensQuery(client),
    // Sign-ins and connected apps have their own places.
    select: (all) => all.filter((token) => token.kind === "pat"),
  });
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<CreatedToken | null>(null);
  const [removing, setRemoving] = useState<Token | null>(null);

  const revoke = useMutation(revokeTokenMutation(client, queryClient));

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <PageTitle>Personal tokens</PageTitle>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="max-w-xl text-sm text-muted-foreground">
          Tokens for a script or service that calls the REST API as you. Each
          can do only what you choose, and never more than you can. They do not
          expire: revoke one to stop it.
        </p>
        <Button onClick={() => setCreating(true)}>New token</Button>
      </div>

      {tokens.isPending && <ListSkeleton />}
      {tokens.isError && (
        <LoadError what="Personal tokens" onRetry={() => tokens.refetch()} />
      )}
      {tokens.data?.length === 0 && (
        <p className="rounded-control border border-dashed p-6 text-center text-sm text-muted-foreground">
          No personal token yet.
        </p>
      )}

      {tokens.data?.map((token) => (
        <section
          key={token.id}
          className="space-y-3 rounded-control border p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate font-medium">{token.name}</h2>
              <p className="text-sm text-muted-foreground">
                Created {when(token.createdAt)} · last used{" "}
                {when(token.lastUsedAt)}
              </p>
            </div>
            <Button
              size="sm"
              variant="danger-ghost"
              onClick={() => setRemoving(token)}
            >
              Revoke
            </Button>
          </div>
          <Scopes scopes={token.scopes} />
        </section>
      ))}

      <CreateDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={setCreated}
      />
      <CreatedDialog created={created} onClose={() => setCreated(null)} />

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Revoke ${removing?.name ?? "token"}?`}
        description="Whatever uses it stops working at once. This cannot be undone."
        confirmLabel={revoke.isPending ? "Revoking…" : "Revoke"}
        pending={revoke.isPending}
        variant="danger"
        onConfirm={() =>
          removing &&
          revoke.mutate(removing.id, {
            onSuccess: () => {
              toast.success("Token revoked");
              setRemoving(null);
            },
            onError: (error) => toast.error(toApiError(error).message),
          })
        }
      />
    </div>
  );
};
