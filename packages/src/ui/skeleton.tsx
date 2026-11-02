import type { ComponentProps } from "react";
import { cn } from "./cn";

// A placeholder for content that is still loading; size it with classes.
export const Skeleton = ({ className, ...props }: ComponentProps<"div">) => (
  <div
    aria-hidden
    className={cn("animate-pulse rounded-control bg-subtle", className)}
    {...props}
  />
);
