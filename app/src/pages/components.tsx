import {
  Badge,
  Button,
  Calendar,
  Checkbox,
  ConfirmDialog,
  DatePicker,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  Input,
  MultiSelect,
  Select,
  Skeleton,
  Switch,
} from "@njinlabs/njin-admin/ui";
import { type ReactNode, useState } from "react";

const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

const statuses = [
  { value: "draft", label: "Draft" },
  { value: "review", label: "In review" },
  { value: "live", label: "Published" },
];

const Section = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <section className="space-y-3">
    <h2 className="text-sm font-semibold text-muted-foreground uppercase">
      {title}
    </h2>
    <div className="rounded-control border bg-background p-4">{children}</div>
  </section>
);

// A page to look at the kit, not part of the product: every component in its states.
export const ComponentsPage = () => {
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<string | null>("review");
  const [empty, setEmpty] = useState<string | null>(null);
  const [published, setPublished] = useState(true);
  const [invalidOn, setInvalidOn] = useState(false);
  const [date, setDate] = useState<string | undefined>();
  const [confirming, setConfirming] = useState(false);
  const [agreed, setAgreed] = useState(true);
  const [chosen, setChosen] = useState<string[]>(["draft"]);

  return (
    <div className="max-w-3xl space-y-8">
      <Section title="Primary scale (#186049 is 700)">
        <div className="grid grid-cols-11 gap-1">
          {steps.map((step) => (
            <div key={step} className="space-y-1 text-center text-xs">
              <div
                className="h-10 rounded-control"
                style={{ background: `var(--color-primary-${step})` }}
              />
              {step}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Button">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button>Default</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="danger-ghost">Danger ghost</Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm">Small</Button>
            <Button>Default</Button>
            <Button size="icon" variant="outline" aria-label="Add">
              +
            </Button>
          </div>
        </div>
      </Section>

      <Section title="Field and Input">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>Title</FieldLabel>
            <Input
              placeholder="Type something"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            <FieldDescription>With a description under it.</FieldDescription>
          </Field>
          <Field disabled>
            <FieldLabel>Disabled</FieldLabel>
            <Input defaultValue="Cannot edit" />
          </Field>
          <Field invalid>
            <FieldLabel>Invalid</FieldLabel>
            <Input defaultValue="wrong" />
            <FieldError
              errors={[{ message: "Must be at least 8 characters" }]}
            />
          </Field>
        </div>
      </Section>

      <Section title="ConfirmDialog">
        <Button variant="danger" onClick={() => setConfirming(true)}>
          Delete something
        </Button>
        <ConfirmDialog
          open={confirming}
          onOpenChange={setConfirming}
          title="Delete this?"
          description="This cannot be undone."
          confirmLabel="Delete"
          variant="danger"
          onConfirm={() => setConfirming(false)}
        />
      </Section>

      <Section title="Skeleton">
        <div className="space-y-2">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="size-10 rounded-full" />
        </div>
      </Section>

      <Section title="Switch">
        <div className="space-y-3">
          <Field orientation="horizontal">
            <Switch checked={published} onCheckedChange={setPublished} />
            <FieldLabel>Published ({String(published)})</FieldLabel>
          </Field>
          <Field orientation="horizontal" invalid={invalidOn}>
            <Switch checked={invalidOn} onCheckedChange={setInvalidOn} />
            <FieldLabel>Turns the field invalid</FieldLabel>
          </Field>
          <Field orientation="horizontal" disabled>
            <Switch />
            <FieldLabel>Disabled</FieldLabel>
          </Field>
        </div>
      </Section>

      <Section title="Badge">
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="primary">Primary</Badge>
          <Badge variant="danger">Danger</Badge>
        </div>
      </Section>

      <Section title="Checkbox">
        <div className="space-y-3">
          <Field orientation="horizontal">
            <Checkbox checked={agreed} onCheckedChange={setAgreed} />
            <FieldLabel>Agreed ({String(agreed)})</FieldLabel>
          </Field>
          <Field orientation="horizontal" disabled>
            <Checkbox />
            <FieldLabel>Disabled</FieldLabel>
          </Field>
        </div>
      </Section>

      <Section title="MultiSelect">
        <Field className="max-w-sm">
          <FieldLabel>Statuses ({chosen.join(", ") || "none"})</FieldLabel>
          <MultiSelect
            options={statuses}
            value={chosen}
            onValueChange={setChosen}
            placeholder="Pick some"
          />
        </Field>
      </Section>

      <Section title="Select">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>Status ({status ?? "none"})</FieldLabel>
            <Select
              options={statuses}
              value={status}
              onValueChange={setStatus}
            />
          </Field>
          <Field>
            <FieldLabel>Empty, with placeholder</FieldLabel>
            <Select
              options={statuses}
              value={empty}
              onValueChange={setEmpty}
              placeholder="Pick one"
            />
          </Field>
          <Field invalid>
            <FieldLabel>Invalid</FieldLabel>
            <Select
              options={statuses}
              value={null}
              onValueChange={() => {}}
              placeholder="Pick one"
            />
            <FieldError errors={[{ message: "Required" }]} />
          </Field>
          <Field disabled>
            <FieldLabel>Disabled</FieldLabel>
            <Select
              options={statuses}
              value="live"
              onValueChange={() => {}}
              disabled
            />
          </Field>
        </div>
      </Section>

      <Section title="DatePicker and Calendar">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>Date ({date ?? "none"})</FieldLabel>
            <DatePicker value={date} onChange={setDate} />
          </Field>
          <Field disabled>
            <FieldLabel>Disabled</FieldLabel>
            <DatePicker value={undefined} onChange={() => {}} disabled />
          </Field>
          <div className="rounded-control border">
            <Calendar mode="single" selected={new Date()} />
          </div>
        </div>
      </Section>
    </div>
  );
};
