import { Switch as BaseSwitch } from "@base-ui/react/switch";
import { cn } from "./cn";

export const Switch = ({ className, ...props }: BaseSwitch.Root.Props) => (
  <BaseSwitch.Root
    className={cn(
      "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent bg-border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/50 data-[checked]:bg-primary data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[invalid]:ring-2 data-[invalid]:ring-danger/40",
      className as string,
    )}
    {...props}
  >
    <BaseSwitch.Thumb className="pointer-events-none block size-4 translate-x-0.5 rounded-full bg-background shadow-sm transition-transform data-[checked]:translate-x-[18px]" />
  </BaseSwitch.Root>
);
