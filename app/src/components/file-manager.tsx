import {
  can,
  canOn,
  destroyRecordMutation,
  type FileRow,
  recordsInfiniteQuery,
  toApiError,
  uploadFileMutation,
} from "@njinlabs/njin-admin/sdk";
import {
  Button,
  ConfirmDialog,
  cn,
  formatDate,
  Input,
  Select,
  Skeleton,
} from "@njinlabs/njin-admin/ui";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { type ReactNode, useMemo, useRef, useState } from "react";
import {
  PiCaretDown,
  PiCaretUp,
  PiCheck,
  PiCheckCircle,
  PiDownloadSimple,
  PiFile,
  PiLink,
  PiMagnifyingGlass,
  PiRows,
  PiSquaresFour,
  PiTrash,
  PiUploadSimple,
  PiXCircle,
} from "react-icons/pi";
import { client } from "../lib/client";
import {
  type Accept,
  absoluteUrl,
  acceptAttribute,
  formatBytes,
  isAbsoluteUrl,
  type Kind,
  kinds,
  matchesAccept,
  matchesKind,
  type SortKey,
  sorts,
} from "../lib/file";
import { useDebounced } from "../lib/use-debounced";
import { useEndReached } from "../lib/use-end-reached";
import { HeaderActions } from "./header-slot";
import { ListError } from "./record-list";
import { useSession } from "./session";

const limit = 24;

// What makes the manager a picker: the files chosen so far and how to change them. The button that
// confirms the choice belongs to whoever holds the manager (`FilePickerDialog`).
export type Picker = {
  multiple: boolean;
  // Limits the files to these kinds (images, or images and video). Leave out for any file.
  accept?: Accept[];
  value: FileRow[];
  onChange: (files: FileRow[]) => void;
};

type Upload = {
  id: string;
  name: string;
  progress: number;
  status: "uploading" | "done" | "failed";
  error?: string;
};

type View = "grid" | "list";

const views = [
  { value: "grid", label: "Grid view", Icon: PiSquaresFour },
  { value: "list", label: "List view", Icon: PiRows },
] as const;

// The view is a per-person habit, so it is remembered in the browser; without storage it is the grid.
const useViewPreference = () => {
  const [view, set] = useState<View>(() => {
    try {
      return localStorage.getItem("files.view") === "list" ? "list" : "grid";
    } catch {
      return "grid";
    }
  });

  return [
    view,
    (next: View) => {
      set(next);
      try {
        localStorage.setItem("files.view", next);
      } catch {}
    },
  ] as const;
};

const grid =
  "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";

const Thumbnail = ({ file, small }: { file: FileRow; small?: boolean }) =>
  file.type.startsWith("image/") ? (
    <img
      src={file.url}
      alt=""
      loading="lazy"
      className="size-full object-cover"
    />
  ) : (
    <PiFile
      className={cn("text-muted-foreground", small ? "size-5" : "size-10")}
    />
  );

// An externally hosted file (S3) is cross-origin: fetch() would need CORS headers from that
// server, and `download` is ignored cross-origin anyway, so it opens in a new tab instead.
const download = async (file: FileRow) => {
  if (isAbsoluteUrl(file.url)) {
    window.open(file.url, "_blank", "noopener,noreferrer");
    return;
  }

  const blob = await (await fetch(file.url)).blob();
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = file.name;
  link.click();
  URL.revokeObjectURL(href);
};

const FileItem = ({
  view,
  file,
  picked,
  onPick,
  onDelete,
  onNotice,
}: {
  view: View;
  file: FileRow;
  // Set in a picker: whether the file is chosen, and how to toggle it.
  picked?: boolean;
  onPick?: () => void;
  onDelete?: () => void;
  onNotice: (message: string) => void;
}) => {
  const list = view === "list";

  const actions = (
    <>
      <Button
        variant="outline"
        size="icon"
        className="size-8"
        aria-label={`Download ${file.name}`}
        onClick={() =>
          download(file).catch(() =>
            onNotice("The file could not be downloaded"),
          )
        }
      >
        <PiDownloadSimple />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="size-8"
        aria-label={`Copy link of ${file.name}`}
        onClick={() =>
          navigator.clipboard
            .writeText(absoluteUrl(file.url))
            .then(() => onNotice("Link copied"))
            .catch(() => onNotice("The link could not be copied"))
        }
      >
        <PiLink />
      </Button>
      {onDelete && (
        <Button
          variant="danger"
          size="icon"
          className="size-8"
          aria-label={`Delete ${file.name}`}
          onClick={onDelete}
        >
          <PiTrash />
        </Button>
      )}
    </>
  );

  const body = list ? (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-control bg-subtle">
        <Thumbnail file={file} small />
      </div>
      <span
        className="min-w-0 flex-1 truncate text-sm font-medium"
        title={file.name}
      >
        {file.name}
      </span>
      <span className="hidden w-32 truncate text-sm text-muted-foreground md:block">
        {file.type}
      </span>
      <span className="w-20 text-right text-sm text-muted-foreground">
        {formatBytes(file.size)}
      </span>
      <span className="hidden w-28 text-right text-sm text-muted-foreground sm:block">
        {formatDate(new Date(file.createdAt))}
      </span>
    </div>
  ) : (
    <>
      <div className="flex aspect-square items-center justify-center overflow-hidden bg-subtle">
        <Thumbnail file={file} />
      </div>
      <div className="flex flex-col gap-0.5 p-2.5">
        <span className="truncate text-xs font-medium" title={file.name}>
          {file.name}
        </span>
        <span className="text-xs text-muted-foreground">
          {formatBytes(file.size)}
        </span>
      </div>
    </>
  );

  const mark = onPick && (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none grid size-5 shrink-0 place-items-center rounded-full border bg-background",
        !list && "absolute top-2 left-2",
        picked && "border-primary bg-primary text-primary-foreground",
      )}
    >
      {picked && <PiCheck className="size-3.5" />}
    </span>
  );

  const pick = (children: ReactNode, className: string) =>
    onPick ? (
      <button
        type="button"
        aria-pressed={picked}
        onClick={onPick}
        className={cn(
          "text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
          className,
        )}
      >
        {children}
      </button>
    ) : (
      <div className={className}>{children}</div>
    );

  return (
    <div
      className={cn(
        "group relative rounded-control border bg-background",
        list ? "flex items-center gap-3 p-2" : "overflow-hidden",
        picked && "ring-2 ring-primary",
      )}
    >
      {list && mark}
      {pick(
        body,
        list ? "flex min-w-0 flex-1 rounded-control" : "block w-full",
      )}
      {!list && mark}
      <div
        className={cn(
          "flex gap-1",
          !list &&
            "absolute top-2 right-2 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100",
        )}
      >
        {actions}
      </div>
    </div>
  );
};

const UploadPanel = ({ uploads }: { uploads: Upload[] }) => {
  const [expanded, setExpanded] = useState(false);
  if (uploads.length === 0) return null;

  const running = uploads.filter(({ status }) => status === "uploading").length;
  const failed = uploads.filter(({ status }) => status === "failed").length;
  const overall = Math.round(
    uploads.reduce((sum, { progress }) => sum + progress, 0) / uploads.length,
  );
  const summary =
    running > 0
      ? `Uploading ${running} of ${uploads.length} files…`
      : failed > 0
        ? `${failed} of ${uploads.length} files failed`
        : `${uploads.length} files uploaded`;

  return (
    <div
      role="status"
      className="fixed right-4 bottom-4 z-[60] w-80 rounded-control border bg-background shadow-md"
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 p-3 text-left"
      >
        <PiUploadSimple className="size-4 shrink-0 text-muted-foreground" />
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="truncate text-xs font-medium">{summary}</span>
          {!expanded && (
            <Bar value={overall} failed={failed > 0 && running === 0} />
          )}
        </span>
        {expanded ? <PiCaretDown /> : <PiCaretUp />}
      </button>
      {expanded && (
        <ul className="max-h-64 overflow-y-auto border-t">
          {uploads.map((upload) => (
            <li
              key={upload.id}
              className="flex flex-col gap-1.5 border-b p-3 last:border-b-0"
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className="truncate text-xs font-medium"
                  title={upload.name}
                >
                  {upload.name}
                </span>
                {upload.status === "done" ? (
                  <PiCheckCircle className="shrink-0 text-primary" />
                ) : upload.status === "failed" ? (
                  <PiXCircle className="shrink-0 text-danger" />
                ) : (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {upload.progress}%
                  </span>
                )}
              </div>
              <Bar
                value={upload.progress}
                failed={upload.status === "failed"}
              />
              {upload.error && (
                <span className="text-xs text-danger">{upload.error}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const Bar = ({ value, failed }: { value: number; failed: boolean }) => (
  <span className="block h-1.5 overflow-hidden rounded-full bg-subtle">
    <span
      className={cn(
        "block h-full transition-[width]",
        failed ? "bg-danger" : "bg-primary",
      )}
      style={{ width: `${value}%` }}
    />
  </span>
);

// The files of the site as a searchable grid that loads page after page, with upload, download,
// copy link and delete for whoever may. With `picker` it also lets files be chosen (one or many);
// that is the only difference between the Files page and the file picker.
export const FileManager = ({ picker }: { picker?: Picker }) => {
  const queryClient = useQueryClient();
  const { user, permissions } = useSession();
  const [searchText, setSearchText] = useState("");
  const [deleting, setDeleting] = useState<FileRow | null>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [notice, setNotice] = useState("");
  const noticeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const input = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const search = useDebounced(searchText.trim());
  const [view, changeView] = useViewPreference();
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [kind, setKind] = useState<Kind>("all");
  const order = sorts.find(({ value }) => value === sortKey) ?? sorts[0];

  const files = useInfiniteQuery(
    recordsInfiniteQuery<FileRow>(client, "file", {
      search: search || undefined,
      limit,
      sort: order.sort,
      order: order.order,
    }),
  );
  // The server cannot filter by type, so a kind narrows what has been loaded; the next pages
  // keep coming while the end of the list is in view.
  const rows = useMemo(
    () =>
      (files.data?.pages.flatMap((page) => page.data) ?? []).filter(
        ({ type }) =>
          matchesAccept(type, picker?.accept) && matchesKind(type, kind),
      ),
    [files.data, kind, picker?.accept],
  );
  const sentinel = useEndReached(
    scroller,
    !!files.hasNextPage && !files.isFetchingNextPage,
    () => files.fetchNextPage(),
    rows.length,
  );

  const destroy = useMutation(
    destroyRecordMutation(client, queryClient, "file"),
  );
  const upload = useMutation(uploadFileMutation(client, queryClient));
  const mayUpload = !!can(permissions, "file", "create");

  const say = (message: string) => {
    setNotice(message);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 3000);
  };

  const change = (id: string, patch: Partial<Upload>) =>
    setUploads((all) =>
      all.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );

  const send = (list: FileList | null) => {
    for (const file of Array.from(list ?? [])) {
      const id = crypto.randomUUID();
      setUploads((all) => [
        ...all,
        { id, name: file.name, progress: 0, status: "uploading" },
      ]);

      let failed = false;

      upload
        .mutateAsync({
          file,
          onProgress: (progress) => change(id, { progress }),
        })
        .then(() => change(id, { progress: 100, status: "done" }))
        .catch((error) => {
          failed = true;
          change(id, { status: "failed", error: toApiError(error).message });
        })
        // A failure stays longer, so its reason can be read.
        .finally(() =>
          setTimeout(
            () => setUploads((all) => all.filter((item) => item.id !== id)),
            failed ? 8000 : 2500,
          ),
        );
    }
  };

  // Of the kinds the picker allows, which can be told apart; one kind needs no choice.
  const kindOptions = kinds.filter(
    ({ value }) =>
      value === "all" ||
      !picker?.accept ||
      picker.accept.includes(value as Accept),
  );

  const toggle = (file: FileRow) => {
    if (!picker) return;

    const chosen = picker.value.some(({ id }) => id === file.id);
    if (picker.multiple) {
      picker.onChange(
        chosen
          ? picker.value.filter(({ id }) => id !== file.id)
          : [...picker.value, file],
      );
    } else {
      picker.onChange(chosen ? [] : [file]);
    }
  };

  const toolbar = (
    <>
      <Input
        type="search"
        aria-label="Search"
        placeholder="Search files…"
        value={searchText}
        onChange={(event) => setSearchText(event.target.value)}
        className="w-40 sm:w-64"
      />
      {mayUpload && (
        <>
          <input
            ref={input}
            type="file"
            multiple={picker?.multiple ?? true}
            accept={acceptAttribute(picker?.accept)}
            hidden
            onChange={(event) => {
              send(event.target.files);
              event.target.value = "";
            }}
          />
          <Button onClick={() => input.current?.click()}>
            <PiUploadSimple />
            <span className="hidden sm:inline">Upload</span>
          </Button>
        </>
      )}
    </>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {picker ? (
        <div className="flex items-center gap-2">{toolbar}</div>
      ) : (
        <HeaderActions>{toolbar}</HeaderActions>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          options={sorts}
          value={sortKey}
          onValueChange={(value) => value && setSortKey(value as SortKey)}
          className="w-40"
        />
        {picker?.accept?.length !== 1 && (
          <Select
            options={kindOptions}
            value={kind}
            onValueChange={(value) => value && setKind(value as Kind)}
            className="w-32"
          />
        )}
        <div className="ml-auto flex gap-1">
          {views.map(({ value, label, Icon }) => (
            <Button
              key={value}
              variant={view === value ? "default" : "outline"}
              size="icon"
              aria-label={label}
              aria-pressed={view === value}
              onClick={() => changeView(value)}
            >
              <Icon />
            </Button>
          ))}
        </div>
      </div>
      {notice && (
        <p role="status" className="text-sm text-muted-foreground">
          {notice}
        </p>
      )}

      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
        {files.isPending ? (
          <div className={view === "grid" ? grid : "flex flex-col gap-2"}>
            {Array.from({ length: 12 }, (_, i) => (
              <Skeleton
                // biome-ignore lint/suspicious/noArrayIndexKey: a fixed list of placeholders.
                key={i}
                className={view === "grid" ? "aspect-square" : "h-14"}
              />
            ))}
          </div>
        ) : files.isError && rows.length === 0 ? (
          <ListError onRetry={() => files.refetch()} />
        ) : rows.length === 0 && files.hasNextPage ? null : rows.length ===
          0 ? (
          <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 text-center">
            <div className="grid size-20 place-items-center rounded-full bg-subtle text-muted-foreground [&>svg]:size-10">
              {search || kind !== "all" ? <PiMagnifyingGlass /> : <PiFile />}
            </div>
            <p className="text-lg font-semibold">
              {search || kind !== "all" ? "No results" : "No files yet"}
            </p>
            <p className="text-sm text-muted-foreground">
              {search || kind !== "all"
                ? "No file matches."
                : mayUpload
                  ? "Files you upload will show up here."
                  : "There is nothing to show yet."}
            </p>
          </div>
        ) : (
          <div className={view === "grid" ? grid : "flex flex-col gap-2"}>
            {rows.map((file) => (
              <FileItem
                key={file.id}
                view={view}
                file={file}
                picked={picker?.value.some(({ id }) => id === file.id)}
                onPick={picker && (() => toggle(file))}
                onDelete={
                  canOn(permissions, "file", "delete", file, user.id)
                    ? () => setDeleting(file)
                    : undefined
                }
                onNotice={say}
              />
            ))}
          </div>
        )}
        {files.hasNextPage && (
          <div
            ref={sentinel}
            role="status"
            className="grid h-12 place-items-center text-sm text-muted-foreground"
          >
            {files.isFetchingNextPage ? "Loading…" : ""}
          </div>
        )}
      </div>

      <UploadPanel uploads={uploads} />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null);
            destroy.reset();
          }
        }}
        title="Delete this file?"
        description={
          destroy.isError
            ? toApiError(destroy.error).message
            : `“${deleting?.name}” is deleted for good and cannot be brought back.`
        }
        confirmLabel={destroy.isPending ? "Deleting…" : "Delete"}
        onConfirm={() =>
          deleting &&
          destroy.mutate(deleting.id, {
            onSuccess: () => {
              // A deleted file cannot stay chosen.
              picker?.onChange(
                picker.value.filter(({ id }) => id !== deleting.id),
              );
              setDeleting(null);
            },
          })
        }
        pending={destroy.isPending}
        variant="danger"
      />
    </div>
  );
};
