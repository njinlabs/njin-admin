import { Skeleton } from "@njinlabs/njin-admin/ui";
import {
  type Column,
  flexRender,
  type RowData,
  type Table,
} from "@tanstack/react-table";
import { type ReactNode, useRef } from "react";
import { PiArrowDown, PiArrowUp, PiCaretUpDown } from "react-icons/pi";
import { useEndReached } from "../lib/use-end-reached";
import { HeaderActions } from "./header-slot";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    // In a table with a fixed layout, a column that takes the room the others leave.
    flex?: boolean;
  }
}

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

// With a fixed layout every column is as wide as its `size`, whatever its cells hold, except the
// one marked `flex`, which takes what is left. Its `size` is then the least it gets.
// A column the person has dragged to a width keeps it, flex or not.
const sized = (
  column: Column<any>,
  fixedLayout: boolean | undefined,
  dragged: boolean,
) => {
  if (!fixedLayout || column.getIsPinned()) return fixed(column);

  return column.columnDef.meta?.flex && !dragged
    ? { minWidth: column.getSize() }
    : { width: column.getSize() };
};

const skeletonRows = [0, 1, 2, 3, 4, 5, 6, 7];

// Cells that are not all the same length look like text; the same width in every one looks like
// a stripe.
const skeletonWidths = ["w-4/5", "w-1/2", "w-2/3", "w-3/5", "w-3/4"];

const SkeletonCell = ({
  column,
  row,
  index,
}: {
  column: Column<any>;
  row: number;
  index: number;
}) =>
  column.getIsPinned() ? (
    // The row buttons, as they will be.
    <div className="flex justify-end gap-1">
      <Skeleton className="size-6" />
      <Skeleton className="size-6" />
    </div>
  ) : (
    <Skeleton
      className={`h-4 ${skeletonWidths[(row * 3 + index) % skeletonWidths.length]}`}
    />
  );

// The list before its columns are known (the schema is still loading): a header and rows of
// text, and the search and "new" of the header held in place.
export const TableSkeleton = ({ columns = 5 }: { columns?: number }) => (
  <>
    <HeaderActions>
      <Skeleton className="h-9 w-40 sm:w-64" />
      <Skeleton className="h-9 w-9 sm:w-20" />
    </HeaderActions>
    <div data-bleed className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-8 bg-subtle px-3 py-3.5 shadow-[0_1px_0_var(--color-border)]">
        {Array.from({ length: columns }, (_, index) => (
          <Skeleton
            // biome-ignore lint/suspicious/noArrayIndexKey: a fixed list of placeholders.
            key={index}
            className="h-4 w-20"
          />
        ))}
      </div>
      {skeletonRows.map((row) => (
        <div key={row} className="flex items-center gap-8 border-b px-3 py-3">
          {Array.from({ length: columns }, (_, index) => (
            <Skeleton
              // biome-ignore lint/suspicious/noArrayIndexKey: a fixed list of placeholders.
              key={index}
              className={`h-4 w-20 ${skeletonWidths[(row * 3 + index) % skeletonWidths.length]}`}
            />
          ))}
        </div>
      ))}
    </div>
  </>
);

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
  fixedLayout,
}: {
  table: Table<T>;
  loading?: boolean;
  // What to show when there are no rows: an icon, a sentence and what to do about it.
  empty?: ReactNode;
  // Set while there is another page to load; leave it out on the last one.
  onEnd?: () => void;
  fetchingMore?: boolean;
  // Columns keep the width they are given and cut what does not fit, rather than letting the
  // longest cell decide.
  fixedLayout?: boolean;
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
      <table
        className={`w-full text-left text-sm ${fixedLayout ? "table-fixed" : ""}`}
        style={fixedLayout ? { minWidth: table.getTotalSize() } : undefined}
      >
        <thead className="sticky top-0 z-10 bg-subtle shadow-[0_1px_0_var(--color-border)]">
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => {
                const sortable = header.column.getCanSort();

                return (
                  <th
                    key={header.id}
                    scope="col"
                    style={sized(
                      header.column,
                      fixedLayout,
                      header.column.id in table.getState().columnSizing,
                    )}
                    aria-sort={ariaSort[String(header.column.getIsSorted())]}
                    className={`px-3 py-3 font-medium whitespace-nowrap ${fixedLayout ? "overflow-hidden text-ellipsis" : ""} ${fixedLayout && !header.column.getIsPinned() ? "relative" : ""} ${pinned(header.column, "bg-subtle")}`}
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
                    {fixedLayout && header.column.getCanResize() && (
                      // A strip on the right edge to drag; a double click puts the width back.
                      <div
                        aria-hidden="true"
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        onDoubleClick={() => header.column.resetSize()}
                        className={`absolute top-0 right-0 h-full w-1.5 cursor-col-resize touch-none select-none hover:bg-primary/40 ${header.column.getIsResizing() ? "bg-primary/60" : ""}`}
                      />
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
                  {table.getVisibleLeafColumns().map((column, index) => (
                    <td
                      key={column.id}
                      className={`px-3 py-3 ${fixedLayout ? "overflow-hidden" : ""}`}
                    >
                      <SkeletonCell column={column} row={row} index={index} />
                    </td>
                  ))}
                </tr>
              ))
            : rows.map((row) => (
                <tr key={row.id} className="group border-b hover:bg-subtle">
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      style={sized(
                        cell.column,
                        fixedLayout,
                        cell.column.id in table.getState().columnSizing,
                      )}
                      className={`px-3 py-2 ${fixedLayout ? "overflow-hidden" : ""} ${pinned(cell.column, "bg-background group-hover:bg-subtle")}`}
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
