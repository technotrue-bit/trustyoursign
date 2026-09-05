import { createFileRoute } from "@tanstack/react-router";
import { VaultApp } from "@/components/overlay/VaultApp";

type HomeSearch = {
  mesh?: string;
  desk?: string;
};

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): HomeSearch => ({
    mesh: typeof search.mesh === "string" ? search.mesh : undefined,
    desk: typeof search.desk === "string" ? search.desk : undefined,
  }),
  component: Home,
});

function Home() {
  const { mesh } = Route.useSearch();
  return <VaultApp meshParam={mesh} />;
}
