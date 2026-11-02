import { expect, test } from "bun:test";
import { getManifest } from "../../../src/sdk/api";
import { capture } from "./capture";

test("getManifest reads /api/admin/manifest", async () => {
  const manifest = {
    plugins: [
      { name: "reports", entry: "/p/index.js", styles: ["/p/index.css"] },
    ],
  };
  const { client, uri } = capture(manifest);

  expect(await getManifest(client)).toEqual(manifest);
  expect(uri()).toBe("/api/admin/manifest");
});
