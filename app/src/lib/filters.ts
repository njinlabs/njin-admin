import type { Form, ReadQuery } from "@njinlabs/njin-admin/sdk";

export type FilterOperator =
  | "$eq"
  | "$ne"
  | "$gt"
  | "$gte"
  | "$lt"
  | "$lte"
  | "$contains"
  | "$startsWith"
  | "$in";

// A field the list can be filtered by. `status` and `createdAt` are not in the model's form but
// are on every (draftable) record, so the page adds them next to the form's own.
export type FilterField = {
  key: string;
  label: string;
  type: Extract<
    Form["type"],
    | "text"
    | "email"
    | "numeric"
    | "datepicker"
    | "select"
    | "boolean"
    | "relation"
  >;
  // The choices of a `select`.
  options?: string[];
  // The related model of a `relation`.
  model?: string;
  labelKey?: string;
};

export type FilterRule = {
  // Only for React's key: a rule has no identity of its own.
  id: number;
  field: string;
  op: FilterOperator;
  // A text, the id of a relation, a list of them for $in; empty until the person fills it.
  value: string | string[];
  // The record a relation was picked as, so its label can be shown; `value` is its id.
  picked?: unknown;
};

export const operatorLabels: Record<FilterOperator, string> = {
  $eq: "is",
  $ne: "is not",
  $gt: "is greater than",
  $gte: "is at least",
  $lt: "is less than",
  $lte: "is at most",
  $contains: "contains",
  $startsWith: "starts with",
  $in: "is any of",
};

const dateLabels: Partial<Record<FilterOperator, string>> = {
  $gt: "is after",
  $gte: "is on or after",
  $lt: "is before",
  $lte: "is on or before",
};

export const operatorLabel = (type: FilterField["type"], op: FilterOperator) =>
  (type === "datepicker" ? dateLabels[op] : undefined) ?? operatorLabels[op];

// What can be asked of a field, by what it holds. A date is never equal to another down to the
// millisecond, so it is only compared.
export const operatorsFor = (type: FilterField["type"]): FilterOperator[] => {
  switch (type) {
    case "numeric":
      return ["$eq", "$ne", "$gt", "$gte", "$lt", "$lte"];
    case "datepicker":
      return ["$gte", "$lte", "$gt", "$lt"];
    case "select":
      return ["$eq", "$ne", "$in"];
    case "boolean":
    case "relation":
      return ["$eq", "$ne"];
    default:
      return ["$contains", "$startsWith", "$eq", "$ne"];
  }
};

export const isFilled = ({ value }: FilterRule) =>
  Array.isArray(value) ? value.length > 0 : value !== "";

// A new rule on `field`, asking its first question; a boolean starts as "yes" since it has no
// empty state.
export const newRule = (id: number, field: FilterField): FilterRule => ({
  id,
  field: field.key,
  op: operatorsFor(field.type)[0] as FilterOperator,
  value: field.type === "boolean" ? "true" : "",
});

// The `filters` of a read. Rules on one field become one object of operators; a rule with no
// value yet is left out rather than asking for "equal to nothing".
export const toFilters = (rules: FilterRule[]): ReadQuery["filters"] => {
  const filters: Record<string, Partial<Record<FilterOperator, string>>> = {};

  for (const rule of rules.filter(isFilled)) {
    filters[rule.field] = {
      ...filters[rule.field],
      [rule.op]: Array.isArray(rule.value) ? rule.value.join(",") : rule.value,
    };
  }

  return filters;
};
