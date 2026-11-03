export const formatBytes = (bytes: number) => {
  if (!bytes) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );

  return `${(bytes / 1024 ** exponent).toFixed(exponent ? 1 : 0)} ${units[exponent]}`;
};

// A filesystem adapter gives a path on the site ("/uploads/a.png"); a storage like S3 gives a full
// URL. The first is made absolute against the page, so a copied link works anywhere.
export const absoluteUrl = (url: string, base = window.location.origin) =>
  new URL(url, base).href;

export const isAbsoluteUrl = (url: string) => /^https?:\/\//i.test(url);

// What the files can be ordered by. The server sorts, so every option is a field and a direction.
export const sorts = [
  { value: "newest", label: "Newest first", sort: "createdAt", order: "desc" },
  { value: "oldest", label: "Oldest first", sort: "createdAt", order: "asc" },
  { value: "name-asc", label: "Name A–Z", sort: "name", order: "asc" },
  { value: "name-desc", label: "Name Z–A", sort: "name", order: "desc" },
  { value: "largest", label: "Largest first", sort: "size", order: "desc" },
  { value: "smallest", label: "Smallest first", sort: "size", order: "asc" },
] as const;

export type SortKey = (typeof sorts)[number]["value"];

export const kinds = [
  { value: "all", label: "All types" },
  { value: "image", label: "Images" },
  { value: "video", label: "Video" },
  { value: "audio", label: "Audio" },
  { value: "other", label: "Other" },
] as const;

export type Kind = (typeof kinds)[number]["value"];

// The server cannot filter files, so this runs on the ones already loaded.
export const matchesKind = (type: string, kind: Kind) => {
  if (kind === "all") return true;

  const group = ["image", "video", "audio"].find((name) =>
    type.startsWith(`${name}/`),
  );

  return (group ?? "other") === kind;
};

// The kinds a picker may be limited to; "all" is a filter choice, not a restriction.
export type Accept = Exclude<Kind, "all">;

// Without `accept` everything is allowed.
export const matchesAccept = (type: string, accept?: readonly Accept[]) =>
  !accept || accept.some((kind) => matchesKind(type, kind));

// For the upload dialog's `accept` attribute. "Other" has no mime pattern, so it lifts the limit.
export const acceptAttribute = (accept?: readonly Accept[]) =>
  !accept || accept.includes("other")
    ? undefined
    : accept.map((kind) => `${kind}/*`).join(",");

// The origin of the njin server: the page's own when njin serves the admin, the server named in
// VITE_API_URL while the admin runs on its own dev server.
const apiOrigin = () =>
  import.meta.env.DEV && import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL
    : window.location.origin;

// What an image is written into a text with: through the server's /img, which serves it resized and
// as webp. Absolute, since the text is read on the site and not only in the admin.
export const optimizedImageSrc = (url: string) =>
  `${apiOrigin()}/img?url=${encodeURIComponent(absoluteUrl(url, apiOrigin()))}`;
