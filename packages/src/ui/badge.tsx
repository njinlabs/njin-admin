import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "./cn";

const badge = cva(
  "inline-flex max-w-full items-center gap-1 rounded-control border px-2 py-0.5 text-xs font-medium whitespace-nowrap [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-subtle text-foreground",
        primary: "border-primary/30 bg-primary/10 text-primary",
        danger: "border-danger/30 bg-danger/10 text-danger",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export type BadgeProps = ComponentProps<"span"> & VariantProps<typeof badge>;

export const Badge = ({ className, variant, ...props }: BadgeProps) => (
  <span className={cn(badge({ variant }), className)} {...props} />
);
