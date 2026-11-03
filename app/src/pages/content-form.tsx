import { zodResolver } from "@hookform/resolvers/zod";
import {
  can,
  canOn,
  createRecordMutation,
  getDefaultValues,
  type I18n,
  type ModelSchema,
  type Row,
  readRecords,
  recordQuery,
  schemaQuery,
  toApiError,
  updateRecordMutation,
} from "@njinlabs/njin-admin/sdk";
import {
  Button,
  FieldError,
  hasInput,
  RenderForm,
  Skeleton,
} from "@njinlabs/njin-admin/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FilePickerDialog } from "../components/file-picker-dialog";
import { HeaderActions, PageTitle } from "../components/header-slot";
import { ListError } from "../components/record-list";
import { useSession } from "../components/session";
import { client } from "../lib/client";
import { optimizedImageSrc } from "../lib/file";
import { NoAccess } from "./users/shared";

// What is sent for a field with a value per language: the languages that have one. A language
// left empty is no translation, not an empty text.
const withoutEmpty = (value: unknown) =>
  Object.fromEntries(
    Object.entries((value ?? {}) as Record<string, unknown>).filter(
      ([, entry]) => entry !== undefined && entry !== null && entry !== "",
    ),
  );

const ModelForm = ({
  model,
  i18n,
  record,
}: {
  model: ModelSchema;
  i18n: I18n | null;
  record?: Row;
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const editing = !!record;
  const basePath = `/content/${model.prefix}`;

  // Only the fields that have an input are validated and sent: the others stay as they are on
  // a record, and are the server's to refuse on a new one.
  const drawn = model.form.filter(hasInput);
  const keys = drawn.map((item) => item.key);
  const schema = model.schema.pick(
    Object.fromEntries(keys.map((key) => [key, true])) as Record<string, true> &
      Record<number, never>,
  );

  const localized = drawn
    .filter((item) => item.localized)
    .map((item) => item.key);
  const locales = localized.length > 0 && i18n ? i18n.locales : [];
  const [locale, setLocale] = useState(i18n?.defaultLocale);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      ...getDefaultValues(schema),
      ...Object.fromEntries(localized.map((key) => [key, {}])),
      ...Object.fromEntries(
        keys.flatMap((key) =>
          record?.[key] == null ? [] : [[key, record[key]]],
        ),
      ),
    },
  });

  // A language with a refused field the tab on screen does not show gets a mark.
  const errors = form.formState.errors as Record<string, unknown>;
  const failing = (code: string) =>
    localized.some(
      (key) => (errors[key] as Record<string, unknown> | undefined)?.[code],
    );

  const create = useMutation(
    createRecordMutation(client, queryClient, model.prefix),
  );
  const update = useMutation(
    updateRecordMutation(client, queryClient, model.prefix),
  );
  const saving = create.isPending || update.isPending;
  const failure = create.error ?? update.error;
  const error = failure && toApiError(failure);

  // A refused field that has no input here cannot be shown under it, so it goes in the message.
  const hidden = Object.entries(error?.fields ?? {}).filter(
    ([path]) => !keys.includes(path.split(".")[0] ?? ""),
  );

  const save = (values: Record<string, unknown>) => {
    const input = {
      ...values,
      ...Object.fromEntries(
        localized.map((key) => [key, withoutEmpty(values[key])]),
      ),
    };
    const options = {
      onSuccess: () => navigate({ to: basePath }),
      onError: (failed: unknown) => {
        for (const [path, message] of Object.entries(
          toApiError(failed).fields,
        )) {
          form.setError(path as never, { message });
        }
      },
    };

    if (record) update.mutate({ id: record.id, input }, options);
    else create.mutate(input, options);
  };

  return (
    <>
      <PageTitle>
        {editing ? `Edit ${model.name}` : `New ${model.name}`}
      </PageTitle>
      <HeaderActions>
        <Button
          variant="outline"
          render={<Link to={basePath} />}
          nativeButton={false}
        >
          Cancel
        </Button>
        <Button type="submit" form="content-form" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </HeaderActions>

      <form
        id="content-form"
        noValidate
        onSubmit={form.handleSubmit(save)}
        className="max-w-xl space-y-5"
      >
        {locales.length > 0 && (
          <div className="flex flex-wrap gap-1" role="tablist">
            {locales.map((code) => (
              <Button
                key={code}
                type="button"
                size="sm"
                role="tab"
                aria-selected={code === locale}
                variant={code === locale ? "default" : "outline"}
                onClick={() => setLocale(code)}
              >
                {code}
                {failing(code) && (
                  <span
                    className="size-1.5 rounded-full bg-danger"
                    role="img"
                    aria-label="has errors"
                  />
                )}
              </Button>
            ))}
          </div>
        )}

        <RenderForm
          form={model.form}
          control={form.control}
          locale={locale}
          filePicker={FilePickerDialog}
          imageSrc={(file) => optimizedImageSrc(file.url)}
          loadRelated={(related, search) =>
            readRecords(client, related, {
              search: search || undefined,
              limit: 20,
              locale,
            }).then((page) => page.data)
          }
        />

        {error &&
          (hidden.length > 0 || Object.keys(error.fields).length === 0) && (
            <FieldError>
              {hidden.length > 0
                ? hidden
                    .map(([path, message]) => `${path}: ${message}`)
                    .join("; ")
                : error.message}
            </FieldError>
          )}
      </form>
    </>
  );
};

// /content/$prefix/new and /content/$prefix/$id/edit
export const ContentFormPage = () => {
  const { prefix, id } = useParams({ strict: false }) as {
    prefix: string;
    id?: string;
  };
  const { user, permissions } = useSession();
  const schema = useQuery(schemaQuery(client));
  const model = schema.data?.models.find((item) => item.prefix === prefix);
  const record = useQuery({
    ...recordQuery(client, prefix, id ?? ""),
    enabled: !!id,
  });

  if (schema.isPending) return <Skeleton className="h-64 w-full max-w-xl" />;
  if (schema.isError) return <ListError onRetry={() => schema.refetch()} />;
  if (!model) return <p className="text-muted-foreground">No such model.</p>;
  if (!can(permissions, prefix, id ? "update" : "create")) {
    return <NoAccess what="this page" />;
  }
  if (!id)
    return <ModelForm key={prefix} model={model} i18n={schema.data.i18n} />;

  if (record.isPending) return <Skeleton className="h-64 w-full max-w-xl" />;
  if (record.isError) return <ListError onRetry={() => record.refetch()} />;
  if (!record.data) {
    return <p className="text-muted-foreground">No such record.</p>;
  }
  if (!canOn(permissions, prefix, "update", record.data, user.id)) {
    return <NoAccess what="this record" />;
  }

  return (
    <ModelForm
      key={record.data.id}
      model={model}
      i18n={schema.data.i18n}
      record={record.data}
    />
  );
};
