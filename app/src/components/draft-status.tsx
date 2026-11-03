import type { Row } from "@njinlabs/njin-admin/sdk";
import { Badge } from "@njinlabs/njin-admin/ui";
import { TitleBadge } from "./header-slot";

export type Status = "draft" | "published" | "changed";

// Where the record stands as a whole. A model with i18n keeps a status for each language, as a
// map, but they are saved and published together: all live is live, none live is a draft, and
// anything between has edits that are not live yet.
export const overallStatus = (record: Row): Status | null => {
  const { status } = record;

  if (typeof status === "string") return status as Status;
  if (typeof status !== "object" || status === null) return null;

  const all = Object.values(status as Record<string, Status>);
  if (all.length === 0) return null;
  if (all.every((entry) => entry === "published")) return "published";
  if (all.every((entry) => entry === "draft")) return "draft";

  return "changed";
};

export const statusLabels: Record<Status, string> = {
  draft: "Draft",
  published: "Published",
  changed: "Has unpublished changes",
};

// Where a draftable record stands (draft, live, live with edits), as a badge beside the page
// title. The buttons that move it are the page's own.
export const StatusBadge = ({ record }: { record: Row }) => {
  const status = overallStatus(record);

  if (!status) return null;

  return (
    <TitleBadge>
      <Badge variant={status === "published" ? "primary" : "default"}>
        {/* The header is crowded on a phone, where the long one would push the title out. */}
        {status === "changed" && <span className="sm:hidden">Changed</span>}
        <span className={status === "changed" ? "hidden sm:inline" : undefined}>
          {statusLabels[status]}
        </span>
      </Badge>
    </TitleBadge>
  );
};

// The status in a list cell: the same badge, without the header slot.
export const StatusCell = ({ record }: { record: Row }) => {
  const status = overallStatus(record);

  if (!status) return <span className="text-muted-foreground">-</span>;

  return (
    <Badge variant={status === "published" ? "primary" : "default"}>
      {statusLabels[status]}
    </Badge>
  );
};
