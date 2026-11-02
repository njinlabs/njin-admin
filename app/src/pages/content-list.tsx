import {
  destroyRecordMutation,
  type ModelSchema,
  type Row,
  recordsInfiniteQuery,
  schemaQuery,
  toApiError,
} from "@njinlabs/njin-admin/sdk";
import {
  Button,
  ConfirmDialog,
  Input,
  Skeleton,
} from "@njinlabs/njin-admin/ui";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import {
  type ColumnDef,
  getCoreRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { type ReactNode, useMemo, useState } from "react";
import {
  PiMagnifyingGlass,
  PiPencilSimple,
  PiPlus,
  PiTrash,
  PiTray,
} from "react-icons/pi";
import { DataTable } from "../components/data-table";
import { HeaderActions } from "../components/header-slot";
import { isListable, renderCell } from "../lib/cell";
import { client } from "../lib/client";
import { useDebounced } from "../lib/use-debounced";

const limit = 20;

const ListError = ({ onRetry }: { onRetry: () => void }) => (
  <div className="flex flex-col items-start gap-2 text-sm text-muted-foreground">
    <p>The list could not be loaded.</p>
    <Button size="sm" variant="outline" onClick={onRetry}>
      Try again
    </Button>
  </div>
);

const Empty = ({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) => (
  <>
    <div className="grid size-20 place-items-center rounded-full bg-subtle text-muted-foreground [&>svg]:size-10">
      {icon}
    </div>
    <div className="space-y-1">
      <p className="text-lg font-semibold">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
    {children}
  </>
);

const ModelList = ({ model }: { model: ModelSchema }) => {
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [deleting, setDeleting] = useState<Row | null>(null);

  const newPath = `/content/${model.prefix}/new` as string;
  const search = useDebounced(searchText.trim());
  const [sort] = sorting;

  // A new search or sort is a new query, so the list starts again from the first page.
  const records = useInfiniteQuery(
    recordsInfiniteQuery(client, model.prefix, {
      search: search || undefined,
      limit,
      sort: sort?.id,
      order: sort ? (sort.desc ? "desc" : "asc") : undefined,
    }),
  );

  const destroy = useMutation(
    destroyRecordMutation(client, queryClient, model.prefix),
  );

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Edit"
              render={
                <Link
                  to={
                    `/content/${model.prefix}/${row.original.id}/edit` as string
                  }
                />
              }
              nativeButton={false}
            >
              <PiPencilSimple />
            </Button>
            <Button
              variant="danger-ghost"
              size="icon"
              aria-label="Delete"
              onClick={() => setDeleting(row.original)}
            >
              <PiTrash />
            </Button>
          </div>
        ),
      },
      ...model.form.filter(isListable).map(
        (form): ColumnDef<Row> => ({
          id: form.key,
          accessorKey: form.key,
          header: form.label,
          cell: ({ getValue }) => renderCell(form, getValue()),
        }),
      ),
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ getValue }) => renderCell({ type: "datepicker" }, getValue()),
      },
    ],
    [model],
  );

  const rows = useMemo(
    () => records.data?.pages.flatMap((page) => page.data) ?? [],
    [records.data],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    // The server sorts and pages; the table only shows the rows it was given.
    manualSorting: true,
    enableMultiSort: false,
    // The row actions stay in view while the table scrolls sideways.
    state: { sorting, columnPinning: { left: ["actions"] } },
    onSortingChange: setSorting,
  });

  return (
    <>
      <HeaderActions>
        <Input
          type="search"
          aria-label="Search"
          placeholder="Search…"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          className="w-40 sm:w-64"
        />
        <Button render={<Link to={newPath} />} nativeButton={false}>
          <PiPlus />
          <span className="hidden sm:inline">New</span>
        </Button>
      </HeaderActions>

      {records.isError && rows.length === 0 ? (
        <ListError onRetry={() => records.refetch()} />
      ) : (
        <DataTable
          table={table}
          loading={records.isPending}
          empty={
            search ? (
              <Empty
                icon={<PiMagnifyingGlass />}
                title="No results"
                description={`Nothing in ${model.name} matches “${search}”.`}
              >
                <Button variant="outline" onClick={() => setSearchText("")}>
                  Clear search
                </Button>
              </Empty>
            ) : (
              <Empty
                icon={<PiTray />}
                title={`No ${model.name.toLowerCase()} yet`}
                description="Records you add will show up here."
              >
                <Button render={<Link to={newPath} />} nativeButton={false}>
                  <PiPlus />
                  Create the first one
                </Button>
              </Empty>
            )
          }
          onEnd={
            records.hasNextPage && !records.isFetchingNextPage
              ? () => records.fetchNextPage()
              : undefined
          }
          fetchingMore={records.isFetchingNextPage}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null);
            destroy.reset();
          }
        }}
        title={`Delete this ${model.name.toLowerCase()}?`}
        description={
          destroy.isError
            ? toApiError(destroy.error).message
            : "It is deleted for good and cannot be brought back."
        }
        confirmLabel={destroy.isPending ? "Deleting…" : "Delete"}
        onConfirm={() =>
          deleting &&
          destroy.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
        }
        pending={destroy.isPending}
        variant="danger"
      />
    </>
  );
};

// /content/$prefix: the records of one model. The model comes from the schema, which the menu
// has already asked for, so it is usually in the cache.
export const ContentListPage = () => {
  const { prefix } = useParams({ strict: false }) as { prefix: string };
  const schema = useQuery(schemaQuery(client));
  const model = schema.data?.models.find((item) => item.prefix === prefix);

  if (schema.isPending) return <Skeleton className="h-64 w-full" />;
  if (schema.isError) return <ListError onRetry={() => schema.refetch()} />;
  if (!model) return <p className="text-muted-foreground">No such model.</p>;

  // A key per model: moving between two models resets the search and sorting.
  return <ModelList key={model.prefix} model={model} />;
};
