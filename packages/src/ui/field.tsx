import { Field as BaseField } from "@base-ui/react/field";
import type { ComponentProps } from "react";
import { cn } from "./cn";

export const Field = ({
  className,
  orientation = "vertical",
  ...props
}: BaseField.Root.Props & { orientation?: "vertical" | "horizontal" }) => (
  <BaseField.Root
    className={cn(
      "flex gap-2",
      orientation === "horizontal" ? "items-center" : "flex-col",
      className as string,
    )}
    {...props}
  />
);

export const FieldLabel = ({ className, ...props }: BaseField.Label.Props) => (
  <BaseField.Label
    className={cn("text-sm font-medium", className as string)}
    {...props}
  />
);

export const FieldDescription = ({
  className,
  ...props
}: BaseField.Description.Props) => (
  <BaseField.Description
    className={cn("text-sm text-muted-foreground", className as string)}
    {...props}
  />
);

// What react-hook-form's `fieldState.error` looks like; kept structural so the kit does not
// depend on it.
type ErrorLike = { message?: string } | undefined;

// Always shown once rendered: the form library decides when a field is invalid, not the
// browser's validity state. Pass `errors` (as RHF gives them) or plain children.
export const FieldError = ({
  className,
  errors,
  children,
  ...props
}: Omit<ComponentProps<typeof BaseField.Error>, "match"> & {
  errors?: ErrorLike[];
}) => {
  const message =
    children ??
    [...new Set((errors ?? []).map((error) => error?.message))]
      .filter(Boolean)
      .join(", ");

  if (!message) return null;

  return (
    <BaseField.Error
      match
      className={cn("text-sm text-danger", className as string)}
      {...props}
    >
      {message}
    </BaseField.Error>
  );
};
