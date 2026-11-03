import type { FileRow } from "@njinlabs/njin-admin/sdk";
import { Button, Dialog } from "@njinlabs/njin-admin/ui";
import { useEffect, useState } from "react";
import type { Accept } from "../lib/file";
import { FileManager } from "./file-manager";

// The file manager in a window, with a button to take the choice. The choice is held here until
// "Select", so closing the window leaves `value` as it was.
export const FilePickerDialog = ({
  open,
  onOpenChange,
  multiple = false,
  accept,
  value,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  multiple?: boolean;
  // Only these kinds can be seen, chosen and uploaded: ["image"], or ["video"] for one video.
  accept?: Accept[];
  value: FileRow[];
  onChange: (files: FileRow[]) => void;
}) => {
  const [pending, setPending] = useState(value);

  // biome-ignore lint/correctness/useExhaustiveDependencies: start from `value` each time it opens, not when it changes.
  useEffect(() => {
    if (open) setPending(value);
  }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={multiple ? "Select files" : "Select a file"}
      className="h-[85vh] max-w-4xl"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={pending.length === 0}
            onClick={() => {
              onChange(pending);
              onOpenChange(false);
            }}
          >
            Select{pending.length > 1 ? ` (${pending.length})` : ""}
          </Button>
        </>
      }
    >
      <FileManager
        picker={{ multiple, accept, value: pending, onChange: setPending }}
      />
    </Dialog>
  );
};
