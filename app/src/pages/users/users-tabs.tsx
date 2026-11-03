import { canList, useSession } from "@njinlabs/njin-admin/sdk";
import { Link } from "@tanstack/react-router";

// The router marks the link of the page you are on with data-status="active"; a data variant
// beats the plain colours whatever the order of the stylesheet.
const tab =
  "rounded-control border border-transparent px-3 py-1.5 text-sm text-muted-foreground hover:bg-subtle hover:text-foreground data-[status=active]:border-border data-[status=active]:bg-subtle data-[status=active]:text-foreground";

// Users and their access groups are two lists of one section. The groups tab is only there for
// someone who may open that list.
export const UsersTabs = () => {
  const { permissions } = useSession();

  if (!canList(permissions, "access_group")) return null;

  return (
    <nav className="flex shrink-0 gap-1 border-b border-border px-4 py-2 md:px-8">
      <Link
        to={"/users" as string}
        className={tab}
        activeOptions={{ exact: true }}
      >
        Users
      </Link>
      <Link to={"/users/groups" as string} className={tab}>
        Access groups
      </Link>
    </nav>
  );
};
