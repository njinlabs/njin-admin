import { Skeleton } from "@njinlabs/njin-admin/ui";
import { type Column, flexRender, type Table } from "@tanstack/react-table";
import { type ReactNode, useRef } from "react";
import { PiArrowDown, PiArrowUp, PiCaretUpDown } from "react-icons/pi";
import { useEndReached } from "../lib/use-end-reached";

const SortIcon = ({ sorted }: { sorted: false | "asc" | "desc" }) =>
  sorted === "asc" ? (
    <PiArrowUp className="size-3.5" />
  ) : sorted === "desc" ? (
    <PiArrowDown className="size-3.5" />
  ) : (
    <PiCaretUpDown className="size-3.5 text-muted-foreground/50" />
  );

const ariaSort: Record<string, "ascending" | "descending"> = {
  asc: "ascending",
  desc: "descending",
};

// A column pinned to the left (the row actions) stays in view while the table scrolls sideways;
// it needs a background of its own, or the cells that pass under it show through.
const pinned = (column: Column<any>, background: string) =>
  column.getIsPinned() === "left" ? `sticky left-0 ${background}` : "";

// A pinned column holds the row buttons and keeps the width its definition gives it (`size`);
// left to the table it would take more or less room with whatever buttons the rows show.
const fixed = (column: Column<any>) =>
  column.getIsPinned()
    ? {
        width: column.getSize(),
        minWidth: column.getSize(),
        maxWidth: column.getSize(),
      }
    : undefined;

const skeletonRows = [0, 1, 2, 3, 4];

// The rows of a TanStack table, drawn with the admin's tokens. Sorting, loading and the data
// itself stay with the caller (the table is `manual*`, the server does the work); this shows
// them, and the loading and empty states. It fills the height it is given and scrolls inside,
// with the header kept in view; `onEnd` is how the caller learns it is time for the next page.
export const DataTable = <T,>({
  table,
  loading,
  empty,
  onEnd,
  fetchingMore,
}: {
  table: Table<T>;
  loading?: boolean;
  // What to show when there are no rows: an icon, a sentence and what to do about it.
  empty?: ReactNode;
  // Set while there is another page to load; leave it out on the last one.
  onEnd?: () => void;
  fetchingMore?: boolean;
}) => {
  const scroller = useRef<HTMLDivElement>(null);
  const rows = table.getRowModel().rows;
  const sentinel = useEndReached(scroller, !!onEnd, onEnd, rows.length);

  return (
    <div
      ref={scroller}
      data-bleed
      className="flex min-h-0 flex-1 flex-col overflow-auto"
    >
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 z-10 bg-subtle shadow-[0_1px_0_var(--color-border)]">
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => {
                const sortable = header.column.getCanSort();

                return (
                  <th
                    key={header.id}
                    scope="col"
                    style={fixed(header.column)}
                    aria-sort={ariaSort[String(header.column.getIsSorted())]}
                    className={`px-3 py-3 font-medium whitespace-nowrap ${pinned(header.column, "bg-subtle")}`}
                  >
                    {header.isPlaceholder ? null : sortable ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="flex items-center gap-1 rounded-control outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        <SortIcon sorted={header.column.getIsSorted()} />
                      </button>
                    ) : (
                      flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {loading
            ? skeletonRows.map((row) => (
                <tr key={row} className="border-b">
                  {table.getVisibleLeafColumns().map((column) => (
                    <td key={column.id} className="px-3 py-2">
                      <Skeleton className="h-4 w-24" />
                    </td>
                  ))}
                </tr>
              ))
            : rows.map((row) => (
                <tr key={row.id} className="group border-b hover:bg-subtle">
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      style={fixed(cell.column)}
                      className={`px-3 py-2 ${pinned(cell.column, "bg-background group-hover:bg-subtle")}`}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
      {!loading && rows.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          {empty}
        </div>
      )}
      {onEnd && (
        <div
          ref={sentinel}
          role="status"
          className="grid h-12 place-items-center text-sm text-muted-foreground"
        >
          {fetchingMore ? "Loading…" : ""}
        </div>
      )}
    </div>
  );
};
