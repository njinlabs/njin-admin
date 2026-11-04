import {
  can,
  canList,
  type ModelSchema,
  type Row,
  recordsQuery,
  schemaQuery,
  useClient,
  useSession,
} from "@njinlabs/njin-admin/sdk";
import { Badge, Button, Skeleton } from "@njinlabs/njin-admin/ui";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { PiPlus } from "react-icons/pi";
import { overallStatus, statusLabels } from "../components/draft-status";

// What a record is called in a list: its first text field, else its id.
const titleOf = (model: ModelSchema, record: Row) => {
  const key = model.form.find((f) => f.type === "text")?.key;
  const value = key ? record[key] : undefined;

  return typeof value === "string" && value ? value : record.id;
};

const Empty = ({ children }: { children: string }) => (
  <p className="text-sm text-muted-foreground">{children}</p>
);

const ListSkeleton = () => (
  <div className="space-y-2">
    <Skeleton className="h-5 w-full" />
    <Skeleton className="h-5 w-5/6" />
    <Skeleton className="h-5 w-2/3" />
  </div>
);

type Entry = { model: ModelSchema; record: Row };

// The same rows for both lists: a few records of every model the user may browse (and, for
// `draftOnly`, may publish), newest edit first.
const useEntries = (draftOnly: boolean) => {
  const client = useClient();
  const { permissions } = useSession();
  const schema = useQuery(schemaQuery(client));

  const models = (schema.data?.models ?? []).filter((model) =>
    draftOnly
      ? model.draftable &&
        canList(permissions, model.prefix) &&
        can(permissions, model.prefix, "publish")
      : canList(permissions, model.prefix),
  );
  const locale = schema.data?.i18n?.defaultLocale;

  const results = useQueries({
    queries: models.map((model) =>
      recordsQuery(client, model.prefix, {
        limit: 8,
        sort: "updatedAt",
        order: "desc",
        populate: "none",
        locale: model.i18n ? locale : undefined,
        filters: draftOnly ? { status: { $in: "draft,changed" } } : undefined,
      }),
    ),
  });

  const entries: Entry[] = results
    .flatMap((result, index) =>
      (result.data?.data ?? []).map((record) => ({
        model: models[index] as ModelSchema,
        record,
      })),
    )
    .sort((a, b) =>
      String(b.record.updatedAt ?? "").localeCompare(
        String(a.record.updatedAt ?? ""),
      ),
    )
    .slice(0, 8);

  return {
    entries,
    pending: schema.isPending || results.some((r) => r.isPending),
    failed: schema.isError || results.some((r) => r.isError),
  };
};

const Entries = ({ draftOnly }: { draftOnly: boolean }) => {
  const { entries, pending, failed } = useEntries(draftOnly);

  if (failed) return <Empty>Could not load this.</Empty>;
  if (pending) return <ListSkeleton />;
  if (entries.length === 0)
    return (
      <Empty>
        {draftOnly ? "Nothing waiting to be published." : "No content yet."}
      </Empty>
    );

  return (
    <ul className="-mx-2 text-sm">
      {entries.map(({ model, record }) => {
        const status = overallStatus(record);

        return (
          <li key={`${model.prefix}:${record.id}`}>
            <Link
              to={`/content/${model.prefix}/${record.id}/edit` as string}
              className="flex items-center gap-2 rounded-control px-2 py-1.5 hover:bg-subtle"
            >
              <span className="min-w-0 flex-1 truncate">
                {titleOf(model, record)}
              </span>
              {status && status !== "published" && (
                <Badge>{statusLabels[status]}</Badge>
              )}
              <span className="shrink-0 text-xs text-muted-foreground">
                {model.name}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
};

export const RecentContentWidget = () => <Entries draftOnly={false} />;
export const NeedsPublishingWidget = () => <Entries draftOnly />;

export const QuickActionsWidget = () => {
  const client = useClient();
  const { permissions } = useSession();
  const schema = useQuery(schemaQuery(client));

  if (schema.isPending) return <ListSkeleton />;
  if (schema.isError) return <Empty>Could not load this.</Empty>;

  const models = schema.data.models.filter((model) =>
    can(permissions, model.prefix, "create"),
  );
  if (models.length === 0) return <Empty>Nothing you can create.</Empty>;

  return (
    <div className="flex flex-wrap gap-2">
      {models.map((model) => (
        <Button
          key={model.prefix}
          variant="outline"
          size="sm"
          render={<Link to={`/content/${model.prefix}/new` as string} />}
          nativeButton={false}
        >
          <PiPlus />
          {model.name}
        </Button>
      ))}
    </div>
  );
};
