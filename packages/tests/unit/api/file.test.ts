import { expect, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import { uploadFile, uploadFileMutation } from "../../../src/sdk/api";
import { capture, runMutation } from "./capture";

test("uploadFile posts the file as multipart form data", async () => {
  const { client, sent } = capture({ data: { id: "f1", name: "a.txt" } });

  const row = await uploadFile(client, new File(["hi"], "a.txt"));

  expect(row.id).toBe("f1");
  expect(sent[0]).toMatchObject({ method: "post", url: "/api/file" });
  const body = sent[0]?.data as FormData;
  expect((body.get("file") as File).name).toBe("a.txt");
});

test("uploading refreshes the files", async () => {
  const queries = new QueryClient();
  const { client } = capture({ data: { id: "f1" } });
  queries.setQueryData(["model", "file", "list", undefined], 1);

  await runMutation(
    uploadFileMutation(client, queries),
    new File(["x"], "b.txt"),
  );

  expect(
    queries.getQueryState(["model", "file", "list", undefined])?.isInvalidated,
  ).toBe(true);
});
