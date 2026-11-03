import {
  can,
  canOn,
  destroyRecordMutation,
  type Row,
  recordsInfiniteQuery,
  toApiError,
} from "@njinlabs/njin-admin/sdk";
import {
  Button,
  Checkbox,
  ConfirmDialog,
  Field,
  FieldLabel,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@njinlabs/njin-admin/ui";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  type ColumnDef,
  getCoreRowModel,
  type SortingState,
  type Table,
  useReactTable,
} from "@tanstack/react-table";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  PiColumns,
  PiMagnifyingGlass,
  PiPencilSimple,
  PiPlus,
  PiTrash,
  PiTray,
} from "react-icons/pi";
import { renderCell } from "../lib/cell";
import { client } from "../lib/client";
import { useDebounced } from "../lib/use-debounced";
import { DataTable } from "./data-table";
import { HeaderActions } from "./header-slot";
import { useSession } from "./session";

const limit = 20;

// The columns a person has turned off, kept per model in this browser. Before they have chosen
// it is what the list starts with.
const storageKey = (kind: "columns" | "widths", prefix: string) =>
  `njin-admin.${kind}.${prefix}`;

const readStored = <T,>(
  kind: "columns" | "widths",
  prefix: string,
  fallback: T,
  valid: (value: unknown) => boolean,
): T => {
  try {
    const stored = localStorage.getItem(storageKey(kind, prefix));
    const parsed: unknown = stored ? JSON.parse(stored) : null;

    return valid(parsed) ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeStored = (
  kind: "columns" | "widths",
  prefix: string,
  value: unknown,
) => {
  try {
    localStorage.setItem(storageKey(kind, prefix), JSON.stringify(value));
  } catch {
    // Not kept, but the list still follows the choice for now.
  }
};

export const ListError = ({ onRetry }: { onRetry: () => void }) => (
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
  children?: ReactNode;
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

// Which columns to show. What is chosen is the list of those turned off, so a column the model
// gains later shows up by itself.
const ColumnsMenu = ({
  table,
  hidden,
  onChange,
  onReset,
}: {
  table: Table<Row>;
  hidden: string[];
  onChange: (hidden: string[]) => void;
  // Back to the columns and widths the list starts with.
  onReset: () => void;
}) => (
  <Popover>
    <PopoverTrigger
      render={<Button variant="outline" aria-label="Columns" title="Columns" />}
    >
      <PiColumns />
      <span className="hidden sm:inline">Columns</span>
    </PopoverTrigger>
    <PopoverContent align="end" className="max-h-80 w-56 overflow-y-auto p-3">
      <div className="space-y-2">
        {table
          .getAllLeafColumns()
          .filter((column) => column.getCanHide())
          .map((column) => (
            <Field key={column.id} orientation="horizontal">
              <Checkbox
                checked={!hidden.includes(column.id)}
                onCheckedChange={(shown) =>
                  onChange(
                    shown
                      ? hidden.filter((id) => id !== column.id)
                      : [...hidden, column.id],
                  )
                }
              />
              <FieldLabel>
                {typeof column.columnDef.header === "string"
                  ? column.columnDef.header
                  : column.id}
              </FieldLabel>
            </Field>
          ))}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="w-full"
          onClick={onReset}
        >
          Reset
        </Button>
      </div>
    </PopoverContent>
  </Popover>
);

type RecordListProps = {
  // The model's prefix: the API path and the resource its permissions are about.
  prefix: string;
  // What one record is called, for the empty state and the delete question ("post").
  name: string;
  // Where its pages live: "<basePath>/new" and "<basePath>/<id>/edit".
  basePath: string;
  // The columns after the row actions; "Created" is added at the end.
  columns: ColumnDef<Row>[];
  // Shown above the table (tabs).
  above?: ReactNode;
  // For a row that must not be deleted even though the caller may delete others (their own account).
  keep?: (row: Row) => boolean;
  // Columns keep a width of their own and are cut ("…") where the text is longer, and the person
  // chooses which are shown (kept in this browser). `hidden` are the ones off until they choose.
  fixedColumns?: { hidden: string[] };
  // The language the list is read in, for a model with i18n.
  locale?: string;
};

// The records of one model as a searchable, sortable table that loads page after page, with the
// buttons only the ones the caller may use.
export const RecordList = ({
  prefix,
  name,
  basePath,
  columns: content,
  above,
  keep,
  fixedColumns,
  locale,
}: RecordListProps) => {
  const queryClient = useQueryClient();
  const { user, permissions } = useSession();
  const [searchText, setSearchText] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [hiddenColumns, setHiddenColumns] = useState(() =>
    readStored("columns", prefix, fixedColumns?.hidden ?? [], Array.isArray),
  );
  // The widths a person has dragged the columns to, by column.
  const [columnSizing, setColumnSizing] = useState<Record<string, number>>(() =>
    readStored(
      "widths",
      prefix,
      {},
      (value) => typeof value === "object" && value !== null,
    ),
  );

  // Dragging changes the width many times a second; what is kept is where it came to rest.
  useEffect(() => {
    const timer = setTimeout(
      () => writeStored("widths", prefix, columnSizing),
      300,
    );

    return () => clearTimeout(timer);
  }, [columnSizing, prefix]);

  const mayCreate = !!can(permissions, prefix, "create");
  const hasActions =
    !!can(permissions, prefix, "update") ||
    !!can(permissions, prefix, "delete");
  const newPath = `${basePath}/new`;
  const search = useDebounced(searchText.trim());
  const [sort] = sorting;

  // A new search or sort is a new query, so the list starts again from the first page.
  const records = useInfiniteQuery(
    recordsInfiniteQuery(client, prefix, {
      search: search || undefined,
      limit,
      locale,
      sort: sort?.id,
      order: sort ? (sort.desc ? "desc" : "asc") : undefined,
    }),
  );

  const destroy = useMutation(
    destroyRecordMutation(client, queryClient, prefix),
  );

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      // Only for someone who may change or delete at least some rows; each row then shows just
      // the buttons that will work for it.
      ...(hasActions
        ? [
            {
              id: "actions",
              // Room for edit and delete side by side (two icon buttons, their gap and the cell's padding).
              size: 104,
              header: () => <span className="sr-only">Actions</span>,
              enableSorting: false,
              enableResizing: false,
              cell: ({ row }) => (
                <div className="flex justify-end gap-1">
                  {canOn(
                    permissions,
                    prefix,
                    "update",
                    row.original,
                    user.id,
                  ) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Edit"
                      render={
                        <Link
                          to={`${basePath}/${row.original.id}/edit` as string}
                        />
                      }
                      nativeButton={false}
                    >
                      <PiPencilSimple />
                    </Button>
                  )}
                  {canOn(
                    permissions,
                    prefix,
                    "delete",
                    row.original,
                    user.id,
                  ) &&
                    !keep?.(row.original) && (
                      <Button
                        variant="danger-ghost"
                        size="icon"
                        aria-label="Delete"
                        onClick={() => setDeleting(row.original)}
                      >
                        <PiTrash />
                      </Button>
                    )}
                </div>
              ),
            } satisfies ColumnDef<Row>,
          ]
        : []),
      ...content,
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ getValue }) => renderCell({ type: "datepicker" }, getValue()),
      },
    ],
    [content, hasActions, permissions, user.id, prefix, basePath, keep],
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
    state: {
      sorting,
      columnPinning: { left: ["actions"] },
      columnSizing,
      columnVisibility: Object.fromEntries(
        (fixedColumns ? hiddenColumns : []).map((id) => [id, false]),
      ),
    },
    onSortingChange: setSorting,
    enableColumnResizing: !!fixedColumns,
    columnResizeMode: "onChange",
    onColumnSizingChange: setColumnSizing,
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <HeaderActions>
        {fixedColumns && (
          <ColumnsMenu
            table={table}
            hidden={hiddenColumns}
            onChange={(next) => {
              setHiddenColumns(next);
              writeStored("columns", prefix, next);
            }}
            onReset={() => {
              const initial = fixedColumns.hidden;

              setHiddenColumns(initial);
              setColumnSizing({});
              writeStored("columns", prefix, initial);
            }}
          />
        )}
        <Input
          type="search"
          aria-label="Search"
          placeholder="Search…"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          className="w-40 sm:w-64"
        />
        {mayCreate && (
          <Button render={<Link to={newPath} />} nativeButton={false}>
            <PiPlus />
            <span className="hidden sm:inline">New</span>
          </Button>
        )}
      </HeaderActions>

      {above}

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
                description={`Nothing in ${name} matches “${search}”.`}
              >
                <Button variant="outline" onClick={() => setSearchText("")}>
                  Clear search
                </Button>
              </Empty>
            ) : (
              <Empty
                icon={<PiTray />}
                title={`No ${name.toLowerCase()} yet`}
                description={
                  mayCreate
                    ? "Records you add will show up here."
                    : "There is nothing to show yet."
                }
              >
                {mayCreate && (
                  <Button render={<Link to={newPath} />} nativeButton={false}>
                    <PiPlus />
                    Create the first one
                  </Button>
                )}
              </Empty>
            )
          }
          onEnd={
            records.hasNextPage && !records.isFetchingNextPage
              ? () => records.fetchNextPage()
              : undefined
          }
          fetchingMore={records.isFetchingNextPage}
          fixedLayout={!!fixedColumns}
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
        title={`Delete this ${name.toLowerCase()}?`}
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
    </div>
  );
};
