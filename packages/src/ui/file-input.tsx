import { type ComponentType, useState } from "react";
import type { FileRow } from "../sdk/api/file";
import { Button } from "./button";

// The window that lists the files of the site and returns the ones chosen. It belongs to the app
// (it asks the server), so the form is given it.
export type FilePicker = ComponentType<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  multiple?: boolean;
  // Only these kinds can be seen, chosen and uploaded.
  accept?: ("image" | "video" | "audio" | "other")[];
  value: FileRow[];
  onChange: (files: FileRow[]) => void;
}>;

// A file is held as the record that was picked, or as just its id when that is all the form has.
const asRow = (value: unknown) =>
  (typeof value === "object" && value !== null
    ? value
    : { id: String(value) }) as FileRow;

const TrashIcon = () => (
  <svg
    viewBox="0 0 16 16"
    className="size-4"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    aria-hidden="true"
  >
    <path d="M2.5 4.5h11M6 4.5V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M4 4.5l.6 8a1 1 0 0 0 1 .9h4.8a1 1 0 0 0 1-.9l.6-8M6.5 7v4M9.5 7v4" />
  </svg>
);

const Preview = ({ file }: { file: FileRow }) =>
  file.type?.startsWith("image/") && file.url ? (
    <img
      src={file.url}
      alt=""
      className="size-10 shrink-0 rounded-control object-cover"
    />
  ) : (
    <div className="grid size-10 shrink-0 place-items-center rounded-control bg-subtle text-xs text-muted-foreground uppercase">
      {file.name?.split(".").pop()?.slice(0, 4) ?? "file"}
    </div>
  );

type FileInputProps = {
  Picker: FilePicker;
  // A file, or just its id; `multiple` takes a list of them.
  value: unknown;
  onChange: (value: unknown) => void;
  multiple?: boolean;
  disabled?: boolean;
};

// Shows the files a field holds and opens the picker to change them. The form keeps the records
// picked, which the schema reduces to their ids when it is checked.
export const FileInput = ({
  Picker,
  value,
  onChange,
  multiple,
  disabled,
}: FileInputProps) => {
  const [open, setOpen] = useState(false);
  const files = (
    multiple ? (Array.isArray(value) ? value : []) : value ? [value] : []
  ).map(asRow);

  return (
    <div className="space-y-2">
      {files.map((file, index) => (
        <div
          key={file.id}
          className="flex items-center gap-3 rounded-control border p-2"
        >
          <Preview file={file} />
          <span className="min-w-0 flex-1 truncate text-sm">
            {file.name ?? file.id}
          </span>
          <Button
            type="button"
            size="icon"
            variant="danger-ghost"
            aria-label="Remove"
            disabled={disabled}
            className="size-7"
            onClick={() =>
              onChange(
                multiple ? files.filter((_, at) => at !== index) : undefined,
              )
            }
          >
            <TrashIcon />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        {multiple
          ? files.length > 0
            ? "Change files"
            : "Choose files"
          : files.length > 0
            ? "Change file"
            : "Choose a file"}
      </Button>
      <Picker
        open={open}
        onOpenChange={setOpen}
        multiple={multiple}
        value={files}
        onChange={(picked) => onChange(multiple ? picked : picked[0])}
      />
    </div>
  );
};
