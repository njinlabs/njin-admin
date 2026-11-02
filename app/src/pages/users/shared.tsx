import { Button } from "@njinlabs/njin-admin/ui";

export const NoAccess = ({ what }: { what: string }) => (
  <p className="p-4 text-muted-foreground md:px-8">
    You do not have access to {what}.
  </p>
);

export const LoadError = ({
  what,
  onRetry,
}: {
  what: string;
  onRetry: () => void;
}) => (
  <div className="flex flex-col items-start gap-2 text-sm text-muted-foreground">
    <p>{what} could not be loaded.</p>
    <Button size="sm" variant="outline" onClick={onRetry}>
      Try again
    </Button>
  </div>
);

// A relation comes expanded or as a bare id, depending on what the caller may read.
export const idOf = (value: unknown) =>
  typeof value === "object" && value !== null
    ? String((value as { id?: unknown }).id ?? "")
    : String(value);

export const nameOf = (value: unknown) =>
  typeof value === "object" && value !== null
    ? String((value as { name?: unknown }).name ?? idOf(value))
    : String(value);
