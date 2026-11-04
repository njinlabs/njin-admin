import { can, type Permissions, readRecords } from "@njinlabs/njin-admin/sdk";

type Client = Parameters<typeof readRecords>[0];

// What a form hands `RenderForm` to search the records of a relation. A model the caller has no
// read on (not even "ref", the level that only fills a dropdown) has nothing to offer, so it is
// not asked: the server would answer 403.
export const relatedLoader =
  (client: Client, permissions: Permissions, locale?: string) =>
  (related: string, search: string) =>
    can(permissions, related, "read")
      ? readRecords(client, related, {
          search: search || undefined,
          limit: 20,
          locale,
        }).then((page) => page.data)
      : Promise.resolve([]);

// Files are chosen in the file manager, which lists them: without read on files there is no window.
export const mayPickFiles = (permissions: Permissions) =>
  !!can(permissions, "file", "read");
