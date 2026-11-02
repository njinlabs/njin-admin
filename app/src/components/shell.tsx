import type { NavEntry } from "@njinlabs/njin-admin/sdk";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { PiList, PiX } from "react-icons/pi";
import { navs } from "../lib/registry";

const sections = [
  { title: null, entries: () => navs.main },
  { title: "Content", entries: () => navs.models },
  { title: "Settings", entries: () => navs.vars },
  { title: "Plugins", entries: () => navs.plugins },
];

// The title of the page is the label of the menu entry that owns the path; the longest match
// wins so "/reports/42" still reads "Reports".
const useTitle = () => {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const path = pathname.replace(/^\/_admin/, "") || "/";

  return sections
    .flatMap(({ entries }) => entries())
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

const Nav = ({ onNavigate }: { onNavigate: () => void }) => (
  <nav className="flex flex-col gap-5 p-3">
    {sections.map(({ title, entries }) => {
      const items = entries();
      if (items.length === 0) return null;

      return (
        <div key={title ?? "main"} className="flex flex-col gap-1">
          {title && (
            <p className="px-3 pb-1 text-sm text-muted-foreground">{title}</p>
          )}
          {items.map((entry) => (
            <NavItem key={entry.to} {...entry} onNavigate={onNavigate} />
          ))}
        </div>
      );
    })}
  </nav>
);

export const Shell = () => {
  const [open, setOpen] = useState(false);
  const title = useTitle();

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
          <Nav onNavigate={() => setOpen(false)} />
        </div>

        <div className="flex shrink-0 items-center gap-2 border-t border-border p-3">
          <div className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-subtle font-mono text-sm">
            A
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate font-medium">Admin</p>
            <p className="truncate text-sm text-muted-foreground">
              admin@njin.dev
            </p>
          </div>
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
