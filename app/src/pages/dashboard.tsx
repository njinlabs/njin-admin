import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { useSession, visible } from "@njinlabs/njin-admin/sdk";
import { Button, Dialog } from "@njinlabs/njin-admin/ui";
import { Component, type ReactNode, Suspense, useState } from "react";
import {
  PiCheck,
  PiDotsSixVertical,
  PiPencilSimple,
  PiPlus,
  PiX,
} from "react-icons/pi";
import { HeaderActions } from "../components/header-slot";
import {
  addableWidgets,
  moveKey,
  orderedKeys,
  readLayout,
  shownWidgets,
  writeLayout,
} from "../lib/dashboard";
import { type RegisteredWidget, widgets } from "../lib/registry";

// A widget is somebody else's code, so one that breaks is a message in its own tile, not a
// dashboard that no longer opens.
class Contained extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    return this.state.failed ? (
      <p className="text-sm text-muted-foreground">
        This widget failed to load.
      </p>
    ) : (
      this.props.children
    );
  }
}

// The grid follows the width of the dashboard itself: one column on a phone, two on a tablet and
// six on a desktop, where a small widget takes a third, a medium one a half, a large one two
// thirds. A row is as tall as its tallest tile, so tiles side by side line up.
const spans = {
  sm: "",
  md: "",
  lg: "@2xl:col-span-2",
  full: "@2xl:col-span-2",
};
const wideSpans = {
  sm: "@4xl:col-span-2",
  md: "@4xl:col-span-3",
  lg: "@4xl:col-span-4",
  full: "@4xl:col-span-6",
};

const Tile = ({
  widget: { key, title, size = "sm", component: Content },
  index,
  editing,
  onRemove,
}: {
  widget: RegisteredWidget;
  index: number;
  editing: boolean;
  onRemove: () => void;
}) => {
  const { ref, handleRef, isDragging } = useSortable({
    id: key,
    index,
    disabled: !editing,
  });

  return (
    <section
      ref={ref}
      className={`flex min-w-0 flex-col gap-3 rounded-control border bg-gradient-to-t from-primary/5 to-surface p-4 shadow-xs ${spans[size]} ${wideSpans[size]} ${
        editing ? "border-dashed border-primary/60" : "border-border"
      } ${isDragging ? "z-10 opacity-80 shadow-md" : ""}`}
    >
      {(title || editing) && (
        <div className="flex min-h-7 items-center gap-2">
          {editing && (
            <button
              ref={handleRef}
              type="button"
              aria-label="Drag to move"
              title="Drag to move"
              className="-ml-1 cursor-grab touch-none rounded-control p-1 text-muted-foreground hover:bg-subtle active:cursor-grabbing"
            >
              <PiDotsSixVertical />
            </button>
          )}
          <h2 className="min-w-0 flex-1 truncate text-sm font-medium text-muted-foreground">
            {title ?? ""}
          </h2>
          {editing && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="Remove widget"
              title="Remove widget"
              onClick={onRemove}
            >
              <PiX />
            </Button>
          )}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <Contained>
          <Suspense fallback={null}>
            <Content />
          </Suspense>
        </Contained>
      </div>
    </section>
  );
};

const AddDialog = ({
  open,
  onOpenChange,
  options,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: RegisteredWidget[];
  onAdd: (key: string) => void;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange} title="Add widget">
    {options.length === 0 ? (
      <p className="text-sm text-muted-foreground">
        Every widget you can use is already on the dashboard.
      </p>
    ) : (
      <ul className="-mx-2 max-h-96 divide-y divide-border overflow-y-auto">
        {options.map(({ key, title, id }) => (
          <li key={key} className="flex items-center gap-3 px-2 py-2">
            <span className="min-w-0 flex-1 truncate text-sm">
              {title ?? id}
            </span>
            <Button variant="outline" size="sm" onClick={() => onAdd(key)}>
              <PiPlus />
              Add
            </Button>
          </li>
        ))}
      </ul>
    )}
  </Dialog>
);

export const DashboardPage = () => {
  const { user, permissions } = useSession();
  const userId = String(user.id);
  const [saved, setSaved] = useState(() => readLayout(userId));
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);

  const available = visible([...widgets.main, ...widgets.plugins], permissions);
  const shown = shownWidgets(saved, available);
  const addable = addableWidgets(saved, available);
  const keys = orderedKeys(saved, available);

  const save = (next: string[]) => {
    setSaved(next);
    writeLayout(userId, next);
  };

  if (available.length === 0) {
    return (
      <div className="rounded-control border border-border bg-surface p-4 text-muted-foreground">
        Nothing here yet.
      </div>
    );
  }

  return (
    <div className="@container">
      <HeaderActions>
        {editing ? (
          <>
            <Button variant="outline" onClick={() => setAdding(true)}>
              <PiPlus />
              <span className="hidden sm:inline">Add widget</span>
            </Button>
            <Button onClick={() => setEditing(false)}>
              <PiCheck />
              <span className="hidden sm:inline">Done</span>
            </Button>
          </>
        ) : (
          <Button variant="outline" onClick={() => setEditing(true)}>
            <PiPencilSimple />
            <span className="hidden sm:inline">Edit</span>
          </Button>
        )}
      </HeaderActions>

      {shown.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-control border border-dashed border-border bg-surface px-4 py-16 text-center">
          <p className="font-medium">Your dashboard is empty</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Pick the widgets you want to see here. You can move them around
            afterwards.
          </p>
          <Button
            onClick={() => {
              setEditing(true);
              setAdding(true);
            }}
          >
            <PiPlus />
            Add widget
          </Button>
        </div>
      ) : (
        <DragDropProvider
          onDragEnd={(event) => {
            const { source } = event.operation;
            if (event.canceled || !source || !isSortable(source)) return;

            const next = moveKey(keys, source.initialIndex, source.index);
            if (next !== keys) save(next);
          }}
        >
          <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2 @4xl:grid-cols-6">
            {shown.map((widget, index) => (
              <Tile
                key={widget.key}
                widget={widget}
                index={index}
                editing={editing}
                onRemove={() => save(keys.filter((key) => key !== widget.key))}
              />
            ))}
          </div>
        </DragDropProvider>
      )}

      <AddDialog
        open={adding}
        onOpenChange={setAdding}
        options={addable}
        onAdd={(key) => {
          save([...keys, key]);
          setAdding(false);
        }}
      />
    </div>
  );
};
