import {
  type CatalogEntry,
  FULL_ACCESS,
  joinGrants,
  ruleKey,
  splitGrants,
} from "@njinlabs/njin-admin/sdk";
import {
  Badge,
  Checkbox,
  Field,
  FieldDescription,
  FieldLabel,
  Select,
  Switch,
} from "@njinlabs/njin-admin/ui";

const ORDER = ["read", "create", "update", "delete", "publish", "write"];

const scopes = [
  { value: "none", label: "-" },
  { value: "own", label: "Own" },
  { value: "all", label: "All" },
];

// The actions that head the columns: the usual ones in the usual order, then any other the
// catalog names.
const actionsOf = (catalog: readonly CatalogEntry[]) => {
  const named = new Set(catalog.flatMap((entry) => entry.actions));

  return [
    ...ORDER.filter((action) => named.has(action)),
    ...[...named].filter((action) => !ORDER.includes(action)),
  ];
};

const Remove = ({ grant, onClick }: { grant: string; onClick: () => void }) => (
  <button
    type="button"
    aria-label={`Remove ${grant}`}
    onClick={onClick}
    className="-mr-1 rounded-control p-0.5 outline-none hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-primary/50"
  >
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="m4 4 8 8M12 4l-8 8" />
    </svg>
  </button>
);

// What a group grants, drawn from the server's catalog: one cell per resource and action. The
// value is the grants themselves (a list of strings, as the server stores them); the cells are a
// view of it, and what no cell can show (wildcards like "post:*") is kept as a badge.
export const GrantsEditor = ({
  value,
  onChange,
  catalog,
}: {
  value: string[];
  onChange: (grants: string[]) => void;
  catalog: CatalogEntry[];
}) => {
  const { rules, rest } = splitGrants(value, catalog);
  const full = rest.includes(FULL_ACCESS);
  const others = rest.filter((grant) => grant !== FULL_ACCESS);
  const actions = actionsOf(catalog);

  const setRest = (next: string[]) =>
    onChange(joinGrants(rules, next, catalog));

  const setRule = (key: string, scope: string | null) => {
    const next = { ...rules };
    if (scope === "own" || scope === "all") next[key] = scope;
    else delete next[key];

    onChange(joinGrants(next, rest, catalog));
  };

  return (
    <div className="space-y-5">
      <Field orientation="horizontal" className="justify-between gap-4">
        <div className="space-y-1">
          <FieldLabel>Full access</FieldLabel>
          <FieldDescription>
            Every action on everything, including what is added later.
          </FieldDescription>
        </div>
        <Switch
          checked={full}
          onCheckedChange={(checked) =>
            setRest(
              checked
                ? [FULL_ACCESS, ...others]
                : rest.filter((grant) => grant !== FULL_ACCESS),
            )
          }
        />
      </Field>

      <div
        className={`overflow-x-auto rounded-control border ${full ? "opacity-50" : ""}`}
      >
        <table className="w-full text-left text-sm">
          <thead className="bg-subtle">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">
                Resource
              </th>
              {actions.map((action) => (
                <th key={action} scope="col" className="px-3 py-2 font-medium">
                  {action[0]?.toUpperCase()}
                  {action.slice(1)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {catalog.map((entry) => (
              <tr key={entry.resource} className="border-t">
                <th
                  scope="row"
                  className="px-3 py-2 font-mono text-xs font-normal whitespace-nowrap"
                >
                  {entry.resource}
                </th>
                {actions.map((action) => {
                  const key = ruleKey(entry.resource, action);
                  const label = `${entry.resource} ${action}`;

                  return (
                    <td key={action} className="px-3 py-2">
                      {!entry.actions.includes(action) ? (
                        <span className="text-muted-foreground/50">·</span>
                      ) : entry.scoped ? (
                        <Select
                          options={scopes}
                          value={rules[key] ?? "none"}
                          onValueChange={(scope) => setRule(key, scope)}
                          disabled={full}
                          className="h-8 w-20"
                        />
                      ) : (
                        <Checkbox
                          aria-label={label}
                          checked={rules[key] === "all"}
                          onCheckedChange={(checked) =>
                            setRule(key, checked ? "all" : null)
                          }
                          disabled={full}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted-foreground">
        Own: only the rows the user created. All: every row.
      </p>

      {others.length > 0 && (
        <Field>
          <FieldLabel>Other grants</FieldLabel>
          <FieldDescription>
            Wildcards, or grants this table has no cell for. They are kept when
            you save.
          </FieldDescription>
          <div className="flex flex-wrap gap-1.5">
            {others.map((grant) => (
              <Badge key={grant} className="font-mono">
                {grant}
                <Remove
                  grant={grant}
                  onClick={() => setRest(rest.filter((item) => item !== grant))}
                />
              </Badge>
            ))}
          </div>
        </Field>
      )}
    </div>
  );
};
