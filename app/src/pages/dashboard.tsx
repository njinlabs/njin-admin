import { useSession, visible } from "@njinlabs/njin-admin/sdk";
import { Component, type ReactNode, Suspense } from "react";
import { widgets } from "../lib/registry";

// A widget is somebody else's code, so one that breaks is a message in its own tile, not a
// dashboard that no longer opens.
class Contained extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    return this.state.failed ? (
      <p className="text-sm text-muted-foreground">
        This widget failed to load.
      </p>
    ) : (
      this.props.children
    );
  }
}

// Columns the widget takes in the grid, which follows the width of the dashboard itself.
const spans = {
  sm: "",
  md: "@2xl:col-span-2",
  lg: "@2xl:col-span-2 @4xl:col-span-3",
  full: "col-span-full",
};

export const DashboardPage = () => {
  const { permissions } = useSession();
  const shown = visible(widgets.plugins, permissions);

  if (shown.length === 0) {
    return (
      <div className="rounded-control border border-border bg-surface p-4 text-muted-foreground">
        Nothing here yet.
      </div>
    );
  }

  return (
    <div className="@container">
      <div className="grid grid-cols-1 items-start gap-5 @2xl:grid-cols-2 @4xl:grid-cols-3">
        {shown.map(({ id, title, size = "sm", component: Content }) => (
          <section
            key={id}
            className={`min-w-0 space-y-3 rounded-control border border-border bg-surface p-4 ${spans[size]}`}
          >
            {title && <h2 className="font-semibold">{title}</h2>}
            <Contained>
              <Suspense fallback={null}>
                <Content />
              </Suspense>
            </Contained>
          </section>
        ))}
      </div>
    </div>
  );
};
