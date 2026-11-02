import { zodResolver } from "@hookform/resolvers/zod";
import {
  can,
  canOn,
  createRecordMutation,
  type Row,
  recordQuery,
  recordsQuery,
  toApiError,
  updateRecordMutation,
} from "@njinlabs/njin-admin/sdk";
import {
  Button,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  Input,
  MultiSelect,
  Skeleton,
} from "@njinlabs/njin-admin/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { Controller, useForm } from "react-hook-form";
import z from "zod";
import { HeaderActions, PageTitle } from "../../components/header-slot";
import { PasswordInput } from "../../components/password-input";
import { useSession } from "../../components/session";
import { client } from "../../lib/client";
import { idOf, LoadError, NoAccess } from "./shared";

const fields = {
  name: z.string().min(1, "Required"),
  email: z.email("Enter a valid email"),
  groups: z.array(z.string()),
};

// A new user needs a password; on an existing one an empty password means "keep it".
const createSchema = z.object({
  ...fields,
  password: z.string().min(8, "At least 8 characters"),
});
const editSchema = z.object({
  ...fields,
  password: z.string().min(8, "At least 8 characters").or(z.literal("")),
});

type Values = z.infer<typeof createSchema>;

const UserForm = ({ record }: { record?: Row }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { permissions } = useSession();
  const editing = !!record;

  // Which groups a user is in decides what they can do, so the server asks for the right to edit
  // groups; without it the field is not shown and not sent.
  const mayAssign = !!can(permissions, "access_group", "update");
  const groups = useQuery({
    ...recordsQuery(client, "access_group", { limit: 100 }),
    enabled: mayAssign,
  });

  const form = useForm<Values>({
    resolver: zodResolver(editing ? editSchema : createSchema),
    defaultValues: {
      name: (record?.name as string | undefined) ?? "",
      email: (record?.email as string | undefined) ?? "",
      password: "",
      groups: Array.isArray(record?.groups) ? record.groups.map(idOf) : [],
    },
  });

  const create = useMutation(createRecordMutation(client, queryClient, "user"));
  const update = useMutation(updateRecordMutation(client, queryClient, "user"));
  const saving = create.isPending || update.isPending;
  const failure = create.error ?? update.error;
  const error = failure && toApiError(failure);

  const save = (values: Values) => {
    const input = {
      name: values.name,
      email: values.email,
      ...(values.password && { password: values.password }),
      ...(mayAssign && { groups: values.groups }),
    };
    const options = {
      onSuccess: () => {
        // A user may have just changed their own groups, and with them what they may do.
        queryClient.invalidateQueries({ queryKey: ["permissions"] });
        queryClient.invalidateQueries({ queryKey: ["token"] });
        navigate({ to: "/users" });
      },
      onError: (failed: unknown) => {
        for (const [path, message] of Object.entries(
          toApiError(failed).fields,
        )) {
          form.setError(path as keyof Values, { message });
        }
      },
    };

    if (record) update.mutate({ id: record.id, input }, options);
    else create.mutate(input, options);
  };

  const options = (groups.data?.data ?? []).map((group) => ({
    value: group.id,
    label: String(group.name ?? group.id),
  }));

  return (
    <>
      <PageTitle>{editing ? "Edit user" : "New user"}</PageTitle>
      <HeaderActions>
        <Button
          variant="outline"
          render={<Link to="/users" />}
          nativeButton={false}
        >
          Cancel
        </Button>
        <Button type="submit" form="user-form" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </HeaderActions>

      <form
        id="user-form"
        noValidate
        onSubmit={form.handleSubmit(save)}
        className="max-w-xl space-y-5"
      >
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <Field invalid={fieldState.invalid}>
              <FieldLabel>Name</FieldLabel>
              <Input {...field} autoComplete="off" />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <Field invalid={fieldState.invalid}>
              <FieldLabel>Email</FieldLabel>
              <Input {...field} type="email" autoComplete="off" />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <Field invalid={fieldState.invalid}>
              <FieldLabel>{editing ? "New password" : "Password"}</FieldLabel>
              <PasswordInput {...field} autoComplete="new-password" />
              {editing && (
                <FieldDescription>
                  Leave empty to keep the current one.
                </FieldDescription>
              )}
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        {mayAssign && (
          <Controller
            control={form.control}
            name="groups"
            render={({ field, fieldState }) => (
              <Field invalid={fieldState.invalid}>
                <FieldLabel>Access groups</FieldLabel>
                <MultiSelect
                  options={options}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder={groups.isPending ? "Loading…" : "No access"}
                />
                <FieldDescription>
                  What the user may do is everything their groups grant. Without
                  a group they can sign in but do nothing.
                </FieldDescription>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        )}

        {error && Object.keys(error.fields).length === 0 && (
          <FieldError>{error.message}</FieldError>
        )}
      </form>
    </>
  );
};

// /users/new and /users/$id/edit
export const UserFormPage = () => {
  const { id } = useParams({ strict: false }) as { id?: string };
  const { user, permissions } = useSession();
  const record = useQuery({
    ...recordQuery(client, "user", id ?? ""),
    enabled: !!id,
  });

  if (!can(permissions, "user", id ? "update" : "create")) {
    return <NoAccess what="this page" />;
  }
  if (!id) return <UserForm />;

  if (record.isPending) return <Skeleton className="h-64 w-full max-w-xl" />;
  if (record.isError) {
    return <LoadError what="The user" onRetry={() => record.refetch()} />;
  }
  if (!record.data)
    return <p className="text-muted-foreground">No such user.</p>;
  if (!canOn(permissions, "user", "update", record.data, user.id)) {
    return <NoAccess what="this user" />;
  }

  return <UserForm key={record.data.id} record={record.data} />;
};
