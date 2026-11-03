import { Select as BaseSelect } from "@base-ui/react/select";
import { cn } from "./cn";

export type SelectOption = { value: string; label: string };

type SelectProps = {
  options: readonly SelectOption[];
  value: string | null | undefined;
  onValueChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

// Flat on purpose: the admin only ever picks one of a list of strings. `value` null (or
// undefined) shows the placeholder.
export const Select = ({
  options,
  value,
  onValueChange,
  placeholder,
  disabled,
  className,
}: SelectProps) => (
  <BaseSelect.Root
    items={options}
    value={value ?? null}
    onValueChange={onValueChange}
    disabled={disabled}
  >
    <BaseSelect.Trigger
      className={cn(
        "flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-control border bg-background px-3 text-sm outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[invalid]:border-danger data-[invalid]:ring-danger/30",
        className,
      )}
    >
      <BaseSelect.Value placeholder={placeholder}>
        {(selected: string | null) =>
          options.find((option) => option.value === selected)?.label ??
          placeholder
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
      <BaseSelect.Positioner
        sideOffset={4}
        alignItemWithTrigger={false}
        className="z-50 outline-none"
      >
        <BaseSelect.Popup className="max-h-(--available-height) min-w-(--anchor-width) overflow-y-auto rounded-control border bg-background p-1 text-foreground shadow-md outline-none">
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
