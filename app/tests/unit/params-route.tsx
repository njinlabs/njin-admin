import { useParams } from "@tanstack/react-router";

// A page written the way a plugin writes one: reads its params with the router's hook.
const Report = () => {
  const { id } = useParams({ strict: false });

  return <p>report {id}</p>;
};

export const Route = { path: "/reports/$id", component: Report };
