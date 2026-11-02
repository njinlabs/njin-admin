import { Select as BaseSelect } from "@base-ui/react/select";
import { Badge } from "./badge";
import { cn } from "./cn";
import type { SelectOption } from "./select";

type MultiSelectProps = {
  options: readonly SelectOption[];
  value: readonly string[];
  onValueChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

// `Select` for a list of values: the popup stays open while choosing and the choices show as
// badges in the trigger.
export const MultiSelect = ({
  options,
  value,
  onValueChange,
  placeholder,
  disabled,
  className,
}: MultiSelectProps) => (
  <BaseSelect.Root
    multiple
    items={options}
    value={[...value]}
    onValueChange={onValueChange}
    disabled={disabled}
  >
    <BaseSelect.Trigger
      className={cn(
        "flex min-h-9 w-full min-w-0 items-center justify-between gap-2 rounded-control border bg-background px-3 py-1 text-sm outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[invalid]:border-danger data-[invalid]:ring-danger/30",
        className,
      )}
    >
      <BaseSelect.Value>
        {(selected: string[]) =>
          selected.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            <span className="flex flex-wrap gap-1">
              {selected.map((item) => (
                <Badge key={item}>
                  {options.find((option) => option.value === item)?.label ??
                    item}
                </Badge>
              ))}
            </span>
          )
        }
      </BaseSelect.Value>
      <BaseSelect.Icon className="text-muted-foreground">
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
      </BaseSelect.Icon>
    </BaseSelect.Trigger>
    <BaseSelect.Portal>
      <BaseSelect.Positioner sideOffset={4} className="z-50 outline-none">
        <BaseSelect.Popup className="max-h-(--available-height) min-w-(--anchor-width) overflow-y-auto rounded-control border bg-background p-1 text-foreground shadow-md outline-none">
          {options.length === 0 && (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">
              Nothing to choose from.
            </p>
          )}
          {options.map((option) => (
            <BaseSelect.Item
              key={option.value}
              value={option.value}
              className="flex cursor-default items-center justify-between gap-2 rounded-control px-2 py-1.5 text-sm outline-none select-none data-[highlighted]:bg-subtle"
            >
              <BaseSelect.ItemText>{option.label}</BaseSelect.ItemText>
              <BaseSelect.ItemIndicator className="text-primary">
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
              </BaseSelect.ItemIndicator>
            </BaseSelect.Item>
          ))}
        </BaseSelect.Popup>
      </BaseSelect.Positioner>
    </BaseSelect.Portal>
  </BaseSelect.Root>
);
