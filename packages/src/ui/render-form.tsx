import { createContext, type FC, type ReactNode, use } from "react";
import {
  type Control,
  Controller,
  type FieldValues,
  useWatch,
} from "react-hook-form";
import type { FieldProps } from "../sdk";
import type { FileRow } from "../sdk/api/file";
import type { Form } from "../sdk/schema";
import { Button } from "./button";
import { DatePicker } from "./date-picker";
import { Field, FieldError, FieldLabel } from "./field";
import { FileInput, type FilePicker } from "./file-input";
import { Input } from "./input";
import { NumberInput } from "./number-input";
import { type LoadRelated, RelationInput } from "./relation-input";
import { RichTextEditor } from "./rich-text-editor";
import { Select } from "./select";
import { Switch } from "./switch";

// What describes one input: a field of the list, or the element of an array (which has no key).
type Item = Omit<Form, "key">;

const withInput: readonly Form["type"][] = [
  "text",
  "email",
  "numeric",
  "boolean",
  "select",
  "datepicker",
  "relation",
  "multi_relation",
  "file",
  "multi_file",
  "richtext",
];

// Where the relation fields get their choices, and the language their labels are read in.
const RelationSource = createContext<{
  load?: LoadRelated;
  locale?: string;
}>({});

// The window the file fields (and the images of a text) choose their files in, and the address an
// image is written into a text with.
const FileSource = createContext<{
  picker?: FilePicker;
  imageSrc?: (file: FileRow) => string;
}>({});

// The renderers plugins registered, by "<plugin>:<renderer>", for the fields the server tagged
// with `plugin(...)`.
type Renderers = Record<string, FC<FieldProps>>;

const PluginSource = createContext<Renderers>({});

// A plugin's input, handed the whole form so it can follow another field. The form's values are
// read here and not in the field above, so only a field drawn by a plugin re-renders on every key.
const PluginInput = ({
  Renderer,
  control,
  ...props
}: Omit<FieldProps, "values"> & {
  Renderer: FC<FieldProps>;
  control: Control<FieldValues>;
}) => {
  const values = useWatch({ control }) as Record<string, unknown>;

  return <Renderer {...props} values={values} />;
};

// Whether `RenderForm` has an input for the field yet. A page that submits only what it draws
// uses this to leave the rest of a record as it is. A relation has one only when the form is
// given `loadRelated`, and a file only when it is given `filePicker`. An object or array counts only when all of
// what is inside it does, so no required part is left that nobody can fill.
export const hasInput = (item: Item): boolean => {
  if (item.type === "object") return !!item.members?.every(hasInput);
  if (item.type === "array") return !!item.element && hasInput(item.element);

  return withInput.includes(item.type);
};

// What a new array element starts as.
const emptyOf = (item: Item): unknown => {
  if (item.type === "boolean") return false;
  if (item.type === "array") return [];
  if (item.type === "object") {
    return Object.fromEntries(
      (item.members ?? []).map((member) => [member.key, emptyOf(member)]),
    );
  }

  return item.type === "text" || item.type === "email" ? "" : undefined;
};

// The array with the element at `index` exchanged with its neighbour (`by` is -1 or 1).
const swap = (values: unknown[], index: number, by: number) => {
  const moved = [...values];
  [moved[index], moved[index + by]] = [moved[index + by], moved[index]];

  return moved;
};

type FieldInputProps = {
  item: Item;
  // The dotted path of the value in the form: "title", "author.name", "tags.2".
  name: string;
  control: Control<FieldValues>;
  disabled?: boolean;
  // Shown at the end of the field's label line (an array element's remove button).
  action?: ReactNode;
};

const TrashIcon = () => (
  <svg
    viewBox="0 0 16 16"
    className="size-4"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    aria-hidden="true"
  >
    <path d="M2.5 4.5h11M6 4.5V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M4 4.5l.6 8a1 1 0 0 0 1 .9h4.8a1 1 0 0 0 1-.9l.6-8M6.5 7v4M9.5 7v4" />
  </svg>
);

const RemoveButton = ({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) => (
  <Button
    type="button"
    size="icon"
    variant="danger-ghost"
    aria-label="Remove"
    disabled={disabled}
    onClick={onClick}
    className="size-7"
  >
    <TrashIcon />
  </Button>
);

const LabelRow = ({
  label,
  action,
  required,
}: {
  label: string;
  action?: ReactNode;
  required?: boolean;
}) => {
  const text = (
    <FieldLabel>
      {label}
      {required && (
        <span className="ml-0.5 text-danger" aria-hidden="true">
          *
        </span>
      )}
    </FieldLabel>
  );

  return action ? (
    <div className="flex items-center justify-between gap-2">
      {text}
      {action}
    </div>
  ) : (
    text
  );
};

// A switch always has a value and a box of fields or a list can be empty, so only an input that
// can be left blank carries the mark.
const marksRequired = (item: Item) =>
  !!item.required &&
  !["boolean", "object", "array", "multi_relation", "multi_file"].includes(
    item.type,
  );

const Chevron = ({ up }: { up?: boolean }) => (
  <svg
    viewBox="0 0 16 16"
    className="size-4"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    aria-hidden="true"
  >
    <path d={up ? "m4 10 4-4 4 4" : "m4 6 4 4 4-4"} />
  </svg>
);

const MoveButton = ({
  up,
  onClick,
  disabled,
}: {
  up?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <Button
    type="button"
    size="icon"
    variant="ghost"
    aria-label={up ? "Move up" : "Move down"}
    disabled={disabled}
    onClick={onClick}
    className="size-7"
  >
    <Chevron up={up} />
  </Button>
);

// On the top border of a box, where its legend is, so the box needs no line of its own.
const FieldsetAction = ({ children }: { children: ReactNode }) => (
  <div className="absolute top-0 right-2 -translate-y-1/2 bg-background">
    {children}
  </div>
);

const RelationField = ({
  item,
  value,
  onChange,
  disabled,
}: {
  item: Item;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}) => {
  const { load, locale } = use(RelationSource);

  if (!load || !item.model) {
    return (
      <p className="text-sm text-muted-foreground">
        Needs a source of related records.
      </p>
    );
  }

  return (
    <RelationInput
      model={item.model}
      labelKey={item.labelKey}
      locale={locale}
      load={load}
      value={value}
      onChange={onChange}
      multiple={item.type === "multi_relation"}
      disabled={disabled}
    />
  );
};

const FileField = (props: {
  multiple: boolean;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}) => {
  const { picker: Picker } = use(FileSource);

  if (!Picker) {
    return (
      <p className="text-sm text-muted-foreground">
        Needs a window to choose files in.
      </p>
    );
  }

  return <FileInput Picker={Picker} {...props} />;
};

const RichText = ({
  value,
  onChange,
}: {
  value: string | null | undefined;
  onChange: (html: string) => void;
}) => {
  const { picker, imageSrc } = use(FileSource);

  return (
    <RichTextEditor
      value={value}
      onChange={onChange}
      Picker={picker}
      imageSrc={imageSrc}
    />
  );
};

const FieldInput = ({
  item,
  name,
  control,
  disabled,
  action,
}: FieldInputProps) => {
  const renderers = use(PluginSource);
  const Renderer = item.plugin && renderers[item.plugin.name];
  const required = marksRequired(item);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const invalid = fieldState.invalid;
        const error = <FieldError errors={[fieldState.error]} />;

        if (Renderer) {
          return (
            <Field invalid={invalid} disabled={disabled}>
              <LabelRow
                label={item.label}
                action={action}
                required={required}
              />
              <PluginInput
                Renderer={Renderer}
                control={control}
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                disabled={disabled}
                invalid={invalid}
                field={item}
                options={item.plugin?.options}
              />
              {error}
            </Field>
          );
        }

        switch (item.type) {
          case "text":
          case "email":
            return (
              <Field invalid={invalid} disabled={disabled}>
                <LabelRow
                  label={item.label}
                  action={action}
                  required={required}
                />
                <Input
                  name={field.name}
                  ref={field.ref}
                  onBlur={field.onBlur}
                  type={item.type}
                  value={field.value ?? ""}
                  onChange={(event) => field.onChange(event.target.value)}
                />
                {error}
              </Field>
            );
          case "numeric":
            return (
              <Field invalid={invalid} disabled={disabled}>
                <LabelRow
                  label={item.label}
                  action={action}
                  required={required}
                />
                <NumberInput
                  value={field.value}
                  onValueChange={field.onChange}
                  invalid={invalid}
                  disabled={disabled}
                />
                {error}
              </Field>
            );
          case "boolean":
            return (
              <Field invalid={invalid} disabled={disabled}>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={Boolean(field.value)}
                    onCheckedChange={field.onChange}
                  />
                  <FieldLabel>{item.label}</FieldLabel>
                  {action && <div className="ml-auto">{action}</div>}
                </div>
                {error}
              </Field>
            );
          case "select":
            return (
              <Field invalid={invalid} disabled={disabled}>
                <LabelRow
                  label={item.label}
                  action={action}
                  required={required}
                />
                <Select
                  options={Object.values(item.options ?? {}).map((value) => ({
                    value: String(value),
                    label: String(value),
                  }))}
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={disabled}
                />
                {error}
              </Field>
            );
          case "datepicker":
            return (
              <Field invalid={invalid} disabled={disabled}>
                <LabelRow
                  label={item.label}
                  action={action}
                  required={required}
                />
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  disabled={disabled}
                />
                {error}
              </Field>
            );
          case "relation":
          case "multi_relation":
            return (
              <Field invalid={invalid} disabled={disabled}>
                <LabelRow
                  label={item.label}
                  action={action}
                  required={required}
                />
                <RelationField
                  item={item}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={disabled}
                />
                {error}
              </Field>
            );
          case "file":
          case "multi_file":
            return (
              <Field invalid={invalid} disabled={disabled}>
                <LabelRow
                  label={item.label}
                  action={action}
                  required={required}
                />
                <FileField
                  multiple={item.type === "multi_file"}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={disabled}
                />
                {error}
              </Field>
            );
          case "richtext":
            return (
              <Field invalid={invalid} disabled={disabled}>
                <LabelRow
                  label={item.label}
                  action={action}
                  required={required}
                />
                <RichText value={field.value} onChange={field.onChange} />
                {error}
              </Field>
            );
          case "object":
            return (
              <fieldset className="relative space-y-4 rounded-control border p-4">
                {action && <FieldsetAction>{action}</FieldsetAction>}
                <legend className="px-1 text-sm font-medium">
                  {item.label}
                </legend>
                <Fields
                  items={item.members ?? []}
                  prefix={name}
                  control={control}
                  disabled={disabled}
                />
                {error}
              </fieldset>
            );
          case "array": {
            const element = item.element;
            const values: unknown[] = Array.isArray(field.value)
              ? field.value
              : [];

            if (!element) return <></>;

            const atMin =
              item.minItems != null && values.length <= item.minItems;
            const atMax =
              item.maxItems != null && values.length >= item.maxItems;

            // The elements are rendered from the array in the form, by position, so removing one
            // in the middle shows the rest as they are.
            return (
              <fieldset className="relative space-y-3 rounded-control border p-4">
                {action && <FieldsetAction>{action}</FieldsetAction>}
                <legend className="px-1 text-sm font-medium">
                  {item.label}
                </legend>
                {values.map((_, index) => (
                  <FieldInput
                    // biome-ignore lint/suspicious/noArrayIndexKey: the elements have no id of their own
                    key={index}
                    item={{
                      ...element,
                      label: `${element.label} ${index + 1}`,
                    }}
                    name={`${name}.${index}`}
                    control={control}
                    disabled={disabled}
                    action={
                      <span className="flex items-center">
                        <MoveButton
                          up
                          disabled={disabled || index === 0}
                          onClick={() =>
                            field.onChange(swap(values, index, -1))
                          }
                        />
                        <MoveButton
                          disabled={disabled || index === values.length - 1}
                          onClick={() => field.onChange(swap(values, index, 1))}
                        />
                        <RemoveButton
                          disabled={disabled || atMin}
                          onClick={() =>
                            field.onChange(
                              values.filter((_, at) => at !== index),
                            )
                          }
                        />
                      </span>
                    }
                  />
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={disabled || atMax}
                  title={atMax ? `At most ${item.maxItems}` : undefined}
                  onClick={() => field.onChange([...values, emptyOf(element)])}
                >
                  Add
                </Button>
                {error}
              </fieldset>
            );
          }
          default:
            return (
              <Field>
                <FieldLabel>{item.label}</FieldLabel>
                <p className="text-sm text-muted-foreground">
                  No input for “{item.type}” yet.
                </p>
              </Field>
            );
        }
      }}
    />
  );
};

// Fields that need the whole width: a text editor, a box of fields, a list, a row of chips or
// thumbnails. The rest sit two to a row.
export const isWideField = (item: Pick<Form, "type">) =>
  ["richtext", "object", "array", "multi_relation", "multi_file"].includes(
    item.type,
  );

const Fields = ({
  items,
  prefix,
  locale,
  control,
  disabled,
}: {
  items: readonly Form[];
  prefix?: string;
  // The language shown for the fields that have one value per language.
  locale?: string;
  control: Control<FieldValues>;
  disabled?: boolean;
}) => (
  // The columns follow the width of this box, not the screen's: a form beside a menu, or inside
  // another box of fields, has less room than the window says.
  <div className="@container">
    <div className="grid grid-cols-1 items-start gap-5 @xl:grid-cols-2">
      {items.map((item) => {
        const path = prefix ? `${prefix}.${item.key}` : item.key;
        const span = isWideField(item) ? "min-w-0 @xl:col-span-2" : "min-w-0";

        if (item.localized && !locale) {
          return (
            <div key={item.key} className={span}>
              <Field>
                <FieldLabel>{item.label}</FieldLabel>
                <p className="text-sm text-muted-foreground">
                  Needs a language to edit.
                </p>
              </Field>
            </div>
          );
        }

        return (
          // A language is a different value, so it starts a fresh input.
          <div
            key={item.localized ? `${item.key}.${locale}` : item.key}
            className={span}
          >
            <FieldInput
              item={item}
              name={item.localized ? `${path}.${locale}` : path}
              control={control}
              disabled={disabled}
            />
          </div>
        );
      })}
    </div>
  </div>
);

type RenderFormProps<T extends FieldValues> = {
  // The field list of a model or settings group (`ModelSchema.form`).
  form: readonly Form[];
  // From `useForm`, whose resolver is the same schema the list was read from.
  control: Control<T>;
  // The language whose values are shown; the form keeps the others while it is switched.
  locale?: string;
  // Asks for the records a relation field can link to; without it those fields cannot be filled.
  loadRelated?: LoadRelated;
  // The window to choose files in; without it the file fields cannot be filled.
  filePicker?: FilePicker;
  // The address an image is written into a text with (an optimized one); the file's own url if
  // not given.
  imageSrc?: (file: FileRow) => string;
  // The inputs plugins draw fields with, by "<plugin>:<renderer>"; a field naming one that is not
  // here is drawn as its base type.
  renderers?: Renderers;
  disabled?: boolean;
};

// The glue between the schema's field list and the kit: each field type picks its input. Types
// that have no input yet say so rather than disappearing, so a missing field is not mistaken
// for an empty one.
export const RenderForm = <T extends FieldValues>({
  form,
  control,
  locale,
  loadRelated,
  filePicker,
  imageSrc,
  renderers,
  disabled,
}: RenderFormProps<T>) => (
  <FileSource value={{ picker: filePicker, imageSrc }}>
    <RelationSource value={{ load: loadRelated, locale }}>
      <PluginSource value={renderers ?? {}}>
        {/* The paths come from the schema the values were typed from, but only at runtime. */}
        <Fields
          items={form}
          locale={locale}
          control={control as unknown as Control<FieldValues>}
          disabled={disabled}
        />
      </PluginSource>
    </RelationSource>
  </FileSource>
);
