import { describe, expect, test } from "bun:test";
import {
  type FilterField,
  isFilled,
  newRule,
  operatorLabel,
  operatorsFor,
  toFilters,
} from "../../src/lib/filters";

const rule = (
  id: number,
  field: string,
  op: "$eq" | "$gte" | "$lte" | "$in" | "$contains",
  value: string | string[],
) => ({ id, field, op, value });

describe("operatorsFor", () => {
  test("fits the question to what the field holds", () => {
    expect(operatorsFor("text")).toEqual([
      "$contains",
      "$startsWith",
      "$eq",
      "$ne",
    ]);
    expect(operatorsFor("numeric")).toContain("$gt");
    expect(operatorsFor("select")).toContain("$in");
    expect(operatorsFor("boolean")).toEqual(["$eq", "$ne"]);
  });

  test("only compares a date", () => {
    expect(operatorsFor("datepicker")).not.toContain("$eq");
    expect(operatorLabel("datepicker", "$gte")).toBe("is on or after");
    expect(operatorLabel("numeric", "$gte")).toBe("is at least");
  });
});

describe("newRule", () => {
  const field = (type: FilterField["type"]): FilterField => ({
    key: "f",
    label: "F",
    type,
  });

  test("asks the first question of the field, with nothing filled in", () => {
    expect(newRule(1, field("text"))).toEqual({
      id: 1,
      field: "f",
      op: "$contains",
      value: "",
    });
  });

  test("starts a boolean as yes, since it has no empty state", () => {
    expect(newRule(1, field("boolean")).value).toBe("true");
  });
});

describe("toFilters", () => {
  test("is one object of operators per field", () => {
    expect(
      toFilters([
        rule(1, "views", "$gte", "10"),
        rule(2, "views", "$lte", "50"),
        rule(3, "title", "$contains", "hi"),
      ]),
    ).toEqual({
      views: { $gte: "10", $lte: "50" },
      title: { $contains: "hi" },
    });
  });

  test("joins the values of $in with commas", () => {
    expect(toFilters([rule(1, "status", "$in", ["draft", "changed"])])).toEqual(
      { status: { $in: "draft,changed" } },
    );
  });

  test("leaves out a rule with no value yet", () => {
    expect(isFilled(rule(1, "a", "$eq", ""))).toBe(false);
    expect(isFilled(rule(1, "a", "$in", []))).toBe(false);
    expect(
      toFilters([rule(1, "a", "$eq", ""), rule(2, "b", "$in", [])]),
    ).toEqual({});
  });
});
