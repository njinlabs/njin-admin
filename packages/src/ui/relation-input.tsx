import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Combobox } from "./combobox";
import { MultiCombobox } from "./multi-combobox";
import type { SelectOption } from "./select";

// A record of the model a relation points at, as the server returns it.
export type Related = { id: string } & Record<string, unknown>;

// Asks for the records of `model` that match what was typed (nothing typed: the first ones).
export type LoadRelated = (model: string, search: string) => Promise<Related[]>;

const idOf = (value: unknown) =>
  typeof value === "object" && value !== null
    ? String((value as { id?: unknown }).id ?? "")
    : String(value);

// A label that has a value per language is read in `locale`, or in the first language that has one.
const textOf = (value: unknown, locale?: string): string | undefined => {
  if (typeof value === "string") return value || undefined;
  if (typeof value !== "object" || value === null) return undefined;

  const map = value as Record<string, unknown>;

  return (
    textOf(locale ? map[locale] : undefined) ??
    Object.values(map)
      .map((entry) => textOf(entry))
      .find(Boolean)
  );
};

// What a record is called in the list: its `labelKey`, or else its first text.
const labelOf = (value: unknown, labelKey?: string, locale?: string) => {
  if (typeof value !== "object" || value === null) return String(value);

  const record = value as Record<string, unknown>;
  const label =
    labelKey !== undefined
      ? textOf(record[labelKey], locale)
      : Object.entries(record)
          .filter(([key]) => key !== "id")
          .map(([, entry]) => textOf(entry, locale))
          .find(Boolean);

  return label ?? idOf(record);
};

const toOption = (
  value: unknown,
  labelKey?: string,
  locale?: string,
): SelectOption => ({
  value: idOf(value),
  label: labelOf(value, labelKey, locale),
});

type RelationInputProps = {
  model: string;
  labelKey?: string;
  // The language the labels are read in, for a model that has one.
  locale?: string;
  load: LoadRelated;
  // A record, or just its id, as the form holds it; `multiple` takes a list of them.
  value: unknown;
  onChange: (value: unknown) => void;
  multiple?: boolean;
  disabled?: boolean;
};

// Picks the record(s) a relation links to. The form keeps the record picked (its id and what
// names it), which the schema reduces to the id when it is checked.
export const RelationInput = ({
  model,
  labelKey,
  locale,
  load,
  value,
  onChange,
  multiple,
  disabled,
}: RelationInputProps) => {
  const [search, setSearch] = useState("");
  const [typed, setTyped] = useState("");

  // Waits for a pause in typing so each key is not a request.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(typed.trim()), 250);

    return () => clearTimeout(timer);
  }, [typed]);

  const found = useQuery({
    queryKey: ["related", model, search, locale],
    queryFn: () => load(model, search),
    placeholderData: keepPreviousData,
  });

  const chosen = multiple
    ? Array.isArray(value)
      ? value
      : []
    : value
      ? [value]
      : [];
  const records = new Map<string, unknown>(
    [...(found.data ?? []), ...chosen].map((record) => [idOf(record), record]),
  );
  const options = (found.data ?? []).map((record) =>
    toOption(record, labelKey, locale),
  );
  const pick = (option: SelectOption) => records.get(option.value);
  const shared = {
    options,
    onSearch: setTyped,
    loading: found.isFetching,
    disabled,
  };

  if (multiple) {
    return (
      <MultiCombobox
        {...shared}
        value={chosen.map((record) => toOption(record, labelKey, locale))}
        onValueChange={(picked) => onChange(picked.map(pick))}
      />
    );
  }

  return (
    <Combobox
      {...shared}
      value={chosen[0] ? toOption(chosen[0], labelKey, locale) : null}
      onValueChange={(picked) => onChange(picked ? pick(picked) : null)}
    />
  );
};
