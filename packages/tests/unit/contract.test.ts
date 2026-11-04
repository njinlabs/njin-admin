import { describe, expect, test } from "bun:test";
import { createRequire } from "node:module";
import pkg from "../../package.json";
import { contract, contractProblem } from "../../src/shared";

describe("contractProblem", () => {
  test("accepts a plugin built for this contract", () => {
    expect(contractProblem("reports", contract.version)).toBeNull();
  });

  test("refuses an older build and says to rebuild", () => {
    expect(contractProblem("reports", contract.version - 1)).toContain(
      "Rebuild it",
    );
  });

  test("refuses a newer build and says to update the admin", () => {
    const message = contractProblem("reports", contract.version + 1);

    expect(message).toContain('"reports"');
    expect(message).toContain("Update the admin");
  });

  test("refuses a plugin that declares nothing", () => {
    expect(contractProblem("reports", undefined)).toContain(
      "does not say which contract",
    );
  });
});

describe("the shared modules' majors", () => {
  const require = createRequire(import.meta.url);
  const major = (range: string) =>
    Number.parseInt(range.replace(/\D*/, ""), 10);

  test("equal the peer dependencies, so changing one means a new contract", () => {
    for (const [name, wanted] of Object.entries(contract.shared)) {
      const peer =
        pkg.peerDependencies[name as keyof typeof pkg.peerDependencies];

      expect(major(peer)).toBe(wanted);
    }
  });

  test("are the majors installed here", () => {
    for (const [name, wanted] of Object.entries(contract.shared)) {
      const { version } = require(`${name}/package.json`);

      expect(major(version)).toBe(wanted);
    }
  });
});
