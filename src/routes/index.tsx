import { createFileRoute } from "@tanstack/react-router";
import { VaultApp } from "@/components/overlay/VaultApp";
import { parseSkyPlaceSearch, type SkyPlaceSearch } from "@/lib/ui/skyPlace";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): SkyPlaceSearch =>
    parseSkyPlaceSearch(search),
  component: Home,
});

function Home() {
  const search = Route.useSearch();
  return <VaultApp meshParam={search.mesh} placeSearch={search} />;
}
