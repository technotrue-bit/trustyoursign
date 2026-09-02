import { createFileRoute } from "@tanstack/react-router";
import { VaultApp } from "@/components/overlay/VaultApp";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <VaultApp />;
}
