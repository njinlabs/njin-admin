import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { cn } from "./cn";

export const Checkbox = ({ className, ...props }: BaseCheckbox.Root.Props) => (
  <BaseCheckbox.Root
    className={cn(
      "flex size-4 shrink-0 items-center justify-center rounded-[4px] border bg-background text-primary-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/50 data-[checked]:border-primary data-[checked]:bg-primary data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[invalid]:border-danger",
      className as string,
    )}
    {...props}
  >
    <BaseCheckbox.Indicator>
      <svg
        viewBox="0 0 16 16"
        className="size-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="m3.5 8.5 3 3 6-7" />
      </svg>
    </BaseCheckbox.Indicator>
  </BaseCheckbox.Root>
);
