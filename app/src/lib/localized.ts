// What is sent for a field with a value per language: the languages that have one. A language
// left empty is no translation, not an empty text.
export const withoutEmpty = (value: unknown) =>
  Object.fromEntries(
    Object.entries((value ?? {}) as Record<string, unknown>).filter(
      ([, entry]) => entry !== undefined && entry !== null && entry !== "",
    ),
  );
