import { Popover as BasePopover } from "@base-ui/react/popover";
import type { ReactNode } from "react";
import { cn } from "./cn";

export const Popover = BasePopover.Root;
export const PopoverTrigger = BasePopover.Trigger;

export const PopoverContent = ({
  className,
  align = "start",
  children,
  ...props
}: BasePopover.Popup.Props & {
  align?: "start" | "center" | "end";
  children?: ReactNode;
}) => (
  <BasePopover.Portal>
    <BasePopover.Positioner align={align} sideOffset={4} className="z-50">
      <BasePopover.Popup
        className={cn(
          "rounded-control border bg-background text-foreground shadow-md outline-none",
          className as string,
        )}
        {...props}
      >
        {children}
      </BasePopover.Popup>
    </BasePopover.Positioner>
  </BasePopover.Portal>
);
