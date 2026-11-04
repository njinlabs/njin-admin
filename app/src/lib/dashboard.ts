// A person's dashboard is the list of widgets they chose, in the order they put them. It starts
// empty: nobody sees a tile they did not add. Kept per user in this browser; the server has
// nowhere to keep it yet.
type Keyed = { key: string };

const storageKey = (userId: string) => `njin-admin.dashboard.${userId}`;

export const readLayout = (userId: string): string[] => {
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(storageKey(userId)) ?? "[]",
    );

    return Array.isArray(parsed) && parsed.every((k) => typeof k === "string")
      ? parsed
      : [];
  } catch {
    return [];
  }
};

export const writeLayout = (userId: string, keys: string[]) => {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(keys));
  } catch {
    // Private mode or a full disk: the dashboard works, it just forgets.
  }
};

// `available` is what the user may see now (permissions already applied). A saved key that is no
// longer available (a plugin removed, a permission lost) is skipped, not forgotten, so it comes
// back with the access.
export const shownWidgets = <T extends Keyed>(
  keys: readonly string[],
  available: readonly T[],
): T[] => keys.flatMap((key) => available.find((w) => w.key === key) ?? []);

// What could still be added: available, and not on the dashboard.
export const addableWidgets = <T extends Keyed>(
  keys: readonly string[],
  available: readonly T[],
): T[] => available.filter((w) => !keys.includes(w.key));

// The keys on screen first (so a position on screen is a position in the list), then the ones
// that are saved but not available now, which an edit must not drop.
export const orderedKeys = (
  keys: readonly string[],
  available: readonly Keyed[],
): string[] => [
  ...shownWidgets(keys, available).map((w) => w.key),
  ...keys.filter((key) => !available.some((w) => w.key === key)),
];

export const moveKey = (keys: string[], from: number, to: number) => {
  if (from === to || from < 0 || to < 0 || from >= keys.length) return keys;

  const next = [...keys];
  const [moved] = next.splice(from, 1);
  next.splice(Math.min(to, next.length), 0, moved as string);

  return next;
};
