import { Toast } from "@base-ui/react/toast";
import { cn } from "./cn";

// One manager for the whole page, so a toast can be raised from anywhere (a mutation's callback, a
// plugin) without a hook. It lives in the kit, which plugins share with the admin, so they all
// reach the one `Toaster` the admin mounts.
const manager = Toast.createToastManager();

type Kind = "success" | "error" | "info";

const show = (kind: Kind, title: string, description?: string) =>
  manager.add({
    type: kind,
    title,
    description,
    // An error stays until read; the rest go on their own.
    timeout: kind === "error" ? 8000 : 4000,
    priority: kind === "error" ? "high" : "low",
  });

export const toast = {
  success: (title: string, description?: string) =>
    show("success", title, description),
  error: (title: string, description?: string) =>
    show("error", title, description),
  info: (title: string, description?: string) =>
    show("info", title, description),
  close: (id?: string) => manager.close(id),
};

const marks: Record<Kind, string> = {
  success: "bg-primary",
  error: "bg-danger",
  info: "bg-muted-foreground",
};

const Toasts = () => {
  const { toasts } = Toast.useToastManager();

  return toasts.map((item) => (
    <Toast.Root
      key={item.id}
      toast={item}
      className="flex w-full items-start gap-3 rounded-control border bg-background p-3 text-foreground shadow-md transition-[opacity,translate] duration-200 data-[ending-style]:translate-y-2 data-[starting-style]:translate-y-2 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0"
    >
      <span
        aria-hidden="true"
        className={cn(
          "mt-1.5 size-2 shrink-0 rounded-full",
          marks[(item.type as Kind) ?? "info"] ?? marks.info,
        )}
      />
      <div className="min-w-0 flex-1">
        <Toast.Title className="text-sm font-medium" />
        <Toast.Description className="mt-0.5 text-sm text-muted-foreground" />
      </div>
      <Toast.Close
        aria-label="Dismiss"
        className="-m-1 rounded-control p-1 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/30"
      >
        <svg
          viewBox="0 0 16 16"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path d="m4 4 8 8M12 4l-8 8" />
        </svg>
      </Toast.Close>
    </Toast.Root>
  ));
};

// Mounted once, near the root of the page; shows what `toast` raises.
export const Toaster = () => (
  <Toast.Provider toastManager={manager}>
    <Toast.Portal>
      <Toast.Viewport className="fixed bottom-4 left-1/2 z-[60] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col gap-2 outline-none">
        <Toasts />
      </Toast.Viewport>
    </Toast.Portal>
  </Toast.Provider>
);
