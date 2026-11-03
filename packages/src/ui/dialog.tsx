import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import type { ReactNode } from "react";
import { cn } from "./cn";

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  // Buttons at the foot, right-aligned.
  footer?: ReactNode;
  // Classes for the popup, to make it wider or taller than the default.
  className?: string;
  children?: ReactNode;
};

// A window over the page for content of any kind (a picker, a form). For a plain yes or no use
// `ConfirmDialog`.
export const Dialog = ({
  open,
  onOpenChange,
  title,
  footer,
  className,
  children,
}: DialogProps) => (
  <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
    <BaseDialog.Portal>
      <BaseDialog.Backdrop className="fixed inset-0 z-50 bg-foreground/40 transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
      <BaseDialog.Popup
        className={cn(
          "fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-control border bg-background text-foreground shadow-md outline-none transition-[opacity,scale] duration-150 data-[ending-style]:scale-95 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
          className,
        )}
      >
        <BaseDialog.Title className="shrink-0 px-5 pt-5 text-lg font-semibold">
          {title}
        </BaseDialog.Title>
        <div className="flex min-h-0 flex-1 flex-col px-5 py-4">{children}</div>
        {footer && (
          <div className="flex shrink-0 justify-end gap-2 px-5 pb-5">
            {footer}
          </div>
        )}
      </BaseDialog.Popup>
    </BaseDialog.Portal>
  </BaseDialog.Root>
);
