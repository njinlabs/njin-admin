import { Button, type ButtonProps, cn } from "@njinlabs/njin-admin/ui";
import type { ReactNode } from "react";

// An action of the header: icon and label, and on a narrow screen the icon alone, so that all of
// them fit beside the title. The label stays as the accessible name and the tooltip.
export const ActionButton = ({
  icon,
  label,
  className,
  ...props
}: ButtonProps & { icon: ReactNode; label: string }) => (
  <Button
    aria-label={label}
    title={label}
    className={cn("max-sm:w-9 max-sm:px-0", className)}
    {...props}
  >
    {icon}
    <span className="hidden sm:inline">{label}</span>
  </Button>
);
