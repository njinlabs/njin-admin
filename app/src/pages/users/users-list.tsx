import { canList, type Row, useSession } from "@njinlabs/njin-admin/sdk";
import { Badge } from "@njinlabs/njin-admin/ui";
import type { ColumnDef } from "@tanstack/react-table";
import { useCallback } from "react";
import { RecordList } from "../../components/record-list";
import { NoAccess, nameOf } from "./shared";
import { UsersTabs } from "./users-tabs";

const columns: ColumnDef<Row>[] = [
  { id: "name", accessorKey: "name", header: "Name" },
  { id: "email", accessorKey: "email", header: "Email" },
  {
    id: "groups",
    header: "Access groups",
    enableSorting: false,
    cell: ({ row }) => {
      const groups = Array.isArray(row.original.groups)
        ? row.original.groups
        : [];

      return groups.length === 0 ? (
        <span className="text-muted-foreground">No access</span>
      ) : (
        <div className="flex flex-wrap gap-1">
          {groups.map((group) => (
            <Badge key={nameOf(group)}>{nameOf(group)}</Badge>
          ))}
        </div>
      );
    },
  },
];

// /users
export const UsersListPage = () => {
  const { user, permissions } = useSession();
  // Nobody can delete the account they are signed in with; the server refuses it too.
  const keep = useCallback((row: Row) => row.id === user.id, [user.id]);

  if (!canList(permissions, "user")) return <NoAccess what="Users" />;

  return (
    <RecordList
      prefix="user"
      name="User"
      basePath="/users"
      columns={columns}
      above={<UsersTabs />}
      keep={keep}
    />
  );
};
