import { zodResolver } from "@hookform/resolvers/zod";
import {
  can,
  canOn,
  createRecordMutation,
  draftActionMutation,
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
  type ButtonProps,
  ConfirmDialog,
  cn,
  FieldError,
  hasInput,
  Popover,
  PopoverContent,
  PopoverTrigger,
  RenderForm,
} from "@njinlabs/njin-admin/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import { useForm } from "react-hook-form";
import {
  PiArrowCounterClockwise,
  PiEyeSlash,
  PiFloppyDisk,
  PiPaperPlaneTilt,
  PiX,
} from "react-icons/pi";
import { overallStatus, StatusBadge } from "../components/draft-status";
import { FilePickerDialog } from "../components/file-picker-dialog";
import { FormSkeleton } from "../components/form-skeleton";
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

// An action of the header: icon and label, and on a narrow screen the icon alone, so that all of
// them fit beside the title. The label stays as the accessible name and the tooltip.
const ActionButton = ({
  icon,
  label,
  className,
  ...props
}: ButtonProps & { icon: ReactNode; label: string }) => (
  <Button
    aria-label={label}
    title={label}
    className={cn("max-sm:w-9 max-sm:px-0", className)}
    {...props}
  >
    {icon}
    <span className="hidden sm:inline">{label}</span>
  </Button>
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
  const { user, permissions } = useSession();
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

  const valuesOf = (source?: Row) => ({
    ...getDefaultValues(schema),
    ...Object.fromEntries(localized.map((key) => [key, {}])),
    ...Object.fromEntries(
      keys.flatMap((key) =>
        source?.[key] == null ? [] : [[key, source[key]]],
      ),
    ),
  });

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: valuesOf(record),
  });

  // Every language is saved and published together. The languages shown are the default one,
  // those the record already has something in, and those added here; the rest wait in "Add".
  const [added, setAdded] = useState<string[]>([]);
  const [locale, setLocale] = useState(i18n?.defaultLocale);
  const has = (code: string) =>
    localized.some((key) => {
      const value = (record?.[key] as Record<string, unknown> | undefined)?.[
        code
      ];

      return value !== undefined && value !== null && value !== "";
    });
  const shown =
    localized.length > 0 && i18n
      ? i18n.locales.filter(
          (code) =>
            code === i18n.defaultLocale || added.includes(code) || has(code),
        )
      : [];
  const addable =
    i18n && shown.length > 0
      ? i18n.locales.filter((code) => !shown.includes(code))
      : [];

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
  const move = useMutation(
    draftActionMutation(client, queryClient, model.prefix),
  );
  const [discarding, setDiscarding] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const saving = create.isPending || update.isPending || move.isPending;
  const failure = create.error ?? update.error ?? move.error;
  const error = failure && toApiError(failure);

  // A refused field that has no input here cannot be shown under it, so it goes in the message.
  const hidden = Object.entries(error?.fields ?? {}).filter(
    ([path]) => !keys.includes(path.split(".")[0] ?? ""),
  );

  const status = record ? overallStatus(record) : null;
  const mayPublish =
    model.draftable &&
    (record
      ? canOn(permissions, model.prefix, "publish", record, user.id)
      : !!can(permissions, model.prefix, "publish"));
  const dirty = form.formState.isDirty;

  // Saves every language, and with `publish` sends them all live. What has not changed is not
  // saved again.
  const submit = (publish: boolean) =>
    form.handleSubmit(async (values: Record<string, unknown>) => {
      const input = {
        ...values,
        ...Object.fromEntries(
          localized.map((key) => [key, withoutEmpty(values[key])]),
        ),
      };
      create.reset();
      update.reset();
      move.reset();

      let saved: Row;
      try {
        if (record && !dirty) saved = record;
        else if (record) {
          saved = await update.mutateAsync({ id: record.id, input });
        } else saved = await create.mutateAsync(input);
      } catch (failed) {
        for (const [path, message] of Object.entries(
          toApiError(failed).fields,
        )) {
          form.setError(path as never, { message });
        }
        return;
      }

      if (publish) {
        // Shown below the form through `move.error`; the edits are saved either way.
        await move
          .mutateAsync({ id: saved.id, action: "publish" })
          .catch(() => {});
      }

      // A new record goes on to its own page; an edit stays, with the saved values as what is not
      // yet changed.
      if (record) form.reset(form.getValues());
      else navigate({ to: `${basePath}/${saved.id}/edit` as string });
    });

  return (
    <>
      <PageTitle>
        {editing ? `Edit ${model.name}` : `New ${model.name}`}
      </PageTitle>
      <HeaderActions>
        {status === "changed" ? (
          <ActionButton
            icon={<PiArrowCounterClockwise />}
            label="Discard"
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => setDiscarding(true)}
          />
        ) : (
          <ActionButton
            icon={<PiX />}
            label="Cancel"
            variant="outline"
            render={<Link to={basePath} />}
            nativeButton={false}
          />
        )}
        <ActionButton
          icon={<PiFloppyDisk />}
          label={create.isPending || update.isPending ? "Saving…" : "Save"}
          type="submit"
          form="content-form"
          variant={mayPublish ? "outline" : "default"}
          disabled={saving}
        />
        {mayPublish && <div className="mx-1 h-5 w-px bg-border" />}
        {mayPublish && status && status !== "draft" && (
          <ActionButton
            icon={<PiEyeSlash />}
            label="Unpublish"
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => setUnpublishing(true)}
          />
        )}
        {mayPublish && (
          <ActionButton
            icon={<PiPaperPlaneTilt />}
            label={
              move.isPending && move.variables?.action === "publish"
                ? "Publishing…"
                : "Publish"
            }
            type="button"
            disabled={saving || (status === "published" && !dirty)}
            onClick={() => submit(true)()}
          />
        )}
      </HeaderActions>

      {/* data-bleed takes the page's own padding away, so the bar runs from edge to edge under the
          header; the form below then pads itself. */}
      {shown.length > 0 && (
        <div
          data-bleed
          role="tablist"
          className="sticky top-0 z-10 flex shrink-0 items-center overflow-x-auto border-b border-border bg-background px-4 md:px-8"
        >
          {shown.map((code) => (
            <button
              key={code}
              type="button"
              role="tab"
              aria-selected={code === locale}
              onClick={() => setLocale(code)}
              className={cn(
                "-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm outline-none transition-colors focus-visible:text-foreground",
                code === locale
                  ? "border-primary font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {code}
              {failing(code) && (
                <span
                  className="size-1.5 rounded-full bg-danger"
                  role="img"
                  aria-label="has errors"
                />
              )}
            </button>
          ))}
          {addable.length > 0 && (
            <Popover>
              <PopoverTrigger
                render={
                  <button
                    type="button"
                    className="-mb-px shrink-0 border-b-2 border-transparent px-3 py-2.5 text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:text-foreground"
                  />
                }
              >
                + Add language
              </PopoverTrigger>
              <PopoverContent className="flex w-40 flex-col p-1">
                {addable.map((code) => (
                  <Button
                    key={code}
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="justify-start"
                    onClick={() => {
                      setAdded([...added, code]);
                      setLocale(code);
                    }}
                  >
                    {code}
                  </Button>
                ))}
              </PopoverContent>
            </Popover>
          )}
        </div>
      )}

      <form
        id="content-form"
        noValidate
        onSubmit={submit(false)}
        className={cn("space-y-5", shown.length > 0 && "px-4 py-6 md:px-8")}
      >
        {model.draftable && record && <StatusBadge record={record} />}

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
          !discarding &&
          !unpublishing &&
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

      <ConfirmDialog
        open={unpublishing}
        onOpenChange={(open) => {
          if (!open) {
            setUnpublishing(false);
            move.reset();
          }
        }}
        title="Take this offline?"
        description={
          move.isError
            ? toApiError(move.error).message
            : "It stops being live in every language. The working copy is kept, as a draft."
        }
        confirmLabel={move.isPending ? "Working…" : "Unpublish"}
        pending={move.isPending}
        variant="danger"
        onConfirm={() =>
          record &&
          move.mutate(
            { id: record.id, action: "unpublish" },
            { onSuccess: () => setUnpublishing(false) },
          )
        }
      />

      <ConfirmDialog
        open={discarding}
        onOpenChange={(open) => {
          if (!open) {
            setDiscarding(false);
            move.reset();
          }
        }}
        title="Discard the unpublished changes?"
        description={
          move.isError
            ? toApiError(move.error).message
            : "Every language goes back to what is live. Edits you have not saved are lost too."
        }
        confirmLabel={move.isPending ? "Working…" : "Discard"}
        pending={move.isPending}
        variant="danger"
        onConfirm={() =>
          record &&
          move.mutate(
            { id: record.id, action: "discard" },
            {
              onSuccess: () => {
                // The refresh has finished by now: start the form again from what is live.
                const fresh = queryClient.getQueryData<Row>(
                  recordQuery(client, model.prefix, record.id).queryKey,
                );
                form.reset(valuesOf(fresh ?? record));
                setDiscarding(false);
              },
            },
          )
        }
      />
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

  if (schema.isPending) return <FormSkeleton />;
  if (schema.isError) return <ListError onRetry={() => schema.refetch()} />;
  if (!model) return <p className="text-muted-foreground">No such model.</p>;
  if (!can(permissions, prefix, id ? "update" : "create")) {
    return <NoAccess what="this page" />;
  }
  if (!id)
    return <ModelForm key={prefix} model={model} i18n={schema.data.i18n} />;

  if (record.isPending) {
    return (
      <FormSkeleton
        form={model.form.filter(hasInput)}
        tabs={!!schema.data.i18n && model.form.some((item) => item.localized)}
        actions={model.draftable ? 4 : 2}
      />
    );
  }
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
