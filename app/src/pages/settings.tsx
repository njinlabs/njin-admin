import { zodResolver } from "@hookform/resolvers/zod";
import {
  can,
  draftVarsMutation,
  getDefaultValues,
  type I18n,
  localizedDefault,
  type ModelSchema,
  schemaQuery,
  toApiError,
  toInput,
  updateVarsMutation,
  useSession,
  varsQuery,
} from "@njinlabs/njin-admin/sdk";
import {
  ConfirmDialog,
  FieldError,
  hasInput,
  RenderForm,
  toast,
} from "@njinlabs/njin-admin/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBlocker, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  PiArrowCounterClockwise,
  PiCheck,
  PiEyeSlash,
  PiFloppyDisk,
  PiPaperPlaneTilt,
} from "react-icons/pi";
import { ActionButton } from "../components/action-button";
import { overallStatus, StatusBadge } from "../components/draft-status";
import { FilePickerDialog } from "../components/file-picker-dialog";
import { FormSkeleton } from "../components/form-skeleton";
import { HeaderActions } from "../components/header-slot";
import { LocaleTabs } from "../components/locale-tabs";
import { ListError } from "../components/record-list";
import { client } from "../lib/client";
import { optimizedImageSrc } from "../lib/file";
import { withoutEmpty } from "../lib/localized";
import { fieldRenderers } from "../lib/registry";
import { mayPickFiles, relatedLoader } from "../lib/related";
import { NoAccess } from "./users/shared";

type Values = Record<string, unknown>;

const SettingsForm = ({
  group,
  i18n,
  values: saved,
}: {
  group: ModelSchema;
  i18n: I18n | null;
  // The working copy as the server has it; for a draftable group it carries `status`.
  values: Values;
}) => {
  const queryClient = useQueryClient();
  const { permissions } = useSession();
  const resource = `vars.${group.prefix}`;
  // Saving and publishing are both the group's `write`; without it the form is only to be read.
  const mayWrite = !!can(permissions, resource, "write");

  // Only what has an input is validated and sent; the rest of the group stays as it is.
  const drawn = group.form.filter(hasInput);
  const keys = drawn.map((item) => item.key);
  const schema = group.schema.pick(
    Object.fromEntries(keys.map((key) => [key, true])) as Record<string, true> &
      Record<number, never>,
  );
  const localized = drawn
    .filter((item) => item.localized)
    .map((item) => item.key);

  const valuesOf = (source: Values) => ({
    ...getDefaultValues(schema),
    ...Object.fromEntries(localized.map((key) => [key, {}])),
    ...Object.fromEntries(
      keys.flatMap((key) =>
        source[key] === undefined || source[key] === null
          ? []
          : [[key, source[key]]],
      ),
    ),
  });

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: valuesOf(saved),
  });

  // All languages are saved and published together. The tabs are the default one, those the
  // group already has something in, and those added here; the rest wait in "Add language".
  const [added, setAdded] = useState<string[]>([]);
  const [locale, setLocale] = useState(i18n?.defaultLocale);
  const has = (code: string) =>
    localized.some((key) => {
      const value = (saved[key] as Record<string, unknown> | undefined)?.[code];

      // The server reads a language nothing was written in as the field's default, so only a
      // value that differs from it was written.
      return (
        value !== undefined &&
        value !== null &&
        value !== "" &&
        JSON.stringify(value) !==
          JSON.stringify(localizedDefault(group.schema, key))
      );
    });
  const codes =
    localized.length > 0 && i18n
      ? i18n.locales.filter(
          (code) =>
            code === i18n.defaultLocale || added.includes(code) || has(code),
        )
      : [];
  const addable =
    i18n && codes.length > 0
      ? i18n.locales.filter((code) => !codes.includes(code))
      : [];
  const errors = form.formState.errors as Record<string, unknown>;
  const failing = (code: string) =>
    localized.some(
      (key) => (errors[key] as Record<string, unknown> | undefined)?.[code],
    );

  const update = useMutation(
    updateVarsMutation(client, queryClient, group.prefix),
  );
  const move = useMutation(
    draftVarsMutation(client, queryClient, group.prefix),
  );
  const [discarding, setDiscarding] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const saving = update.isPending || move.isPending;
  const failure = update.error ?? move.error;
  const error = failure && toApiError(failure);
  const hidden = Object.entries(error?.fields ?? {}).filter(
    ([path]) => !keys.includes(path.split(".")[0] ?? ""),
  );

  // Only the languages on the tabs count: the others are not part of the group until added.
  const live = (codes.length > 0 ? codes : undefined) as string[] | undefined;
  const statusOf = (all: unknown) =>
    typeof all === "object" && all !== null && live
      ? Object.fromEntries(
          Object.entries(all).filter(([code]) => live.includes(code)),
        )
      : all;
  const status = group.draftable
    ? overallStatus({
        id: group.prefix,
        status: statusOf(saved.status) as never,
      })
    : null;
  const dirty = form.formState.isDirty;

  const [justSaved, setJustSaved] = useState(false);
  useEffect(() => {
    if (!justSaved) return;

    const timer = setTimeout(() => setJustSaved(false), 2500);

    return () => clearTimeout(timer);
  }, [justSaved]);

  const blocker = useBlocker({
    shouldBlockFn: () => dirty,
    enableBeforeUnload: () => dirty,
    withResolver: true,
  });

  // Saves every language, and with `publish` sends them all live. What has not changed is not
  // saved again.
  const submit = (publish: boolean) =>
    form.handleSubmit(async (values: Values) => {
      const input = toInput(drawn, {
        ...values,
        ...Object.fromEntries(
          localized.map((key) => [
            key,
            // The server fills every language with its defaults, so a language that is not on
            // a tab was never asked for and is not sent.
            Object.fromEntries(
              Object.entries(withoutEmpty(values[key])).filter(([code]) =>
                codes.includes(code),
              ),
            ),
          ]),
        ),
      });
      update.reset();
      move.reset();

      try {
        if (dirty) await update.mutateAsync(input);
      } catch (failed) {
        for (const [path, message] of Object.entries(
          toApiError(failed).fields,
        )) {
          form.setError(path as never, { message });
        }
        return;
      }

      // The edits are saved either way; a refusal to publish shows below the form.
      if (publish) {
        await move
          .mutateAsync({ action: "publish", locales: live })
          .then(() => toast.success("Published"))
          .catch((failed) =>
            toast.error("Saved, but not published", toApiError(failed).message),
          );
      } else toast.success("Saved");

      form.reset(form.getValues());
      setJustSaved(true);
    });

  return (
    <>
      <HeaderActions>
        {mayWrite && status === "changed" && (
          <ActionButton
            icon={<PiArrowCounterClockwise />}
            label="Discard"
            variant="outline"
            disabled={saving}
            onClick={() => setDiscarding(true)}
          />
        )}
        {mayWrite && (
          <ActionButton
            icon={justSaved ? <PiCheck /> : <PiFloppyDisk />}
            label={update.isPending ? "Saving…" : justSaved ? "Saved" : "Save"}
            type="submit"
            form="settings-form"
            variant={group.draftable ? "outline" : "default"}
            disabled={saving}
          />
        )}
        {mayWrite && group.draftable && (
          <div className="mx-1 h-5 w-px bg-border" />
        )}
        {mayWrite && group.draftable && status && status !== "draft" && (
          <ActionButton
            icon={<PiEyeSlash />}
            label="Unpublish"
            variant="outline"
            disabled={saving}
            onClick={() => setUnpublishing(true)}
          />
        )}
        {mayWrite && group.draftable && (
          <ActionButton
            icon={<PiPaperPlaneTilt />}
            label={
              move.isPending && move.variables?.action === "publish"
                ? "Publishing…"
                : "Publish"
            }
            disabled={saving || (status === "published" && !dirty)}
            onClick={() => submit(true)()}
          />
        )}
      </HeaderActions>

      {codes.length > 0 && (
        <LocaleTabs
          codes={codes}
          active={locale}
          onSelect={setLocale}
          failing={failing}
          addable={addable}
          onAdd={(code) => {
            setAdded([...added, code]);
            setLocale(code);
          }}
        />
      )}

      <form
        id="settings-form"
        noValidate
        onSubmit={submit(false)}
        className={
          codes.length > 0 ? "space-y-5 px-4 py-6 md:px-8" : "space-y-5"
        }
      >
        {group.draftable && status && (
          <StatusBadge record={{ id: group.prefix, status }} />
        )}

        <RenderForm
          form={group.form}
          control={form.control}
          locale={locale}
          disabled={!mayWrite}
          filePicker={mayPickFiles(permissions) ? FilePickerDialog : undefined}
          renderers={fieldRenderers}
          imageSrc={(file) => optimizedImageSrc(file.url)}
          loadRelated={relatedLoader(client, permissions, locale)}
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
        open={blocker.status === "blocked"}
        onOpenChange={(open) => {
          if (!open) blocker.reset?.();
        }}
        title="Leave without saving?"
        description="You have changes that are not saved. They are lost if you leave."
        confirmLabel="Leave"
        cancelLabel="Stay"
        variant="danger"
        onConfirm={() => blocker.proceed?.()}
      />

      <ConfirmDialog
        open={unpublishing}
        onOpenChange={(open) => {
          if (!open) {
            setUnpublishing(false);
            move.reset();
          }
        }}
        title="Take these settings offline?"
        description={
          move.isError
            ? toApiError(move.error).message
            : "They stop being live in every language. The working copy is kept, as a draft."
        }
        confirmLabel={move.isPending ? "Working…" : "Unpublish"}
        pending={move.isPending}
        variant="danger"
        onConfirm={() =>
          move.mutate(
            { action: "unpublish", locales: live },
            {
              onSuccess: () => {
                setUnpublishing(false);
                toast.success("Unpublished");
              },
            },
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
          move.mutate(
            { action: "discard", locales: live },
            {
              onSuccess: () => {
                // The refresh has finished by now: start the form again from what is live.
                const fresh = queryClient.getQueryData<Values>(
                  varsQuery(client, group.prefix).queryKey,
                );
                form.reset(valuesOf(fresh ?? saved));
                setDiscarding(false);
                toast.success("Changes discarded");
              },
            },
          )
        }
      />
    </>
  );
};

// /settings/$prefix: one settings group, read and written as a whole.
export const SettingsPage = () => {
  const { prefix } = useParams({ strict: false }) as { prefix: string };
  const { permissions } = useSession();
  const schema = useQuery(schemaQuery(client));
  const group = schema.data?.vars.find((item) => item.prefix === prefix);
  const values = useQuery({
    ...varsQuery<Values>(client, prefix),
    enabled: !!group,
  });

  if (schema.isPending) return <FormSkeleton />;
  if (schema.isError) return <ListError onRetry={() => schema.refetch()} />;
  if (!group) return <p className="text-muted-foreground">No such group.</p>;
  if (!can(permissions, `vars.${prefix}`, "read")) {
    return <NoAccess what={group.name} />;
  }
  if (values.isPending) {
    return (
      <FormSkeleton
        form={group.form.filter(hasInput)}
        tabs={!!schema.data.i18n && group.form.some((item) => item.localized)}
        actions={group.draftable ? 3 : 1}
      />
    );
  }
  if (values.isError) return <ListError onRetry={() => values.refetch()} />;

  return (
    <SettingsForm
      key={prefix}
      group={group}
      i18n={schema.data.i18n}
      values={values.data}
    />
  );
};
