import { describe, expect, test } from "bun:test";
import axios, { AxiosError } from "axios";
import { getManifest, toApiError } from "../../../src/sdk/api";
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

const failing = (status: number, data: unknown) =>
  axios.create({
    adapter: async (config) => {
      throw new AxiosError("failed", "ERR_BAD_REQUEST", config, null, {
        status,
        data,
        statusText: "",
        headers: {},
        config,
      });
    },
  });

const caught = async (client: ReturnType<typeof failing>) => {
  try {
    await client.get("/x");
  } catch (error) {
    return toApiError(error);
  }
  throw new Error("should have failed");
};

describe("toApiError", () => {
  test("reads the message of a plain error", async () => {
    expect(await caught(failing(404, { message: "Not Found" }))).toEqual({
      status: 404,
      message: "Not Found",
      fields: {},
      details: [],
    });
  });

  test("keeps errors that are plain sentences apart from the fields", async () => {
    const error = await caught(
      failing(422, {
        message: "Some grants are not valid",
        errors: ['"ghost:read": unknown resource "ghost"'],
      }),
    );

    expect(error.details).toEqual(['"ghost:read": unknown resource "ghost"']);
    expect(error.fields).toEqual({});
  });

  test("maps validation errors to the field they belong to", async () => {
    const error = await caught(
      failing(422, {
        message: "Validation error",
        errors: [
          { path: "title", message: "Too small" },
          { path: "title", message: "Second message" },
          { path: "seo.t", message: "Required" },
        ],
      }),
    );

    expect(error.message).toBe("Validation error");
    expect(error.fields).toEqual({ title: "Too small", "seo.t": "Required" });
  });

  test("maps a unique violation to its field", async () => {
    const error = await caught(
      failing(409, { message: "email must be unique", field: "email" }),
    );

    expect(error.status).toBe(409);
    expect(error.fields).toEqual({ email: "email must be unique" });
  });

  test("says so when the server cannot be reached", async () => {
    const client = axios.create({
      adapter: async (config) => {
        throw new AxiosError("Network Error", "ERR_NETWORK", config);
      },
    });

    expect((await caught(client as never)).message).toBe(
      "Could not reach the server",
    );
  });

  test("takes the message of anything else that was thrown", () => {
    expect(toApiError(new Error("boom")).message).toBe("boom");
    expect(toApiError("x").message).toBe("Something went wrong");
  });
});
