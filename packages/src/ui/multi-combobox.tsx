import { Combobox as BaseCombobox } from "@base-ui/react/combobox";
import { cn } from "./cn";
import { Check, inputClass, itemClass, popupClass } from "./combobox";
import type { SelectOption } from "./select";

type MultiComboboxProps = {
  options: readonly SelectOption[];
  value: readonly SelectOption[];
  onValueChange: (value: SelectOption[]) => void;
  onSearch: (text: string) => void;
  loading?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

// `Combobox` for a list of choices: they show as chips in front of the box, and the popup stays
// open while choosing.
export const MultiCombobox = ({
  options,
  value,
  onValueChange,
  onSearch,
  loading,
  placeholder,
  disabled,
  className,
}: MultiComboboxProps) => (
  <BaseCombobox.Root
    multiple
    items={options}
    value={[...value]}
    onValueChange={onValueChange}
    onInputValueChange={(text, details) => {
      if (details.reason !== "item-press") onSearch(text);
    }}
    filter={null}
    itemToStringLabel={(option) => option.label}
    isItemEqualToValue={(a, b) => a.value === b.value}
    disabled={disabled}
  >
    <BaseCombobox.Chips
      className={cn(
        inputClass,
        "flex h-auto min-h-9 flex-wrap items-center gap-1 py-1 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30",
        className,
      )}
    >
      <BaseCombobox.Value>
        {(selected: SelectOption[]) => (
          <>
            {selected.map((option) => (
              <BaseCombobox.Chip
                key={option.value}
                aria-label={option.label}
                className="flex items-center gap-1 rounded-control bg-subtle py-0.5 pr-1 pl-2 text-xs"
              >
                {option.label}
                <BaseCombobox.ChipRemove
                  aria-label={`Remove ${option.label}`}
                  className="grid size-4 place-items-center rounded-control text-muted-foreground outline-none hover:text-foreground"
                >
                  <svg
                    viewBox="0 0 16 16"
                    className="size-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden="true"
                  >
                    <path d="m4 4 8 8M12 4l-8 8" />
                  </svg>
                </BaseCombobox.ChipRemove>
              </BaseCombobox.Chip>
            ))}
            <BaseCombobox.Input
              placeholder={selected.length === 0 ? placeholder : undefined}
              className="h-6 min-w-16 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
            />
          </>
        )}
      </BaseCombobox.Value>
    </BaseCombobox.Chips>
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
