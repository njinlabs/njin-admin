import { expect, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import { uploadFile, uploadFileMutation } from "../../../src/sdk/api";
import { capture, runMutation } from "./capture";

test("uploadFile posts the file as multipart form data and returns the record", async () => {
  // The server wraps the one record in an array.
  const { client, sent } = capture({ data: [{ id: "f1", name: "a.txt" }] });

  const row = await uploadFile(client, new File(["hi"], "a.txt"));

  expect(row.id).toBe("f1");
  expect(sent[0]).toMatchObject({ method: "post", url: "/api/file" });
  const body = sent[0]?.data as FormData;
  expect((body.get("file") as File).name).toBe("a.txt");
});

test("uploadFile reports progress as a percentage", async () => {
  const { client, sent } = capture({ data: [{ id: "f1" }] });
  const seen: number[] = [];

  await uploadFile(client, new File(["hi"], "a.txt"), (p) => seen.push(p));
  sent[0]?.onUploadProgress?.({
    loaded: 1,
    total: 4,
    bytes: 1,
    lengthComputable: true,
  });

  expect(seen).toEqual([25]);
});

test("uploading refreshes the files", async () => {
  const queries = new QueryClient();
  const { client } = capture({ data: [{ id: "f1" }] });
  queries.setQueryData(["model", "file", "list", undefined], 1);

  await runMutation(uploadFileMutation(client, queries), {
    file: new File(["x"], "b.txt"),
  });

  expect(
    queries.getQueryState(["model", "file", "list", undefined])?.isInvalidated,
  ).toBe(true);
});
