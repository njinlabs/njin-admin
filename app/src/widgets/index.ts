import type { RegisteredWidget } from "../lib/registry";
import {
  CountriesWidget,
  PageviewsWidget,
  ReferrersWidget,
  TopPagesWidget,
  TrafficWidget,
  VisitorsWidget,
} from "./analytics";
import {
  NeedsPublishingWidget,
  QuickActionsWidget,
  RecentContentWidget,
} from "./content";

const analytics = { resource: "analytics", action: "read" };

// The admin's own tiles. Same shape as a plugin's; nobody sees one until they add it.
export const mainWidgets: RegisteredWidget[] = [
  {
    key: "admin:pageviews",
    id: "pageviews",
    title: "Total pageviews",
    size: "md",
    requires: analytics,
    component: PageviewsWidget,
  },
  {
    key: "admin:visitors",
    id: "visitors",
    title: "Unique visitors",
    size: "md",
    requires: analytics,
    component: VisitorsWidget,
  },
  {
    key: "admin:traffic",
    id: "traffic",
    title: "Traffic",
    size: "full",
    requires: analytics,
    component: TrafficWidget,
  },
  {
    key: "admin:top-pages",
    id: "top-pages",
    title: "By page",
    size: "sm",
    requires: analytics,
    component: TopPagesWidget,
  },
  {
    key: "admin:referrers",
    id: "referrers",
    title: "By referrer",
    size: "sm",
    requires: analytics,
    component: ReferrersWidget,
  },
  {
    key: "admin:countries",
    id: "countries",
    title: "By country",
    size: "sm",
    requires: analytics,
    component: CountriesWidget,
  },
  {
    key: "admin:recent",
    id: "recent",
    title: "Recent content",
    size: "md",
    component: RecentContentWidget,
  },
  {
    key: "admin:to-publish",
    id: "to-publish",
    title: "Waiting to be published",
    size: "md",
    component: NeedsPublishingWidget,
  },
  {
    key: "admin:quick-actions",
    id: "quick-actions",
    title: "Quick actions",
    size: "sm",
    component: QuickActionsWidget,
  },
];
