import {
  Button,
  cn,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@njinlabs/njin-admin/ui";
import type { ReactNode } from "react";

// The bar of languages above a form. `data-bleed` takes the page's own padding away, so the bar
// runs from edge to edge under the header; the form below then pads itself. `children` come after
// the tabs (add a language, remove this one).
export const LocaleTabs = ({
  codes,
  active,
  onSelect,
  failing,
  addable = [],
  onAdd,
  children,
}: {
  codes: string[];
  active?: string;
  onSelect: (code: string) => void;
  // A language with a refused field that the tab on screen does not show gets a mark.
  failing: (code: string) => boolean;
  // Languages that are not tabs yet, offered under "+ Add language".
  addable?: string[];
  onAdd?: (code: string) => void;
  children?: ReactNode;
}) => (
  <div
    data-bleed
    role="tablist"
    className="sticky top-0 z-10 flex shrink-0 items-center overflow-x-auto border-b border-border bg-background px-4 md:px-8"
  >
    {codes.map((code) => (
      <button
        key={code}
        type="button"
        role="tab"
        aria-selected={code === active}
        onClick={() => onSelect(code)}
        className={cn(
          "-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm outline-none transition-colors focus-visible:text-foreground",
          code === active
            ? "border-primary font-medium text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground",
        )}
      >
        {code}
        {failing(code) && (
          <span
            className="size-1.5 rounded-full bg-danger"
            role="img"
            aria-label="has errors"
          />
        )}
      </button>
    ))}
    {addable.length > 0 && onAdd && (
      <Popover>
        <PopoverTrigger
          render={
            <button
              type="button"
              className="-mb-px shrink-0 border-b-2 border-transparent px-3 py-2.5 text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:text-foreground"
            />
          }
        >
          + Add language
        </PopoverTrigger>
        <PopoverContent className="flex w-40 flex-col p-1">
          {addable.map((code) => (
            <Button
              key={code}
              type="button"
              size="sm"
              variant="ghost"
              className="justify-start"
              onClick={() => onAdd(code)}
            >
              {code}
            </Button>
          ))}
        </PopoverContent>
      </Popover>
    )}
    {children}
  </div>
);
