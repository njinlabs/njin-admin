import { type NavEntry, type Row, schemaQuery } from "@njinlabs/njin-admin/sdk";
import { Button, Skeleton } from "@njinlabs/njin-admin/ui";
import { useQuery } from "@tanstack/react-query";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { PiList, PiX } from "react-icons/pi";
import { client } from "../lib/client";
import { navs, schemaNavs } from "../lib/registry";
import { UserMenu } from "./user-menu";

type Section = {
  title: string | null;
  entries: NavEntry[];
  // The schema decides Content and Settings, so those can still be loading or have failed.
  status?: "pending" | "error";
};

// The title of the page is the label of the menu entry that owns the path; the longest match
// wins so "/reports/42" still reads "Reports".
const useTitle = (sections: Section[]) => {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const path = pathname.replace(/^\/_admin/, "") || "/";

  return sections
    .flatMap(({ entries }) => entries)
    .filter(({ to }) => (to === "/" ? path === "/" : path.startsWith(to)))
    .sort((a, b) => b.to.length - a.to.length)[0]?.label;
};

const NavItem = ({
  icon: Icon,
  label,
  to,
  onNavigate,
}: NavEntry & { onNavigate: () => void }) => (
  <Link
    // Plugin and model paths only exist at runtime, so `to` cannot be type-checked.
    to={to as string}
    onClick={onNavigate}
    activeOptions={{ exact: to === "/" }}
    className="flex items-center gap-3 rounded-control border border-transparent px-3 py-2 text-muted-foreground hover:bg-subtle hover:text-foreground [&>svg]:size-5 [&>svg]:shrink-0"
    activeProps={{
      className: "border-border bg-subtle text-foreground",
    }}
  >
    <Icon />
    <span className="truncate">{label}</span>
  </Link>
);

const widths = ["w-3/4", "w-2/3", "w-5/6"];

const NavSkeleton = () => (
  <div className="flex flex-col gap-1" role="status" aria-label="Loading menu">
    {widths.map((width) => (
      <div key={width} className="flex items-center gap-3 px-3 py-2">
        <Skeleton className="size-5 shrink-0" />
        <Skeleton className={`h-5 ${width}`} />
      </div>
    ))}
  </div>
);

const NavError = ({ onRetry }: { onRetry: () => void }) => (
  <div className="flex flex-col items-start gap-2 px-3 text-sm text-muted-foreground">
    <p>The menu could not be loaded.</p>
    <Button size="sm" variant="outline" onClick={onRetry}>
      Try again
    </Button>
  </div>
);

const Nav = ({
  sections,
  onNavigate,
  onRetry,
}: {
  sections: Section[];
  onNavigate: () => void;
  onRetry: () => void;
}) => (
  <nav className="flex flex-col gap-5 p-3">
    {sections.map(({ title, entries, status }) => {
      if (!status && entries.length === 0) return null;

      return (
        <div key={title ?? "main"} className="flex flex-col gap-1">
          {title && (
            <p className="px-3 pb-1 text-sm text-muted-foreground">{title}</p>
          )}
          {status === "pending" && <NavSkeleton />}
          {status === "error" && <NavError onRetry={onRetry} />}
          {entries.map((entry) => (
            <NavItem key={entry.to} {...entry} onNavigate={onNavigate} />
          ))}
        </div>
      );
    })}
  </nav>
);

export const Shell = ({ user }: { user: Row }) => {
  const [open, setOpen] = useState(false);
  const schema = useQuery(schemaQuery(client));
  const { models, vars } = schemaNavs(schema.data ?? { models: [], vars: [] });
  const status = schema.isPending
    ? "pending"
    : schema.isError
      ? "error"
      : undefined;
  const sections: Section[] = [
    { title: null, entries: navs.main },
    { title: "Content", entries: models, status },
    // One failure message is enough, so Settings stays hidden until the schema is back.
    {
      title: "Settings",
      entries: vars,
      status: status === "error" ? undefined : status,
    },
    { title: "Plugins", entries: navs.plugins },
  ];
  const title = useTitle(sections);

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={`fixed inset-y-0 left-0 z-20 w-64 flex-col border-r border-border bg-surface md:sticky md:top-0 md:flex md:h-screen md:shrink-0 ${open ? "flex" : "hidden"}`}
      >
        <div className="flex h-14 shrink-0 items-center border-b border-border px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="grid size-6 place-items-center rounded-control bg-primary font-mono text-sm text-primary-foreground">
              n
            </span>
            njin
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto">
          <Nav
            sections={sections}
            onNavigate={() => setOpen(false)}
            onRetry={() => schema.refetch()}
          />
        </div>

        <div className="shrink-0 border-t border-border p-3">
          <UserMenu user={user} />
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-border bg-background px-4 md:px-8">
          <button
            type="button"
            aria-label="Toggle menu"
            className="-ml-1 rounded-control p-1.5 text-muted-foreground hover:bg-subtle md:hidden"
            onClick={() => setOpen(!open)}
          >
            {open ? <PiX className="size-5" /> : <PiList className="size-5" />}
          </button>
          <h1 className="text-lg font-semibold">{title}</h1>
        </header>
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
