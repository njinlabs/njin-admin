import { Input as BaseInput } from "@base-ui/react/input";
import { cn } from "./cn";

export const Input = ({ className, ...props }: BaseInput.Props) => (
  <BaseInput
    className={cn(
      "h-9 w-full min-w-0 rounded-control border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50 data-[invalid]:border-danger data-[invalid]:ring-danger/30",
      className as string,
    )}
    {...props}
  />
);
