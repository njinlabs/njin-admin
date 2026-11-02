import type { CatalogEntry } from "./permissions";

export type GrantScope = "own" | "all";

// The grants a form can show as one cell each, keyed "<resource>:<action>". A grant is a cell
// when it names one resource and one action of the catalog; the rest (wildcards like "post:*" or
// "*:read", and anything the catalog does not know) cannot be drawn in a cell and travels
// untouched in `rest`, so saving a group never loses what the form could not show.
export type GrantRules = Record<string, GrantScope>;

export const FULL_ACCESS = "*:*:all";

export const ruleKey = (resource: string, action: string) =>
  `${resource}:${action}`;

export const splitGrants = (
  grants: readonly string[],
  catalog: readonly CatalogEntry[],
): { rules: GrantRules; rest: string[] } => {
  const byResource = new Map(catalog.map((entry) => [entry.resource, entry]));
  const rules: GrantRules = {};
  const rest: string[] = [];

  for (const raw of grants) {
    const [resource, action, scope = "all", ...extra] = raw.split(":");
    const entry = byResource.get(resource ?? "");

    if (
      !resource ||
      !action ||
      extra.length > 0 ||
      !entry ||
      !entry.actions.includes(action) ||
      (scope !== "all" && (scope !== "own" || !entry.scoped))
    ) {
      if (!rest.includes(raw)) rest.push(raw);
      continue;
    }

    // Grants only add up, so "all" beats "own" for the same cell.
    const key = ruleKey(resource, action);
    if (rules[key] !== "all") rules[key] = scope;
  }

  return { rules, rest };
};

// The grants to send. "all" is the default scope, so it is written without one ("post:read",
// "post:read:own"). Cells come first in catalog order, then the untouched rest.
export const joinGrants = (
  rules: GrantRules,
  rest: readonly string[],
  catalog: readonly CatalogEntry[],
): string[] => [
  ...catalog.flatMap(({ resource, actions }) =>
    actions.flatMap((action) => {
      const scope = rules[ruleKey(resource, action)];

      if (!scope) return [];
      return [
        scope === "own"
          ? `${resource}:${action}:own`
          : ruleKey(resource, action),
      ];
    }),
  ),
  ...rest,
];

// Whether the grants include the one that lets the holder do everything.
export const hasFullAccess = (grants: readonly string[]) =>
  grants.includes(FULL_ACCESS);
