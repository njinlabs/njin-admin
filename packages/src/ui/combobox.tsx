import { Combobox as BaseCombobox } from "@base-ui/react/combobox";
import { cn } from "./cn";
import type { SelectOption } from "./select";

type ComboboxProps = {
  // What the search found. The list is not filtered here: the caller asks for what matches, so
  // the choices can be too many to hold (records of a model).
  options: readonly SelectOption[];
  value: SelectOption | null | undefined;
  onValueChange: (value: SelectOption | null) => void;
  // The text typed in the box, not the label shown after a choice.
  onSearch: (text: string) => void;
  loading?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export const inputClass =
  "h-9 w-full min-w-0 rounded-control border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50 data-[invalid]:border-danger data-[invalid]:ring-danger/30";

export const popupClass =
  "max-h-(--available-height) min-w-(--anchor-width) overflow-y-auto rounded-control border bg-background p-1 text-foreground shadow-md outline-none";

export const itemClass =
  "flex cursor-default items-center justify-between gap-2 rounded-control px-2 py-1.5 text-sm outline-none select-none data-[highlighted]:bg-subtle";

export const Check = () => (
  <svg
    viewBox="0 0 16 16"
    className="size-4"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    aria-hidden="true"
  >
    <path d="m3.5 8.5 3 3 6-7" />
  </svg>
);

// `Select` with a box to type in: one choice out of a list that is searched, not listed.
export const Combobox = ({
  options,
  value,
  onValueChange,
  onSearch,
  loading,
  placeholder,
  disabled,
  className,
}: ComboboxProps) => (
  <BaseCombobox.Root
    items={options}
    value={value ?? null}
    onValueChange={onValueChange}
    onInputValueChange={(text, details) => {
      // Picking a choice fills the box with its label; that is not a new search.
      if (details.reason !== "item-press") onSearch(text);
    }}
    filter={null}
    itemToStringLabel={(option) => option.label}
    isItemEqualToValue={(a, b) => a.value === b.value}
    disabled={disabled}
  >
    <div className={cn("relative", className)}>
      <BaseCombobox.Input
        placeholder={placeholder}
        className={cn(inputClass, "pr-14")}
      />
      <div className="absolute inset-y-0 right-1 flex items-center">
        {value && (
          <BaseCombobox.Clear
            aria-label="Clear"
            className="grid size-6 place-items-center rounded-control text-muted-foreground outline-none hover:text-foreground"
          >
            <svg
              viewBox="0 0 16 16"
              className="size-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="m4 4 8 8M12 4l-8 8" />
            </svg>
          </BaseCombobox.Clear>
        )}
        <BaseCombobox.Trigger
          aria-label="Open"
          className="grid size-6 place-items-center rounded-control text-muted-foreground outline-none"
        >
          <svg
            viewBox="0 0 16 16"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="m4 6 4 4 4-4" />
          </svg>
        </BaseCombobox.Trigger>
      </div>
    </div>
    <BaseCombobox.Portal>
      <BaseCombobox.Positioner sideOffset={4} className="z-50 outline-none">
        <BaseCombobox.Popup className={popupClass}>
          <BaseCombobox.Empty className="px-2 py-1.5 text-sm text-muted-foreground empty:hidden">
            {loading ? "Searching…" : "Nothing found."}
          </BaseCombobox.Empty>
          <BaseCombobox.List>
            {(option: SelectOption) => (
              <BaseCombobox.Item
                key={option.value}
                value={option}
                className={itemClass}
              >
                {option.label}
                <BaseCombobox.ItemIndicator className="text-primary">
                  <Check />
                </BaseCombobox.ItemIndicator>
              </BaseCombobox.Item>
            )}
          </BaseCombobox.List>
        </BaseCombobox.Popup>
      </BaseCombobox.Positioner>
    </BaseCombobox.Portal>
  </BaseCombobox.Root>
);
