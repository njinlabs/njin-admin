import { useState } from "react";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { cn } from "./cn";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

type DatePickerProps = {
  // An ISO date-time, which is how the server stores a date. Empty means no date.
  value: string | null | undefined;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

const pad = (n: number) => String(n).padStart(2, "0");

export const formatDate = (date: Date) =>
  `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;

export const DatePicker = ({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled,
  className,
}: DatePickerProps) => {
  const [open, setOpen] = useState(false);
  const parsed = value ? new Date(value) : undefined;
  // A value that is not a date reads as empty rather than showing "NaN/NaN/NaN".
  const date = parsed && !Number.isNaN(parsed.getTime()) ? parsed : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        render={
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start font-normal data-[invalid]:border-danger",
              !date && "text-muted-foreground",
              className,
            )}
          />
        }
      >
        <svg
          viewBox="0 0 16 16"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" />
          <path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" />
        </svg>
        {date ? formatDate(date) : placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-auto">
        <Calendar
          mode="single"
          selected={date}
          defaultMonth={date}
          onSelect={(selected) => {
            onChange(selected?.toISOString());
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
};
