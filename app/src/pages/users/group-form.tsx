import { zodResolver } from "@hookform/resolvers/zod";
import {
  accessCatalogQuery,
  type CatalogEntry,
  can,
  canOn,
  createRecordMutation,
  type Row,
  recordQuery,
  toApiError,
  updateRecordMutation,
} from "@njinlabs/njin-admin/sdk";
import {
  Button,
  Field,
  FieldError,
  FieldLabel,
  Input,
} from "@njinlabs/njin-admin/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { Controller, useForm } from "react-hook-form";
import z from "zod";
import { FormSkeleton } from "../../components/form-skeleton";
import { HeaderActions, PageTitle } from "../../components/header-slot";
import { useSession } from "../../components/session";
import { client } from "../../lib/client";
import { GrantsEditor } from "./grants-editor";
import { LoadError, NoAccess } from "./shared";

const schema = z.object({
  name: z.string().min(1, "Required"),
  description: z.string(),
  grants: z.array(z.string()),
});

type Values = z.infer<typeof schema>;

const GroupForm = ({
  record,
  catalog,
}: {
  record?: Row;
  catalog: CatalogEntry[];
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const editing = !!record;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: (record?.name as string | undefined) ?? "",
      description: (record?.description as string | undefined) ?? "",
      grants: Array.isArray(record?.grants) ? (record.grants as string[]) : [],
    },
  });

  const create = useMutation(
    createRecordMutation(client, queryClient, "access_group"),
  );
  const update = useMutation(
    updateRecordMutation(client, queryClient, "access_group"),
  );
  const saving = create.isPending || update.isPending;
  const failure = create.error ?? update.error;
  const error = failure && toApiError(failure);

  const save = (values: Values) => {
    const options = {
      onSuccess: () => {
        // Users show their groups' names, and whoever is in this group may now do something else.
        queryClient.invalidateQueries({ queryKey: ["model", "user"] });
        queryClient.invalidateQueries({ queryKey: ["permissions"] });
        navigate({ to: "/users/groups" });
      },
      onError: (failed: unknown) => {
        for (const [path, message] of Object.entries(
          toApiError(failed).fields,
        )) {
          form.setError(path as keyof Values, { message });
        }
      },
    };

    if (record) update.mutate({ id: record.id, input: values }, options);
    else create.mutate(values, options);
  };

  return (
    <>
      <PageTitle>
        {editing ? "Edit access group" : "New access group"}
      </PageTitle>
      <HeaderActions>
        <Button
          variant="outline"
          render={<Link to="/users/groups" />}
          nativeButton={false}
        >
          Cancel
        </Button>
        <Button type="submit" form="group-form" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </HeaderActions>

      <form
        id="group-form"
        noValidate
        onSubmit={form.handleSubmit(save)}
        className="max-w-3xl space-y-5"
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
          name="description"
          render={({ field, fieldState }) => (
            <Field invalid={fieldState.invalid}>
              <FieldLabel>Description</FieldLabel>
              <Input {...field} autoComplete="off" />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="grants"
          render={({ field }) => (
            <GrantsEditor
              value={field.value}
              onChange={field.onChange}
              catalog={catalog}
            />
          )}
        />

        {error && Object.keys(error.fields).length === 0 && (
          <div className="space-y-1">
            <FieldError>{error.message}</FieldError>
            {error.details.map((detail) => (
              <FieldError key={detail}>{detail}</FieldError>
            ))}
          </div>
        )}
      </form>
    </>
  );
};

// /users/groups/new and /users/groups/$id/edit
export const GroupFormPage = () => {
  const { id } = useParams({ strict: false }) as { id?: string };
  const { user, permissions } = useSession();
  const record = useQuery({
    ...recordQuery(client, "access_group", id ?? ""),
    enabled: !!id,
  });
  const catalog = useQuery(accessCatalogQuery(client));

  if (!can(permissions, "access_group", id ? "update" : "create")) {
    return <NoAccess what="this page" />;
  }
  if (catalog.isPending || (id && record.isPending)) {
    return (
      <FormSkeleton
        className="max-w-3xl"
        form={[{ type: "text" }, { type: "object" }, { type: "object" }]}
      />
    );
  }
  if (catalog.isError) {
    return (
      <LoadError what="The list of grants" onRetry={() => catalog.refetch()} />
    );
  }
  if (!id) return <GroupForm catalog={catalog.data} />;

  if (record.isError) {
    return <LoadError what="The group" onRetry={() => record.refetch()} />;
  }
  if (!record.data)
    return <p className="text-muted-foreground">No such group.</p>;
  if (!canOn(permissions, "access_group", "update", record.data, user.id)) {
    return <NoAccess what="this group" />;
  }

  return (
    <GroupForm
      key={record.data.id}
      record={record.data}
      catalog={catalog.data}
    />
  );
};
