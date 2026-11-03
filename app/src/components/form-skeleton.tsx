import type { Form } from "@njinlabs/njin-admin/sdk";
import { cn, isWideField, Skeleton } from "@njinlabs/njin-admin/ui";
import { HeaderActions } from "./header-slot";

const labelWidths = ["w-20", "w-28", "w-24", "w-32"];

// What a field looks like before it has loaded: its label and the box it will have, as tall as
// the real one, so the page does not jump when the form takes its place.
const FieldSkeleton = ({
  item,
  index,
}: {
  item: Pick<Form, "type">;
  index: number;
}) => {
  const label = (
    <Skeleton className={cn("h-4", labelWidths[index % labelWidths.length])} />
  );

  switch (item.type) {
    case "boolean":
      return (
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-9 rounded-full" />
          {label}
        </div>
      );
    case "richtext":
      return (
        <div className="space-y-2">
          {label}
          <Skeleton className="h-56 w-full" />
        </div>
      );
    case "object":
    case "array":
      return (
        <div className="space-y-4 rounded-control border p-4">
          {label}
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      );
    case "multi_file":
      return (
        <div className="space-y-2">
          {label}
          <Skeleton className="h-16 w-full" />
        </div>
      );
    default:
      return (
        <div className="space-y-2">
          {label}
          <Skeleton className="h-9 w-full" />
        </div>
      );
  }
};

// Used when the fields are not known yet (the schema is still on its way): a few of the usual.
const usual: Pick<Form, "type">[] = [
  { type: "text" },
  { type: "text" },
  { type: "select" },
  { type: "datepicker" },
  { type: "richtext" },
];

type FormSkeletonProps = {
  // The fields the form will have, when the model is known.
  form?: readonly Pick<Form, "type">[];
  // A bar of languages above the form, for a model that has them.
  tabs?: boolean;
  // How many buttons the header will have, held in place until they are there.
  actions?: number;
  className?: string;
};

// The placeholder of a create or edit page: the same grid as the real form (two columns where
// there is room, the wide fields across both), and the header's buttons.
export const FormSkeleton = ({
  form = usual,
  tabs,
  actions = 2,
  className,
}: FormSkeletonProps) => (
  <>
    <HeaderActions>
      {Array.from({ length: actions }, (_, index) => (
        <Skeleton
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed list of placeholders.
          key={index}
          className="h-9 w-9 sm:w-24"
        />
      ))}
    </HeaderActions>

    {tabs && (
      <div
        data-bleed
        className="flex shrink-0 items-center gap-6 border-b border-border px-4 py-3.5 md:px-8"
      >
        <Skeleton className="h-4 w-8" />
        <Skeleton className="h-4 w-8" />
      </div>
    )}

    <div className={cn(tabs && "px-4 py-6 md:px-8", className)}>
      <div className="@container">
        <div className="grid grid-cols-1 items-start gap-5 @xl:grid-cols-2">
          {form.map((item, index) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: a fixed list of placeholders.
              key={index}
              className={cn("min-w-0", isWideField(item) && "@xl:col-span-2")}
            >
              <FieldSkeleton item={item} index={index} />
            </div>
          ))}
        </div>
      </div>
    </div>
  </>
);
