import { Button } from "@njinlabs/njin-admin/ui";
import type { ReactNode } from "react";

// What the page says while it waits for, or cannot get, something it needs before it can draw.
// Never leave the screen empty: a blank page is indistinguishable from a broken one.
export const Status = ({
  children,
  retry,
}: {
  children: ReactNode;
  retry?: () => void;
}) => (
  <div className="grid min-h-screen place-items-center p-6">
    <div
      role="status"
      className="flex flex-col items-start gap-3 text-sm text-muted-foreground"
    >
      <p>{children}</p>
      {retry && (
        <Button variant="outline" onClick={retry}>
          Try again
        </Button>
      )}
    </div>
  </div>
);
