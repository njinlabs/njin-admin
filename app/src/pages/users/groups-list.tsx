import {
  canList,
  hasFullAccess,
  type Row,
  useSession,
} from "@njinlabs/njin-admin/sdk";
import { Badge } from "@njinlabs/njin-admin/ui";
import type { ColumnDef } from "@tanstack/react-table";
import { RecordList } from "../../components/record-list";
import { NoAccess } from "./shared";
import { UsersTabs } from "./users-tabs";

const columns: ColumnDef<Row>[] = [
  { id: "name", accessorKey: "name", header: "Name" },
  {
    id: "description",
    accessorKey: "description",
    header: "Description",
    cell: ({ getValue }) =>
      (getValue() as string | undefined) || (
        <span className="text-muted-foreground">-</span>
      ),
  },
  {
    id: "grants",
    header: "Grants",
    enableSorting: false,
    cell: ({ row }) => {
      const grants = Array.isArray(row.original.grants)
        ? (row.original.grants as string[])
        : [];

      return hasFullAccess(grants) ? (
        <Badge variant="primary">Full access</Badge>
      ) : (
        <Badge>
          {grants.length === 1 ? "1 grant" : `${grants.length} grants`}
        </Badge>
      );
    },
  },
];

// /users/groups
export const GroupsListPage = () => {
  const { permissions } = useSession();

  if (!canList(permissions, "access_group")) {
    return <NoAccess what="Access groups" />;
  }

  return (
    <RecordList
      prefix="access_group"
      name="Access group"
      basePath="/users/groups"
      columns={columns}
      above={<UsersTabs />}
    />
  );
};
