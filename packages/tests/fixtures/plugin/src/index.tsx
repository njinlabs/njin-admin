import { defineAdminPlugin } from "@njinlabs/njin-admin/sdk";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { PiChartBar } from "react-icons/pi";
import "./index.css";

// A plugin written the way a site would write one. It uses a hook and the router's Link on
// purpose: both only work if the plugin shares the admin's React and router.
const Reports = () => {
  const [count, setCount] = useState(0);

  return (
    <div className="space-y-3 p-4">
      <h1 className="text-xl font-semibold text-foreground">Reports</h1>
      <button
        type="button"
        className="rounded-control bg-primary px-3 py-1.5 text-primary-foreground"
        onClick={() => setCount(count + 1)}
      >
        Clicked {count}
      </button>
      <Link to="/">Back to dashboard</Link>
    </div>
  );
};

export default defineAdminPlugin({
  navs: [{ icon: () => <PiChartBar />, label: "Reports", to: "/reports" }],
  routes: [{ path: "/reports", component: Reports }],
});
