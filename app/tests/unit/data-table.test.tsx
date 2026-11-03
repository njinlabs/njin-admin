import { describe, expect, test } from "bun:test";
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { renderToString } from "react-dom/server";
import { DataTable } from "../../src/components/data-table";

type Person = { id: string; name: string };

const columns: ColumnDef<Person>[] = [
  { accessorKey: "name", header: "Name" },
  { id: "actions", header: "Actions", enableSorting: false },
];

const Harness = ({
  data,
  loading,
  desc,
}: {
  data: Person[];
  loading?: boolean;
  desc?: boolean;
}) => {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    state: { sorting: desc === undefined ? [] : [{ id: "name", desc }] },
  });

  return <DataTable table={table} loading={loading} empty="Nobody." />;
};

const render = (props: Parameters<typeof Harness>[0]) =>
  renderToString(<Harness {...props} />);

describe("DataTable", () => {
  test("draws a row per record", () => {
    const html = render({
      data: [
        { id: "1", name: "Ada" },
        { id: "2", name: "Grace" },
      ],
    });

    expect(html).toContain("Ada");
    expect(html).toContain("Grace");
  });

  test("only a sortable column has a button in its header", () => {
    const html = render({ data: [] });

    expect(html).toContain("<button");
    expect(html.match(/<button/g)).toHaveLength(1);
  });

  test("the sorted column says which way", () => {
    expect(render({ data: [], desc: false })).toContain(
      'aria-sort="ascending"',
    );
    expect(render({ data: [], desc: true })).toContain(
      'aria-sort="descending"',
    );
    expect(render({ data: [] })).not.toContain("aria-sort");
  });

  test("loading shows placeholders instead of rows, empty shows the message", () => {
    const loading = render({ data: [{ id: "1", name: "Ada" }], loading: true });

    expect(loading).toContain("animate-pulse");
    expect(loading).not.toContain("Ada");
    expect(render({ data: [] })).toContain("Nobody.");
  });
});

describe("DataTable with a fixed layout", () => {
  const sized: ColumnDef<Person>[] = [
    { accessorKey: "name", header: "Name", size: 240, meta: { flex: true } },
    { accessorKey: "id", header: "Id", size: 88 },
  ];

  const Fixed = () => {
    const table = useReactTable({
      data: [{ id: "1", name: "Ada" }],
      columns: sized,
      getCoreRowModel: getCoreRowModel(),
    });

    return <DataTable table={table} fixedLayout />;
  };

  test("a column is as wide as its size, and the flex one has it as its least", () => {
    const html = renderToString(<Fixed />);

    expect(html).toContain("table-fixed");
    expect(html).toContain("min-width:328px");
    expect(html).toContain("width:88px");
    expect(html).toContain("min-width:240px");
    expect(html).not.toMatch(/[^-]width:240px/);
  });

  test("a table without it is left as it was", () => {
    expect(render({ data: [] })).not.toContain("table-fixed");
  });
});
