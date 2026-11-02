import {
  canList,
  type ModelSchema,
  type Row,
  schemaQuery,
} from "@njinlabs/njin-admin/sdk";
import { Skeleton } from "@njinlabs/njin-admin/ui";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { ListError, RecordList } from "../components/record-list";
import { useSession } from "../components/session";
import { isListable, renderCell } from "../lib/cell";
import { client } from "../lib/client";

const ModelList = ({ model }: { model: ModelSchema }) => {
  const columns = useMemo<ColumnDef<Row>[]>(
    () =>
      model.form.filter(isListable).map((form) => ({
        id: form.key,
        accessorKey: form.key,
        header: form.label,
        cell: ({ getValue }) => renderCell(form, getValue()),
      })),
    [model],
  );

  return (
    <RecordList
      prefix={model.prefix}
      name={model.name}
      basePath={`/content/${model.prefix}`}
      columns={columns}
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

  if (schema.isPending) return <Skeleton className="h-64 w-full" />;
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
  return <ModelList key={model.prefix} model={model} />;
};
