import { DayPicker, type DayPickerProps } from "react-day-picker";
import { cn } from "./cn";

const Chevron = ({
  orientation,
  className,
}: {
  orientation?: "up" | "down" | "left" | "right";
  className?: string;
}) => (
  <svg
    viewBox="0 0 16 16"
    className={cn("size-4", className)}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    aria-hidden="true"
  >
    <path
      d={
        orientation === "left"
          ? "m10 4-4 4 4 4"
          : orientation === "right"
            ? "m6 4 4 4-4 4"
            : orientation === "up"
              ? "m4 10 4-4 4 4"
              : "m4 6 4 4 4-4"
      }
    />
  </svg>
);

const navButton =
  "inline-flex size-8 items-center justify-center rounded-control outline-none hover:bg-subtle focus-visible:ring-2 focus-visible:ring-primary/50 aria-disabled:opacity-50";

// Styled through classNames only: react-day-picker's own stylesheet is not loaded, so the
// look is the admin's tokens and nothing else.
export const Calendar = ({
  className,
  classNames,
  showOutsideDays = true,
  components,
  ...props
}: DayPickerProps) => (
  <DayPicker
    showOutsideDays={showOutsideDays}
    className={cn("w-fit p-3", className)}
    classNames={{
      months: "relative flex flex-col gap-4",
      month: "flex flex-col gap-3",
      nav: "absolute inset-x-0 top-0 flex items-center justify-between",
      button_previous: navButton,
      button_next: navButton,
      month_caption: "flex h-8 items-center justify-center",
      caption_label: "text-sm font-medium select-none",
      month_grid: "border-collapse",
      weekday: "size-9 text-xs font-normal text-muted-foreground select-none",
      day: "size-9 p-0 text-center text-sm",
      day_button:
        "size-9 rounded-control outline-none hover:bg-subtle focus-visible:ring-2 focus-visible:ring-primary/50",
      selected:
        "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary",
      today:
        "[&>button:not([data-selected])]:font-semibold [&>button:not([data-selected])]:text-primary",
      outside: "text-muted-foreground opacity-60",
      disabled: "opacity-40 [&>button]:pointer-events-none",
      hidden: "invisible",
      ...classNames,
    }}
    components={{ Chevron, ...components }}
    {...props}
  />
);
