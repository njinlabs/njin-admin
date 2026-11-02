import { Button as BaseButton } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./cn";

const button = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-control text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "border bg-background hover:bg-subtle",
        ghost: "hover:bg-subtle",
        danger: "bg-danger text-white hover:bg-danger/90",
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 px-3",
        icon: "size-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export type ButtonProps = BaseButton.Props & VariantProps<typeof button>;

// `type` is "button" unless given: a button inside a form should not submit it by accident.
export const Button = ({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ButtonProps) => (
  <BaseButton
    type={type}
    className={cn(button({ variant, size }), className as string)}
    {...props}
  />
);
