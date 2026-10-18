import { createFileRoute } from "@tanstack/react-router";
import { VaultApp } from "@/components/overlay/VaultApp";
import { parseSkyPlaceSearch, type SkyPlaceSearch } from "@/lib/ui/skyPlace";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => pageHead("/"),
  validateSearch: (search: Record<string, unknown>): SkyPlaceSearch =>
    parseSkyPlaceSearch(search),
  component: Home,
});

function Home() {
  const search = Route.useSearch();
  return <VaultApp meshParam={search.mesh} placeSearch={search} />;
}
