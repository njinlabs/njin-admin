import {
  Button,
  DatePicker,
  Dialog,
  Input,
  type LoadRelated,
  MultiSelect,
  RelationInput,
  Select,
} from "@njinlabs/njin-admin/ui";
import { useState } from "react";
import { PiPlus, PiTrash } from "react-icons/pi";
import {
  type FilterField,
  type FilterRule,
  isFilled,
  newRule,
  operatorLabel,
  operatorsFor,
} from "../lib/filters";

const RuleValue = ({
  field,
  rule,
  locale,
  load,
  onChange,
}: {
  field: FilterField;
  rule: FilterRule;
  locale?: string;
  load: LoadRelated;
  onChange: (change: Partial<FilterRule>) => void;
}) => {
  const text = Array.isArray(rule.value) ? "" : rule.value;

  switch (field.type) {
    case "boolean":
      return (
        <Select
          options={[
            { value: "true", label: "Yes" },
            { value: "false", label: "No" },
          ]}
          value={text}
          onValueChange={(value) => onChange({ value: value ?? "true" })}
        />
      );
    case "select": {
      const options = (field.options ?? []).map((value) => ({
        value,
        label: value,
      }));

      return rule.op === "$in" ? (
        <MultiSelect
          options={options}
          value={Array.isArray(rule.value) ? rule.value : []}
          onValueChange={(value) => onChange({ value })}
          placeholder="Choose"
        />
      ) : (
        <Select
          options={options}
          value={text || null}
          onValueChange={(value) => onChange({ value: value ?? "" })}
          placeholder="Choose"
        />
      );
    }
    case "datepicker":
      return (
        <DatePicker
          value={text || null}
          onChange={(value) => onChange({ value: value ?? "" })}
        />
      );
    case "relation":
      return field.model ? (
        <RelationInput
          model={field.model}
          labelKey={field.labelKey}
          locale={locale}
          load={load}
          value={rule.picked ?? (text || null)}
          onChange={(picked) =>
            onChange({
              picked: picked ?? undefined,
              value:
                picked && typeof picked === "object"
                  ? String((picked as { id: unknown }).id)
                  : "",
            })
          }
        />
      ) : null;
    case "numeric":
      return (
        <Input
          type="number"
          aria-label="Value"
          value={text}
          onChange={(event) => onChange({ value: event.target.value })}
        />
      );
    default:
      return (
        <Input
          aria-label="Value"
          value={text}
          onChange={(event) => onChange({ value: event.target.value })}
        />
      );
  }
};

type FilterDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: FilterField[];
  // The rules in force; the dialog edits a copy and hands it back with Apply.
  rules: FilterRule[];
  onApply: (rules: FilterRule[]) => void;
  loadRelated: LoadRelated;
  locale?: string;
};

// The window that builds a filter: each row is a field, a question fitting its type, and a value.
export const FilterDialog = (props: FilterDialogProps) => {
  // The rules are copied in when the window opens, so Cancel drops what was changed in it.
  if (!props.open) return null;

  return <FilterEditor {...props} />;
};

let nextId = 1;

const FilterEditor = ({
  onOpenChange,
  fields,
  rules: applied,
  onApply,
  loadRelated,
  locale,
}: FilterDialogProps) => {
  const [rules, setRules] = useState(applied);
  const [first] = fields;

  const change = (id: number, next: Partial<FilterRule>) =>
    setRules(
      rules.map((rule) => (rule.id === id ? { ...rule, ...next } : rule)),
    );

  return (
    <Dialog
      open
      onOpenChange={onOpenChange}
      title="Filter"
      className="max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={() => setRules([])}>
            Clear
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onApply(rules.filter(isFilled));
              onOpenChange(false);
            }}
          >
            Apply
          </Button>
        </>
      }
    >
      <div className="min-h-0 space-y-3 overflow-y-auto">
        {rules.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No filter yet. Rules are all asked together.
          </p>
        )}
        {rules.map((rule) => {
          const field = fields.find(({ key }) => key === rule.field);

          if (!field) return null;

          return (
            <div
              key={rule.id}
              className="grid grid-cols-[1fr_auto] items-start gap-2 sm:grid-cols-[10rem_9rem_1fr_auto]"
            >
              <Select
                options={fields.map(({ key, label }) => ({
                  value: key,
                  label,
                }))}
                value={rule.field}
                onValueChange={(key) => {
                  const next = fields.find((item) => item.key === key);

                  // A different field asks different questions, so the rule starts again.
                  if (next && next.key !== rule.field) {
                    setRules(
                      rules.map((item) =>
                        item.id === rule.id ? newRule(rule.id, next) : item,
                      ),
                    );
                  }
                }}
              />
              <Button
                variant="danger-ghost"
                size="icon"
                aria-label="Remove rule"
                title="Remove rule"
                className="sm:order-last"
                onClick={() =>
                  setRules(rules.filter(({ id }) => id !== rule.id))
                }
              >
                <PiTrash />
              </Button>
              <Select
                options={operatorsFor(field.type).map((op) => ({
                  value: op,
                  label: operatorLabel(field.type, op),
                }))}
                value={rule.op}
                onValueChange={(op) => {
                  if (!op) return;

                  // A list of values and a single one do not carry over to each other.
                  const wasList = rule.op === "$in";
                  const isList = op === "$in";

                  change(rule.id, {
                    op: op as FilterRule["op"],
                    ...(wasList !== isList
                      ? { value: isList ? [] : "", picked: undefined }
                      : {}),
                  });
                }}
              />
              <div className="col-span-2 sm:col-span-1">
                <RuleValue
                  field={field}
                  rule={rule}
                  locale={locale}
                  load={loadRelated}
                  onChange={(next) => change(rule.id, next)}
                />
              </div>
            </div>
          );
        })}
        <Button
          variant="outline"
          size="icon"
          aria-label="Add rule"
          title="Add rule"
          disabled={!first}
          onClick={() =>
            first && setRules([...rules, newRule(nextId++, first)])
          }
        >
          <PiPlus />
        </Button>
      </div>
    </Dialog>
  );
};
