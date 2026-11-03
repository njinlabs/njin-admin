import {
  canList,
  type ModelSchema,
  type Row,
  schemaQuery,
} from "@njinlabs/njin-admin/sdk";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { TableSkeleton } from "../components/data-table";
import { ListError, RecordList } from "../components/record-list";
import { useSession } from "../components/session";
import { columnSize, isListable, renderCell } from "../lib/cell";
import { client } from "../lib/client";

const ModelList = ({
  model,
  locale,
}: {
  model: ModelSchema;
  locale?: string;
}) => {
  const listed = useMemo(() => model.form.filter(isListable), [model]);
  // The first text takes the room the others leave.
  const flexKey = listed.find(
    ({ type }) => type === "text" || type === "email",
  )?.key;
  const columns = useMemo<ColumnDef<Row>[]>(
    () =>
      listed.map((form) => ({
        id: form.key,
        accessorKey: form.key,
        header: form.label,
        size: columnSize(form),
        minSize: 64,
        maxSize: 800,
        meta: { flex: form.key === flexKey },
        cell: ({ getValue }) => renderCell(form, getValue()),
      })),
    [listed, flexKey],
  );

  return (
    <RecordList
      prefix={model.prefix}
      name={model.name}
      basePath={`/content/${model.prefix}`}
      columns={columns}
      locale={locale}
      fixedColumns={{ hidden: [] }}
    />
  );
};

// /content/$prefix: the records of one model. The model comes from the schema, which the menu
// has already asked for, so it is usually in the cache.
export const ContentListPage = () => {
  const { prefix } = useParams({ strict: false }) as { prefix: string };
  const { permissions } = useSession();
  const schema = useQuery(schemaQuery(client));
  const model = schema.data?.models.find((item) => item.prefix === prefix);

  if (schema.isPending) return <TableSkeleton />;
  if (schema.isError) return <ListError onRetry={() => schema.refetch()} />;
  if (!model) return <p className="text-muted-foreground">No such model.</p>;
  if (!canList(permissions, model.prefix)) {
    return (
      <p className="text-muted-foreground">
        You do not have access to {model.name}.
      </p>
    );
  }

  // A key per model: moving between two models resets the search and sorting.
  return (
    <ModelList
      key={model.prefix}
      model={model}
      locale={model.i18n ? schema.data.i18n?.defaultLocale : undefined}
    />
  );
};
